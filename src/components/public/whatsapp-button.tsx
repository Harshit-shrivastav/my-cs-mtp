'use client'
import { getSettings } from '@/lib/settings'
import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'

// We can't call getSettings from client. Instead, expose settings via the
// public settings endpoint OR via a server component that injects props.
// For simplicity, we'll fetch the WhatsApp link from a tiny endpoint.
export function WhatsAppButton({ link }: { link: string }) {
  if (!link) return null
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-4 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white shadow-md hover:bg-green-700 transition-colors"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  )
}
