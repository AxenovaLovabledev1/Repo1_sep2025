'use client';

import { Plus, Settings, Info } from 'lucide-react';

import { Conversation } from '@/types/chat';
import { ChatList } from './ChatList';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string) => void;
  onDuplicateConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onRenameConversation,
  onDuplicateConversation,
  onDeleteConversation
}: SidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-white/10 bg-white/80 p-4 text-slate-900 backdrop-blur dark:border-white/5 dark:bg-slate-900/60 dark:text-slate-100 md:w-72 lg:w-80">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Conversaciones</h2>
        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
          aria-label="Nuevo chat"
        >
          <Plus className="h-4 w-4" /> Nuevo chat
        </button>
      </div>
      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        <ChatList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelect={onSelectConversation}
          onRename={onRenameConversation}
          onDuplicate={onDuplicateConversation}
          onDelete={onDeleteConversation}
        />
      </div>
      <footer className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <a
          href="#settings"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:hover:bg-white/10"
        >
          <Settings className="h-4 w-4" /> Settings
        </a>
        <a
          href="#about"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:hover:bg-white/10"
        >
          <Info className="h-4 w-4" /> About
        </a>
      </footer>
    </aside>
  );
}
