'use client';

import { useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import clsx from 'clsx';
import { Copy } from 'lucide-react';

import { Message } from '@/types/chat';

interface ChatMessageProps {
  message: Message;
}

const InlineCode = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-sm text-slate-900 dark:bg-slate-800/70 dark:text-slate-100">
    {children}
  </code>
);

const BlockCode = ({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') ?? 'texto';
  const content = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error al copiar', error);
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700/60 dark:bg-slate-900">
      <div className="flex items-center justify-between bg-slate-200 px-4 py-2 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
        <span>{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md bg-slate-300 px-2 py-1 font-medium text-slate-800 hover:bg-slate-400 dark:bg-slate-700/80 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          <Copy className="h-3 w-3" /> {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="overflow-x-auto bg-slate-50 p-4 text-sm text-slate-900 dark:bg-slate-950/80 dark:text-slate-100">
        <code>{content}</code>
      </pre>
    </div>
  );
};

const markdownComponents: Components = {
  code({ inline, className, children }: any) {
    if (inline) {
      return <InlineCode>{children}</InlineCode>;
    }
    return <BlockCode className={className}>{children}</BlockCode>;
  }
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  return (
    <div
      className={clsx('flex w-full', {
        'justify-end': isUser,
        'justify-start': !isUser
      })}
    >
      <div
        className={clsx(
          'max-w-3xl rounded-2xl border p-4 text-sm shadow-sm transition',
          isUser
            ? 'border-indigo-200 bg-indigo-600 text-white dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-slate-100'
            : 'border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100'
        )}
        aria-live="polite"
      >
        <ReactMarkdown
          className="markdown-body"
          remarkPlugins={[remarkGfm as unknown as any]}
          rehypePlugins={[rehypeHighlight as unknown as any]}
          components={markdownComponents}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
