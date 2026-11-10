'use client'
import { useState } from 'react'
import { Facebook, Twitter, MessageCircle, Link as LinkIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function ShareLinksClient({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    const abs = window.location.origin + url
    try {
      await navigator.clipboard.writeText(abs)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = abs
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
      toast.success('Link copied')
    }
  }

  const abs = typeof window !== 'undefined' ? window.location.origin + url : url
  const encUrl = encodeURIComponent(abs)
  const encTitle = encodeURIComponent(title)
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`
  const tw = `https://twitter.com/intent/tweet?url=${encUrl}&text=${encTitle}`
  const wa = `https://wa.me/?text=${encTitle}%20${encUrl}`

  return (
    <span className="inline-flex items-center gap-1 ml-auto">
      <a href={fb} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
        <Facebook className="h-4 w-4" />
      </a>
      <a href={tw} target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
        <Twitter className="h-4 w-4" />
      </a>
      <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
        <MessageCircle className="h-4 w-4" />
      </a>
      <Button type="button" variant="ghost" size="sm" onClick={copyLink} className="h-8 px-2" aria-label="Copy link">
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <LinkIcon className="h-4 w-4" />}
        <span className="ml-1 text-xs">{copied ? 'Copied' : 'Copy'}</span>
      </Button>
    </span>
  )
}
