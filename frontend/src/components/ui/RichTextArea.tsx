'use client';

import { useEffect } from 'react';
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
  Undo,
  Redo,
  RemoveFormatting,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RichTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  rows?: number;
  id?: string;
  label?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function RichTextArea({
  value,
  onChange,
  placeholder = 'Enter interactive text…',
  minHeight,
  rows,
  id,
  label,
  error,
  required,
  className,
  disabled = false,
  compact = false,
}: RichTextAreaProps) {
  const calculatedMinHeight = minHeight ?? (rows ? Math.max(rows * 24, 72) : compact ? 80 : 120);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-5 my-1 space-y-0.5',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-5 my-1 space-y-0.5',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-2 border-indigo-400 pl-3 italic my-1 text-slate-600',
          },
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          'before:content-[attr(data-placeholder)] before:text-slate-400 before:float-left before:pointer-events-none',
      }),
    ],
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: cn(
          'rich-content prose prose-sm max-w-none px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none',
          disabled && 'bg-slate-50 text-slate-500 cursor-not-allowed',
        ),
        style: `min-height: ${calculatedMinHeight}px;`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      // If editor only contains an empty paragraph, send empty string for clean validation
      if (html === '<p></p>' || ed.isEmpty) {
        onChange('');
      } else {
        onChange(html);
      }
    },
    immediatelyRender: false,
  });

  // Keep external value in sync with TipTap
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const normalizedProp = value || '';
    if (currentHtml !== normalizedProp && (normalizedProp || !editor.isEmpty)) {
      editor.commands.setContent(normalizedProp);
    }
  }, [value, editor]);

  // Sync disabled state
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const toolbarButtons = [
    {
      icon: Bold,
      title: 'Bold (Ctrl+B)',
      run: (e: Editor) => e.chain().focus().toggleBold().run(),
      isActive: (e: Editor) => e.isActive('bold'),
    },
    {
      icon: Italic,
      title: 'Italic (Ctrl+I)',
      run: (e: Editor) => e.chain().focus().toggleItalic().run(),
      isActive: (e: Editor) => e.isActive('italic'),
    },
    {
      icon: UnderlineIcon,
      title: 'Underline (Ctrl+U)',
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
      title: 'Numbered List',
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

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-600">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-white transition shadow-xs',
          error
            ? 'border-red-300 ring-2 ring-red-500/10 focus-within:border-red-500'
            : 'border-slate-200/90 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10',
          disabled && 'opacity-75 bg-slate-50',
        )}
      >
        {/* Interactive Formatting Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/80 px-2 py-1 select-none">
          {toolbarButtons.map((btn) => {
            const Icon = btn.icon;
            const active = editor ? btn.isActive(editor) : false;
            return (
              <button
                key={btn.title}
                type="button"
                tabIndex={-1}
                disabled={disabled || !editor}
                onClick={() => editor && btn.run(editor)}
                title={btn.title}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40',
                  active && 'bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-150',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Clear format button */}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled || !editor}
            onClick={() => editor && editor.chain().focus().unsetAllMarks().clearNodes().run()}
            title="Clear Formatting"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800 disabled:opacity-40"
          >
            <RemoveFormatting className="h-3.5 w-3.5" />
          </button>

          {/* Undo / Redo */}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled || !editor || !editor.can().undo()}
            onClick={() => editor && editor.chain().focus().undo().run()}
            title="Undo (Ctrl+Z)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800 disabled:opacity-30"
          >
            <Undo className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled || !editor || !editor.can().redo()}
            onClick={() => editor && editor.chain().focus().redo().run()}
            title="Redo (Ctrl+Y)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800 disabled:opacity-30"
          >
            <Redo className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* TipTap Document Area */}
        <EditorContent editor={editor} />
      </div>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
