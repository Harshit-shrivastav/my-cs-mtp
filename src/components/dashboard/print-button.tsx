'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <Button onClick={() => window.print()} size="sm" className="no-print">
      <Printer className="h-3.5 w-3.5 mr-1.5" /> Print invoice
    </Button>
  )
}
