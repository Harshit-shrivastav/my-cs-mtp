'use client'

import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  Heading2,
  Link as LinkIcon,
  List,
  Code,
  Eye,
  PenLine,
} from 'lucide-react'

export interface MarkdownEditorProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** CSS min-height for the textarea / preview area. Default 400px. */
  minHeight?: number
  disabled?: boolean
  /** Label shown in the toolbar (e.g. "Markdown"). */
  toolbarLabel?: string
  className?: string
}

type ToolId = 'h2' | 'bold' | 'italic' | 'link' | 'list' | 'code'

/**
 * Shared markdown editor used by Blog and Custom Pages admin editors.
 * Toolbar with quick-insert helpers, a monospace textarea and a live
 * Preview toggle rendered with react-markdown (same styling as the
 * public blog renderer).
 */
export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
  minHeight = 400,
  disabled,
  toolbarLabel = 'Markdown',
  className,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  function applyTool(tool: ToolId) {
    const el = textareaRef.current
    if (!el || disabled) return
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const selected = value.slice(start, end)

    let nextValue = value
    let selStart = start
    let selEnd = end

    if (tool === 'h2' || tool === 'list') {
      const snippet = tool === 'h2' ? '## Section heading' : '- List item'
      const prefix = start === 0 || value[start - 1] === '\n' ? '' : '\n\n'
      nextValue = value.slice(0, start) + prefix + snippet + '\n' + value.slice(end)
      const pos = start + prefix.length + snippet.length + 1
      selStart = pos
      selEnd = pos
    } else {
      const [before, after, fallback] =
        tool === 'bold'
          ? ['**', '**', 'bold text']
          : tool === 'italic'
            ? ['*', '*', 'italic text']
            : tool === 'link'
              ? ['[', '](https://)', 'link text']
              : ['`', '`', 'code']
      const inner = selected || fallback
      nextValue = value.slice(0, start) + before + inner + after + value.slice(end)
      selStart = start + before.length
      selEnd = selStart + inner.length
    }

    onChange(nextValue)
    // Restore focus + selection after the state update is applied
    requestAnimationFrame(() => {
      const el2 = textareaRef.current
      if (!el2) return
      el2.focus()
      el2.setSelectionRange(selStart, selEnd)
    })
  }

  function onToolClick(e: React.MouseEvent, tool: ToolId) {
    e.preventDefault()
    applyTool(tool)
  }

  return (
    <div className={cn('rounded-md border bg-background', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1.5 rounded-t-md">
        <span className="text-xs font-medium text-muted-foreground mr-1">{toolbarLabel}</span>
        {mode === 'write' && (
          <>
            <button
              type="button"
              title="Insert ## section heading"
              aria-label="Insert ## section heading"
              disabled={disabled}
              onClick={(e) => onToolClick(e, 'h2')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <Heading2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Bold"
              aria-label="Bold"
              disabled={disabled}
              onClick={(e) => onToolClick(e, 'bold')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Italic"
              aria-label="Italic"
              disabled={disabled}
              onClick={(e) => onToolClick(e, 'italic')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Insert link"
              aria-label="Insert link"
              disabled={disabled}
              onClick={(e) => onToolClick(e, 'link')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Bullet list"
              aria-label="Bullet list"
              disabled={disabled}
              onClick={(e) => onToolClick(e, 'list')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Inline code"
              aria-label="Inline code"
              disabled={disabled}
              onClick={(e) => onToolClick(e, 'code')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <Code className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === 'write' ? 'default' : 'ghost'}
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setMode('write')}
            disabled={disabled}
          >
            <PenLine className="h-3.5 w-3.5" />
            Write
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'preview' ? 'default' : 'ghost'}
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setMode('preview')}
            disabled={disabled}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
        </div>
      </div>

      {mode === 'write' ? (
        <textarea
          id={id}
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          spellCheck={false}
          className="block w-full resize-y rounded-b-md bg-background px-3 py-3 font-mono text-sm leading-relaxed outline-none disabled:opacity-50"
          style={{ minHeight }}
        />
      ) : (
        <div className="overflow-y-auto px-4 py-4" style={{ minHeight }}>
          {value.trim() ? (
            <MarkdownContent markdown={value} />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Nothing to preview yet — start writing in the Write tab.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Markdown renderer with the same visual style as the public blog page.
 * Exported separately so other admin screens can render markdown previews.
 */
export function MarkdownContent({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-sm max-w-none [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:font-semibold [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_a]:text-foreground [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-4 [&_img]:max-w-full [&_img]:rounded [&_hr]:my-6 [&_table]:w-full [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:px-2 [&_td]:py-1">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  )
}
