'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Conversation, Message } from '@/types/chat';
import { isBrowser, loadFromStorage, saveToStorage } from '@/lib/storage';

const STORAGE_KEY = 'chat.conversations';
const ACTIVE_KEY = 'chat.activeConversationId';
const DEFAULT_TITLE = 'Nuevo chat';

const sortByUpdated = (conversations: Conversation[]): Conversation[] =>
  [...conversations].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
};

const deriveTitle = (content: string): string => {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return DEFAULT_TITLE;
  }

  return normalized.slice(0, 60);
};

export interface UseLocalConversations {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  createConversation: (initialMessage?: Message) => Conversation;
  setActiveConversation: (conversationId: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updater: (message: Message) => Partial<Message>
  ) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  renameConversation: (conversationId: string, title: string) => void;
  duplicateConversation: (conversationId: string) => Conversation | null;
  deleteConversation: (conversationId: string) => void;
}

export function useLocalConversations(): UseLocalConversations {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    const stored = loadFromStorage<Conversation[]>(STORAGE_KEY, []);
    const storedActive = window.localStorage.getItem(ACTIVE_KEY);
    setConversations(sortByUpdated(stored));
    setActiveConversationId(storedActive || (stored[0]?.id ?? null));
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isBrowser || !isInitialized) {
      return;
    }

    saveToStorage(STORAGE_KEY, conversations);
  }, [conversations, isInitialized]);

  useEffect(() => {
    if (!isBrowser || !isInitialized) {
      return;
    }

    if (activeConversationId) {
      window.localStorage.setItem(ACTIVE_KEY, activeConversationId);
    } else {
      window.localStorage.removeItem(ACTIVE_KEY);
    }
  }, [activeConversationId, isInitialized]);

  const activeConversation = useMemo(() => {
    return conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  }, [activeConversationId, conversations]);

  const upsertConversation = useCallback(
    (conversationId: string, updater: (conversation: Conversation) => Conversation | null) => {
      setConversations((prev) => {
        let exists = false;
        const next = prev
          .map((conversation) => {
            if (conversation.id !== conversationId) {
              return conversation;
            }

            exists = true;
            const draft: Conversation = {
              ...conversation,
              messages: [...conversation.messages]
            };
            const updated = updater(draft);
            return updated ?? conversation;
          })
          .filter(Boolean) as Conversation[];

        if (!exists) {
          return prev;
        }

        return sortByUpdated(next);
      });
    },
    []
  );

  const createConversation = useCallback(
    (initialMessage?: Message): Conversation => {
      const now = new Date().toISOString();
      const id = generateId();
      const messages = initialMessage ? [{ ...initialMessage }] : [];
      const conversation: Conversation = {
        id,
        title: initialMessage ? deriveTitle(initialMessage.content) : DEFAULT_TITLE,
        createdAt: now,
        updatedAt: now,
        messages
      };

      setConversations((prev) => sortByUpdated([conversation, ...prev]));
      setActiveConversationId(id);
      return conversation;
    },
    []
  );

  const setActiveConversation = useCallback((conversationId: string | null) => {
    setActiveConversationId(conversationId);
  }, []);

  const addMessage = useCallback(
    (conversationId: string, message: Message) => {
      upsertConversation(conversationId, (conversation) => {
        const messages = [...conversation.messages, message];
        return {
          ...conversation,
          messages,
          updatedAt: message.createdAt
        };
      });
    },
    [upsertConversation]
  );

  const updateMessage = useCallback(
    (conversationId: string, messageId: string, updater: (message: Message) => Partial<Message>) => {
      const now = new Date().toISOString();
      upsertConversation(conversationId, (conversation) => {
        const messages = conversation.messages.map((message) => {
          if (message.id !== messageId) {
            return message;
          }

          return {
            ...message,
            ...updater(message)
          };
        });

        return {
          ...conversation,
          messages,
          updatedAt: now
        };
      });
    },
    [upsertConversation]
  );

  const removeMessage = useCallback(
    (conversationId: string, messageId: string) => {
      const now = new Date().toISOString();
      upsertConversation(conversationId, (conversation) => {
        const messages = conversation.messages.filter((message) => message.id !== messageId);
        return {
          ...conversation,
          messages,
          updatedAt: now
        };
      });
    },
    [upsertConversation]
  );

  const renameConversation = useCallback(
    (conversationId: string, title: string) => {
      const now = new Date().toISOString();
      const normalized = title.trim() || DEFAULT_TITLE;
      upsertConversation(conversationId, (conversation) => ({
        ...conversation,
        title: normalized,
        updatedAt: now
      }));
    },
    [upsertConversation]
  );

  const duplicateConversation = useCallback(
    (conversationId: string): Conversation | null => {
      const source = conversations.find((conversation) => conversation.id === conversationId);
      if (!source) {
        return null;
      }

      const now = new Date().toISOString();
      const id = generateId();
      const messages = source.messages.map((message) => ({
        ...message,
        id: generateId()
      }));
      const duplicated: Conversation = {
        id,
        title: `${source.title} (copia)`,
        createdAt: now,
        updatedAt: now,
        messages
      };

      setConversations((prev) => sortByUpdated([duplicated, ...prev]));
      setActiveConversationId(id);
      return duplicated;
    },
    [conversations]
  );

  const deleteConversation = useCallback((conversationId: string) => {
    setConversations((prev) => {
      const next = prev.filter((conversation) => conversation.id !== conversationId);
      setActiveConversationId((current) => {
        if (current !== conversationId) {
          return current;
        }

        return next[0]?.id ?? null;
      });
      return next;
    });
  }, []);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    createConversation,
    setActiveConversation,
    addMessage,
    updateMessage,
    removeMessage,
    renameConversation,
    duplicateConversation,
    deleteConversation
  };
}

export { deriveTitle };
