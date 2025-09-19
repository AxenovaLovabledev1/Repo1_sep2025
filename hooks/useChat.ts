'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { sendMessage, streamAssistant } from '@/lib/chatClient';
import { deriveTitle, useLocalConversations } from './useLocalConversations';
import { useTypewriter } from './useTypewriter';
import { Conversation, Message, TextAttachment } from '@/types/chat';

interface Toast {
  id: string;
  message: string;
  variant: 'error' | 'info';
}

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
};

const MAX_ATTACHMENT_SIZE = 200 * 1024; // 200KB

const isSseEnabled = Boolean(process.env.NEXT_PUBLIC_AGENT_SSE_URL);

const composeMessageContent = (input: string, attachments: TextAttachment[]): string => {
  if (!attachments.length) {
    return input;
  }

  const attachmentText = attachments
    .map((attachment) => `\n\n[Adjunto: ${attachment.name}]\n${attachment.content}`)
    .join('');

  return `${input}${attachmentText}`;
};

const isTextFile = (file: File): boolean => {
  if (file.type.startsWith('text/')) {
    return true;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension === 'txt' || extension === 'md' || extension === 'markdown';
};

interface TypewriterState {
  messageId: string;
  text: string;
  speed: number;
}

interface UseChatResult {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  send: () => Promise<void>;
  isStreaming: boolean;
  isAssistantTyping: boolean;
  stopStreaming: () => void;
  retryLast: () => Promise<void>;
  createNewConversation: () => void;
  selectConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, title: string) => void;
  duplicateConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  attachments: TextAttachment[];
  addAttachments: (files: FileList | File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  placeholder: string;
  toasts: Toast[];
  dismissToast: (id: string) => void;
}

export function useChat(): UseChatResult {
  const {
    conversations,
    activeConversation,
    activeConversationId,
    createConversation,
    setActiveConversation,
    addMessage,
    updateMessage,
    removeMessage,
    renameConversation: renameStoredConversation,
    duplicateConversation: duplicateStoredConversation,
    deleteConversation: deleteStoredConversation
  } = useLocalConversations();

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<TextAttachment[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [typewriterState, setTypewriterState] = useState<TypewriterState | null>(null);

  const streamRef = useRef<{ cancel: () => void } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<{ conversationId: string; messages: Message[] } | null>(null);

  const typewriter = useTypewriter(
    typewriterState?.text ?? '',
    typewriterState?.speed ?? 45,
    Boolean(typewriterState)
  );

  const messages = useMemo(() => {
    const base = activeConversation?.messages ?? [];
    if (!typewriterState) {
      return base;
    }

    return base.map((message) =>
      message.id === typewriterState.messageId ? { ...message, content: typewriter.display } : message
    );
  }, [activeConversation?.messages, typewriter.display, typewriterState]);

  useEffect(() => {
    if (typewriterState && typewriter.isFinished) {
      setTypewriterState(null);
      setIsStreaming(false);
      setIsAssistantTyping(false);
    }
  }, [typewriter.isFinished, typewriterState]);

  const pushToast = useCallback((message: string, variant: 'error' | 'info' = 'info') => {
    const id = createId();
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const resetStreamingState = useCallback(() => {
    streamRef.current?.cancel();
    streamRef.current = null;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
    setIsAssistantTyping(false);
    if (typewriterState) {
      typewriter.cancel();
      setTypewriterState(null);
    }
  }, [typewriter, typewriterState]);

  const stopStreaming = useCallback(() => {
    resetStreamingState();
  }, [resetStreamingState]);

  const addAttachments = useCallback(
    async (files: FileList | File[]) => {
      const entries = Array.from(files);
      if (!entries.length) {
        return;
      }

      const newAttachments: TextAttachment[] = [];
      for (const file of entries) {
        if (!isTextFile(file)) {
          pushToast(`El archivo ${file.name} no es de texto (.txt/.md).`, 'error');
          continue;
        }

        if (file.size > MAX_ATTACHMENT_SIZE) {
          pushToast(`El archivo ${file.name} supera los ${(MAX_ATTACHMENT_SIZE / 1024).toFixed(0)}KB.`, 'error');
          continue;
        }

        try {
          const content = await file.text();
          newAttachments.push({
            id: createId(),
            name: file.name,
            content,
            size: file.size
          });
        } catch (error) {
          pushToast(`No se pudo leer ${file.name}.`, 'error');
        }
      }

      if (newAttachments.length) {
        setAttachments((prev) => [...prev, ...newAttachments]);
      }
    },
    [pushToast]
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  }, []);

  const createNewConversation = useCallback(() => {
    resetStreamingState();
    const conversation = createConversation();
    setActiveConversation(conversation.id);
    setInput('');
    setAttachments([]);
    setTypewriterState(null);
  }, [createConversation, resetStreamingState, setActiveConversation]);

  const selectConversation = useCallback(
    (conversationId: string) => {
      resetStreamingState();
      setActiveConversation(conversationId);
      setInput('');
      setAttachments([]);
      setTypewriterState(null);
    },
    [resetStreamingState, setActiveConversation]
  );

  const renameConversation = useCallback(
    (conversationId: string, title: string) => {
      renameStoredConversation(conversationId, title);
    },
    [renameStoredConversation]
  );

  const duplicateConversation = useCallback(
    (conversationId: string) => {
      duplicateStoredConversation(conversationId);
    },
    [duplicateStoredConversation]
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      deleteStoredConversation(conversationId);
    },
    [deleteStoredConversation]
  );

  const finishStreaming = useCallback(() => {
    streamRef.current = null;
    abortControllerRef.current = null;
    setIsStreaming(false);
    setIsAssistantTyping(false);
  }, []);

  const requestAssistant = useCallback(
    async (conversationId: string, baseMessages: Message[]): Promise<void> => {
      const assistantMessage: Message = {
        id: createId(),
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString()
      };

      addMessage(conversationId, assistantMessage);
      setIsStreaming(true);
      setIsAssistantTyping(true);
      setTypewriterState(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      lastRequestRef.current = { conversationId, messages: baseMessages };

      let receivedTokens = false;

      if (isSseEnabled) {
        try {
          const session = await streamAssistant({
            request: { conversationId, messages: baseMessages },
            signal: controller.signal,
            onToken: (token) => {
              receivedTokens = true;
              updateMessage(conversationId, assistantMessage.id, (message) => ({
                content: `${message.content}${token}`
              }));
            },
            onDone: () => {
              finishStreaming();
            },
            onError: (error) => {
              if (!receivedTokens) {
                removeMessage(conversationId, assistantMessage.id);
              }
              pushToast(error.message, 'error');
              finishStreaming();
            }
          });
          streamRef.current = session;
          return;
        } catch (error) {
          streamRef.current = null;
          if (error instanceof Error) {
            pushToast(error.message, 'error');
          }
        }
      }

      try {
        const { reply } = await sendMessage({ conversationId, messages: baseMessages }, { signal: controller.signal });
        const normalizedReply = reply.trim();
        if (!normalizedReply) {
          throw new Error('La respuesta del asistente está vacía.');
        }

        updateMessage(conversationId, assistantMessage.id, () => ({ content: reply }));
        setTypewriterState({ messageId: assistantMessage.id, text: reply, speed: 45 });
        setIsAssistantTyping(true);
      } catch (error) {
        removeMessage(conversationId, assistantMessage.id);
        finishStreaming();
        if (error instanceof Error && error.name === 'AbortError') {
          pushToast('La solicitud se canceló.', 'info');
        } else if (error instanceof Error) {
          pushToast(error.message, 'error');
        } else {
          pushToast('Ocurrió un error al solicitar la respuesta.', 'error');
        }
      } finally {
        abortControllerRef.current = null;
      }
    },
    [addMessage, finishStreaming, pushToast, removeMessage, updateMessage]
  );

  const send = useCallback(async () => {
    if (isStreaming) {
      return;
    }

    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) {
      return;
    }

    let conversationId = activeConversationId;
    const now = new Date().toISOString();
    const userContent = composeMessageContent(input, attachments);
    const userMessage: Message = {
      id: createId(),
      role: 'user',
      content: userContent,
      createdAt: now
    };

    let baseMessages: Message[];
    if (!conversationId) {
      const conversation = createConversation(userMessage);
      conversationId = conversation.id;
      baseMessages = conversation.messages;
    } else {
      const history = activeConversation?.messages ?? [];
      baseMessages = [...history, userMessage];
      addMessage(conversationId, userMessage);
      if (!history.length) {
        renameStoredConversation(conversationId, deriveTitle(userMessage.content));
      }
    }

    setInput('');
    setAttachments([]);

    if (!conversationId) {
      return;
    }

    await requestAssistant(conversationId, baseMessages);
  }, [
    activeConversation?.messages,
    activeConversationId,
    addMessage,
    attachments,
    createConversation,
    deriveTitle,
    input,
    isStreaming,
    renameStoredConversation,
    requestAssistant
  ]);

  const retryLast = useCallback(async () => {
    if (isStreaming) {
      return;
    }

    const payload = lastRequestRef.current;
    if (!payload) {
      return;
    }

    const { conversationId, messages: baseMessages } = payload;
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      return;
    }

    const lastAssistant = [...conversation.messages].reverse().find((message) => message.role === 'assistant');
    if (lastAssistant) {
      removeMessage(conversationId, lastAssistant.id);
    }

    await requestAssistant(conversationId, baseMessages);
  }, [conversations, isStreaming, removeMessage, requestAssistant]);

  const placeholder = 'Escribí tu mensaje…';

  return {
    conversations,
    activeConversation,
    activeConversationId,
    messages,
    input,
    setInput,
    send,
    isStreaming,
    isAssistantTyping,
    stopStreaming,
    retryLast,
    createNewConversation,
    selectConversation,
    renameConversation,
    duplicateConversation,
    deleteConversation,
    attachments,
    addAttachments,
    removeAttachment,
    placeholder,
    toasts,
    dismissToast
  };
}
