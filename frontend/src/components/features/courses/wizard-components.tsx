'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Film,
  Headphones,
  Loader2,
  Paperclip,
  Presentation,
  Trash2,
  Upload,
} from 'lucide-react';
import type { UploadedResource } from '@/types';
import { cn } from '@/lib/utils';

const TOOLBAR_BUTTONS = [
  {
    icon: Bold,
    title: 'Bold',
    run: (e: Editor) => e.chain().focus().toggleBold().run(),
    isActive: (e: Editor) => e.isActive('bold'),
  },
  {
    icon: Italic,
    title: 'Italic',
    run: (e: Editor) => e.chain().focus().toggleItalic().run(),
    isActive: (e: Editor) => e.isActive('italic'),
  },
  {
    icon: UnderlineIcon,
    title: 'Underline',
    run: (e: Editor) => e.chain().focus().toggleUnderline().run(),
    isActive: (e: Editor) => e.isActive('underline'),
  },
  {
    icon: Strikethrough,
    title: 'Strikethrough',
    run: (e: Editor) => e.chain().focus().toggleStrike().run(),
    isActive: (e: Editor) => e.isActive('strike'),
  },
  {
    icon: Heading2,
    title: 'Heading 2',
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (e: Editor) => e.isActive('heading', { level: 2 }),
  },
  {
    icon: Heading3,
    title: 'Heading 3',
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (e: Editor) => e.isActive('heading', { level: 3 }),
  },
  {
    icon: List,
    title: 'Bullet List',
    run: (e: Editor) => e.chain().focus().toggleBulletList().run(),
    isActive: (e: Editor) => e.isActive('bulletList'),
  },
  {
    icon: ListOrdered,
    title: 'Ordered List',
    run: (e: Editor) => e.chain().focus().toggleOrderedList().run(),
    isActive: (e: Editor) => e.isActive('orderedList'),
  },
  {
    icon: Quote,
    title: 'Blockquote',
    run: (e: Editor) => e.chain().focus().toggleBlockquote().run(),
    isActive: (e: Editor) => e.isActive('blockquote'),
  },
];

export function RichEditor({
  value,
  onChange,
  placeholder = 'Enter content here…',
  minHeight = 140,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          'before:content-[attr(data-placeholder)] before:text-slate-400 before:float-left before:pointer-events-none',
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `rich-content prose prose-sm max-w-none px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none`,
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/70 p-1.5">
        {TOOLBAR_BUTTONS.map((btn) => {
          const Icon = btn.icon;
          const active = btn.isActive(editor);
          return (
            <button
              key={btn.title}
              type="button"
              onClick={() => btn.run(editor)}
              title={btn.title}
              className={cn(
                'rounded-md p-1.5 text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900',
                active && 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export function CompactRichEditor({
  value,
  onChange,
  placeholder = 'Enter question statement, prompt, or scenario…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          'before:content-[attr(data-placeholder)] before:text-slate-400 before:float-left before:pointer-events-none',
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'rich-content prose prose-sm max-w-none px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none min-h-[48px]',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50/70 px-2 py-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            'rounded p-1 text-slate-600 hover:bg-slate-200/70',
            editor.isActive('bold') && 'bg-indigo-100 text-indigo-700 font-bold',
          )}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            'rounded p-1 text-slate-600 hover:bg-slate-200/70',
            editor.isActive('italic') && 'bg-indigo-100 text-indigo-700',
          )}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            'rounded p-1 text-slate-600 hover:bg-slate-200/70',
            editor.isActive('underline') && 'bg-indigo-100 text-indigo-700',
          )}
          title="Underline"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>
        <span className="h-3 w-px bg-slate-200 mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            'rounded p-1 text-slate-600 hover:bg-slate-200/70',
            editor.isActive('bulletList') && 'bg-indigo-100 text-indigo-700',
          )}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            'rounded p-1 text-slate-600 hover:bg-slate-200/70',
            editor.isActive('orderedList') && 'bg-indigo-100 text-indigo-700',
          )}
          title="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={cn(
            'rounded p-1 text-slate-600 hover:bg-slate-200/70',
            editor.isActive('code') && 'bg-indigo-100 text-indigo-700',
          )}
          title="Code"
        >
          <Code className="h-3.5 w-3.5" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Returns all attached files for an item by combining resources, attachments,
 * and legacy resourceUrl/fileName into a uniform list.
 */
export function getItemAttachments(item: {
  resources?: UploadedResource[];
  attachments?: any[];
  resourceUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  contentType?: string | null;
}): UploadedResource[] {
  const map = new Map<string, UploadedResource>();

  const list = [...(item.resources || []), ...(item.attachments || [])];
  for (const raw of list as any[]) {
    if (!raw) continue;
    const url = raw.url || raw.fileUrl;
    if (url) {
      map.set(url, {
        id: raw.id,
        name: raw.name || raw.fileName || url.split('/').pop() || 'Attached File',
        url: url,
        size: raw.size ?? raw.sizeBytes ?? undefined,
        type: raw.type || raw.fileType || undefined,
      });
    }
  }

  // Only fallback to resourceUrl if not already a video/audio lecture stream
  if (
    item.resourceUrl &&
    !map.has(item.resourceUrl) &&
    item.contentType !== 'VIDEO' &&
    item.contentType !== 'AUDIO'
  ) {
    map.set(item.resourceUrl, {
      name: item.fileName || item.resourceUrl.split('/').pop() || 'Attached File',
      url: item.resourceUrl,
      size: item.fileSize || undefined,
    });
  }

  return Array.from(map.values());
}

/**
 * Determines appropriate icon and color based on file extension or URL.
 */
export function getFileBadge(file: UploadedResource) {
  const url = (file.url || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const ext = name.split('.').pop() || url.split('.').pop() || '';

  if (['pdf'].includes(ext)) {
    return {
      icon: FileText,
      bgColor: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeLabel: 'PDF',
    };
  }
  if (['doc', 'docx'].includes(ext)) {
    return {
      icon: FileText,
      bgColor: 'bg-blue-50 text-blue-700 border-blue-200',
      badgeLabel: 'Word',
    };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return {
      icon: FileSpreadsheet,
      bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeLabel: 'Spreadsheet',
    };
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return {
      icon: Presentation,
      bgColor: 'bg-orange-50 text-orange-700 border-orange-200',
      badgeLabel: 'Presentation',
    };
  }
  if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
    return {
      icon: Film,
      bgColor: 'bg-purple-50 text-purple-700 border-purple-200',
      badgeLabel: 'Video',
    };
  }
  if (['mp3', 'wav', 'm4a', 'aac'].includes(ext)) {
    return {
      icon: Headphones,
      bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeLabel: 'Audio',
    };
  }
  return {
    icon: Paperclip,
    bgColor: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeLabel: ext.toUpperCase() || 'File',
  };
}

export interface MultiFileUploaderProps {
  id: string;
  files?: UploadedResource[];
  legacyUrl?: string;
  legacyName?: string;
  legacySize?: number;
  accept?: string;
  uploading?: boolean;
  uploadError?: string | null;
  onUpload: (files: File[]) => void;
  onRemove: (fileIdOrUrl: string) => void;
  placeholderText?: string;
  descriptionText?: string;
  theme?: 'indigo' | 'emerald' | 'orange' | 'slate';
}

export function MultiFileUploader({
  id,
  files = [],
  legacyUrl,
  legacyName,
  legacySize,
  accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.rtf,.zip,.png,.jpg,.jpeg',
  uploading = false,
  uploadError = null,
  onUpload,
  onRemove,
  placeholderText = 'Upload file(s) or drag and drop',
  descriptionText = 'Supports multiple files (PDFs, docs, spreadsheets, slides, archives). Previously uploaded files are preserved.',
  theme = 'indigo',
}: MultiFileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const allFiles: UploadedResource[] = [...files];
  if (allFiles.length === 0 && legacyUrl) {
    allFiles.push({
      id: 'legacy',
      name: legacyName || legacyUrl.split('/').pop() || 'Attached File',
      url: legacyUrl,
      size: legacySize || 0,
    });
  }

  const themeClasses = {
    indigo: {
      activeBorder: 'border-indigo-500 bg-indigo-50/50',
      icon: 'text-indigo-500',
      badge: 'bg-indigo-50 text-indigo-700',
    },
    emerald: {
      activeBorder: 'border-emerald-500 bg-emerald-50/50',
      icon: 'text-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700',
    },
    orange: {
      activeBorder: 'border-orange-500 bg-orange-50/50',
      icon: 'text-orange-500',
      badge: 'bg-orange-50 text-orange-700',
    },
    slate: {
      activeBorder: 'border-slate-500 bg-slate-50/50',
      icon: 'text-slate-500',
      badge: 'bg-slate-100 text-slate-700',
    },
  }[theme];

  return (
    <div className="space-y-3">
      {allFiles.length > 0 ? (
        <div className="space-y-1.5">
          {allFiles.map((file, idx) => (
            <div
              key={file.id || file.url || idx}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-2.5 px-3.5 text-xs shadow-2xs hover:border-slate-300 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    themeClasses.badge,
                  )}
                >
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800" title={file.name}>
                    {file.name}
                  </p>
                  {file.size ? (
                    <p className="text-[11px] text-slate-400">{formatFileSize(file.size)}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  <ExternalLink className="h-3 w-3" /> View
                </a>
                <button
                  type="button"
                  onClick={() => onRemove(file.id || file.url)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                  title="Remove file"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onUpload(Array.from(e.dataTransfer.files));
          }
        }}
        className={cn(
          'relative rounded-xl border border-dashed p-3 text-center transition',
          isDragging
            ? themeClasses.activeBorder
            : 'border-slate-300 bg-slate-50/40 hover:border-slate-400 hover:bg-slate-50/80',
        )}
      >
        <input
          type="file"
          id={id}
          multiple
          accept={accept}
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUpload(Array.from(e.target.files));
              e.target.value = '';
            }
          }}
        />
        <label
          htmlFor={id}
          className="flex flex-col items-center justify-center gap-1 cursor-pointer select-none py-1"
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading file(s)...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition">
                <Upload className={cn('h-4 w-4', themeClasses.icon)} />
                <span>{placeholderText}</span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-md">{descriptionText}</p>
            </>
          )}
        </label>
      </div>

      {uploadError ? <p className="text-xs text-red-600 font-medium">{uploadError}</p> : null}
    </div>
  );
}

/**
 * Handles Enter key on plain textarea elements to auto-continue:
 * 1. Bullets (•, -, *, etc.)
 * 2. Numbers (1., 2., etc.)
 * 3. Clears prefix when Enter is pressed on an empty bullet line
 */
export function handleSmartListKeyDown(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  value: string,
  onChange: (val: string) => void,
) {
  if (e.key === 'Enter' && !e.shiftKey) {
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd } = textarea;
    const beforeCursor = value.substring(0, selectionStart);
    const afterCursor = value.substring(selectionEnd);
    const currentLine = beforeCursor.split('\n').pop() || '';

    // Check for bullet list: •, -, *, etc.
    const bulletMatch = currentLine.match(/^(\s*)([•\-\*])\s+/);
    // Check for numbered list: 1., 2., etc.
    const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s+/);

    if (bulletMatch) {
      e.preventDefault();
      const indent = bulletMatch[1];
      const bulletChar = bulletMatch[2];
      // If the current line is just the bullet itself (empty item), clear it
      if (currentLine.trim() === bulletChar) {
        const lineStart = selectionStart - currentLine.length;
        const newValue = value.substring(0, lineStart) + afterCursor;
        onChange(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = lineStart;
        });
        return;
      }
      const insert = `\n${indent}${bulletChar} `;
      const newValue = beforeCursor + insert + afterCursor;
      onChange(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + insert.length;
      });
      return;
    }

    if (numberMatch) {
      e.preventDefault();
      const indent = numberMatch[1];
      const currentNum = parseInt(numberMatch[2], 10);
      // If current line is just the number item (e.g. "2."), clear it
      if (currentLine.trim() === `${currentNum}.`) {
        const lineStart = selectionStart - currentLine.length;
        const newValue = value.substring(0, lineStart) + afterCursor;
        onChange(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = lineStart;
        });
        return;
      }
      const insert = `\n${indent}${currentNum + 1}. `;
      const newValue = beforeCursor + insert + afterCursor;
      onChange(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + insert.length;
      });
      return;
    }
  }
}

export function SmartTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  id,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertPrefix = (type: 'bullet' | 'number') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    const before = value.substring(0, selectionStart);
    const after = value.substring(selectionEnd);
    const selected = value.substring(selectionStart, selectionEnd);

    if (selected) {
      const lines = selected.split('\n');
      const formatted = lines
        .map((line, idx) => {
          const clean = line.replace(/^([•\-\*]|\d+\.)\s+/, '');
          return type === 'bullet' ? `• ${clean}` : `${idx + 1}. ${clean}`;
        })
        .join('\n');
      const nextVal = before + formatted + after;
      onChange(nextVal);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = selectionStart;
        textarea.selectionEnd = selectionStart + formatted.length;
      });
    } else {
      const lineStart = before.lastIndexOf('\n') + 1;
      const currentLine = before.substring(lineStart);
      const prefix = type === 'bullet' ? '• ' : '1. ';
      let nextVal: string;
      let newCursor: number;
      if (currentLine.startsWith('• ') || /^\d+\.\s+/.test(currentLine)) {
        // Toggle off
        const stripped = currentLine.replace(/^([•\-\*]|\d+\.)\s+/, '');
        nextVal = value.substring(0, lineStart) + stripped + after;
        newCursor = lineStart + stripped.length;
      } else {
        nextVal = value.substring(0, lineStart) + prefix + currentLine + after;
        newCursor = selectionStart + prefix.length;
      }
      onChange(nextVal);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = newCursor;
      });
    }
  };

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10">
      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50/80 border-b border-slate-100 text-xs text-slate-600">
        <span className="text-[11px] font-medium text-slate-400 mr-1">Quick list:</span>
        <button
          type="button"
          onClick={() => insertPrefix('bullet')}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-200 text-slate-700 font-medium transition text-[11px]"
          title="Add Bullet (•)"
        >
          <span>•</span> Bullet List
        </button>
        <button
          type="button"
          onClick={() => insertPrefix('number')}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-200 text-slate-700 font-medium transition text-[11px]"
          title="Add Numbered List (1.)"
        >
          <span>1.</span> Numbered List
        </button>
      </div>
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => handleSmartListKeyDown(e, value, onChange)}
        placeholder={placeholder}
        rows={rows}
        className={cn('w-full px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none resize-y', className)}
      />
    </div>
  );
}
