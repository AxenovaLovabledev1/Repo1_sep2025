'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu, XCircle } from 'lucide-react';
import clsx from 'clsx';

import { useChat } from '@/hooks/useChat';
import { Sidebar } from './Sidebar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingDots } from './TypingDots';
import { ThemeToggle } from './ThemeToggle';

export function ChatLayout() {
  const {
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
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  useEffect(() => {
    if (!bottomRef.current) {
      return;
    }
    bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAssistantTyping]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stopStreaming();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stopStreaming]);

  const handleRename = useCallback(
    (conversationId: string) => {
      const conversation = conversations.find((item) => item.id === conversationId);
      if (!conversation) {
        return;
      }
      const result = window.prompt('Nuevo título', conversation.title);
      if (typeof result === 'string' && result.trim()) {
        renameConversation(conversationId, result.trim());
      }
    },
    [conversations, renameConversation]
  );

  const handleDuplicate = useCallback(
    (conversationId: string) => {
      duplicateConversation(conversationId);
      setIsSidebarOpen(false);
    },
    [duplicateConversation]
  );

  const handleDelete = useCallback(
    (conversationId: string) => {
      const conversation = conversations.find((item) => item.id === conversationId);
      if (!conversation) {
        return;
      }
      if (window.confirm(`¿Eliminar "${conversation.title}"?`)) {
        deleteConversation(conversationId);
      }
    },
    [conversations, deleteConversation]
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  return (
    <div className="flex h-full min-h-screen flex-col bg-surface-light text-slate-900 dark:bg-surface-dark dark:text-slate-100">
      <div className="flex h-full flex-1 overflow-hidden">
        <div
          className={clsx(
            'fixed inset-y-0 left-0 z-40 w-72 transform transition-transform md:static md:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          )}
        >
          <Sidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onNewChat={() => {
              createNewConversation();
              closeSidebar();
            }}
            onSelectConversation={(id) => {
              selectConversation(id);
              closeSidebar();
            }}
            onRenameConversation={handleRename}
            onDuplicateConversation={handleDuplicate}
            onDeleteConversation={handleDelete}
          />
        </div>
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            role="presentation"
            onClick={closeSidebar}
          />
        )}
        <main className="relative flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-gradient-to-r dark:from-slate-900/80 dark:via-slate-900/40 dark:to-slate-900/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 md:hidden"
                onClick={toggleSidebar}
                aria-label={isSidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">
                  {activeConversation?.title ?? 'Nuevo chat'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeConversation ? 'Continuá la conversación o crea una nueva.' : 'Comenzá escribiendo tu primera pregunta.'}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </header>
          <section
            className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-slate-100 to-white px-4 py-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
            aria-live="polite"
          >
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
              {!hasMessages && !isStreaming && (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <p className="text-lg font-semibold">¡Hola! 👋</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Empezá escribiendo tu mensaje. Podés adjuntar archivos .txt o .md arrastrándolos al cuadro de entrada.
                  </p>
                </div>
              )}
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isAssistantTyping && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <TypingDots />
                  El asistente está escribiendo…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </section>
          <footer className="border-t border-slate-200 bg-white/80 px-4 py-4 dark:border-white/10 dark:bg-slate-900/70">
            <div className="mx-auto w-full max-w-4xl">
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={send}
                onStop={stopStreaming}
                onRetry={retryLast}
                placeholder={placeholder}
                isStreaming={isStreaming}
                attachments={attachments}
                onAddAttachments={addAttachments}
                onRemoveAttachment={removeAttachment}
              />
            </div>
          </footer>
        </main>
      </div>
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center space-x-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={clsx(
              'pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-2 text-sm shadow-lg backdrop-blur',
              toast.variant === 'error'
                ? 'border border-red-300 bg-red-100 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100'
                : 'border border-slate-200 bg-white/90 text-slate-700 dark:border-slate-500/30 dark:bg-slate-800/40 dark:text-slate-100'
            )}
          >
            {toast.variant === 'error' && <XCircle className="h-4 w-4" />}
            <span>{toast.message}</span>
            <button
              type="button"
              className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-800 dark:bg-white/10 dark:text-white"
              onClick={() => dismissToast(toast.id)}
            >
              Cerrar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
