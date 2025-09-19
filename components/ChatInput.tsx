'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, Send, StopCircle, RotateCw, X } from 'lucide-react';
import clsx from 'clsx';

import { TextAttachment } from '@/types/chat';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => Promise<void> | void;
  onStop: () => void;
  onRetry: () => Promise<void> | void;
  placeholder: string;
  isStreaming: boolean;
  attachments: TextAttachment[];
  onAddAttachments: (files: FileList | File[]) => Promise<void>;
  onRemoveAttachment: (id: string) => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  onRetry,
  placeholder,
  isStreaming,
  attachments,
  onAddAttachments,
  onRemoveAttachment
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight, value]);

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      await onSend();
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer?.files?.length) {
      await onAddAttachments(event.dataTransfer.files);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      await onAddAttachments(event.target.files);
      event.target.value = '';
    }
  };

  return (
    <div
      className={clsx(
        'rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur transition dark:border-white/10 dark:bg-white/10 dark:text-slate-100',
        {
          'ring-2 ring-indigo-500': isDragging
        }
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <span
            key={attachment.id}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200"
          >
            <Paperclip className="h-3 w-3" /> {attachment.name}
            <button
              type="button"
              onClick={() => onRemoveAttachment(attachment.id)}
              className="rounded-full p-1 hover:bg-indigo-200 dark:hover:bg-indigo-500/30"
              aria-label={`Eliminar adjunto ${attachment.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-end gap-3">
        <button
          type="button"
          onClick={openFileDialog}
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
          aria-label="Adjuntar archivo de texto"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="min-h-[56px] flex-1 resize-none rounded-2xl bg-transparent px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
          aria-label="Caja de mensaje"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          onChange={handleFileInput}
          className="hidden"
          multiple
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-100 px-4 text-sm font-medium text-red-700 transition hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 dark:border-red-500/60 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
          >
            <StopCircle className="h-5 w-5" /> Detener
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-indigo-500/60 dark:bg-indigo-500/20 dark:text-indigo-100 dark:hover:bg-indigo-500/30"
            aria-label="Enviar mensaje"
          >
            <Send className="h-5 w-5" /> Enviar
          </button>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <p className="text-slate-500 dark:text-slate-400">Enter agrega nueva línea · Ctrl/⌘+Enter envía</p>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
          {!isStreaming && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:hover:bg-white/10"
            >
              <RotateCw className="h-3 w-3" /> Reintentar
            </button>
          )}
          {isStreaming && (
            <span className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-200">
              <Loader2 className="h-3 w-3 animate-spin" /> El asistente está respondiendo…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
