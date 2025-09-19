'use client';

import { Copy, Edit3, MessageSquare, Trash2 } from 'lucide-react';
import clsx from 'clsx';

import { Conversation } from '@/types/chat';

interface ChatListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
  onRename: (conversationId: string) => void;
  onDuplicate: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
}

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleString();
};

export function ChatList({
  conversations,
  activeConversationId,
  onSelect,
  onRename,
  onDuplicate,
  onDelete
}: ChatListProps) {
  if (!conversations.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white/70 p-4 text-sm text-slate-600 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
        No hay conversaciones guardadas todavía.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeConversationId;
        return (
          <li key={conversation.id}>
            <div
              className={clsx(
                'group relative flex flex-col rounded-lg border p-3 transition focus-within:ring-2 focus-within:ring-indigo-500',
                isActive
                  ? 'border-indigo-400/70 bg-indigo-500/10 text-indigo-900 dark:text-white'
                  : 'border-slate-200 bg-white/70 text-slate-900 hover:border-indigo-300 hover:bg-white dark:border-white/5 dark:bg-white/5 dark:text-slate-200 dark:hover:border-indigo-400/40 dark:hover:bg-white/10'
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(conversation.id)}
                className="flex w-full items-center gap-3 text-left focus:outline-none"
                aria-label={`Abrir conversación ${conversation.title}`}
              >
                <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{conversation.title}</p>
                  <p className="truncate text-xs opacity-60">{formatDate(conversation.updatedAt)}</p>
                </div>
              </button>
              <div className="mt-2 flex items-center gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onRename(conversation.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label={`Renombrar ${conversation.title}`}
                >
                  <Edit3 className="h-3 w-3" /> Renombrar
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicate(conversation.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label={`Duplicar ${conversation.title}`}
                >
                  <Copy className="h-3 w-3" /> Duplicar
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(conversation.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label={`Eliminar ${conversation.title}`}
                >
                  <Trash2 className="h-3 w-3" /> Borrar
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
