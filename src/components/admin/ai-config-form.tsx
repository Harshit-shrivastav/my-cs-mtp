'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Bot, CheckCircle2, Loader2, Save, XCircle } from 'lucide-react'

export interface AiConfigFormProps {
  provider: string
  baseUrl: string
  model: string
  isActive: boolean
  hasApiKey: boolean
  apiKeyHint: string | null
}

export function AiConfigForm(props: AiConfigFormProps) {
  const router = useRouter()
  const [provider, setProvider] = useState(props.provider || 'openai-compatible')
  const [baseUrl, setBaseUrl] = useState(props.baseUrl)
  const [model, setModel] = useState(props.model)
  const [apiKey, setApiKey] = useState('')
  const [isActive, setIsActive] = useState(props.isActive)
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await fetch('/api/admin/ai-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider.trim() || 'openai-compatible',
          baseUrl: baseUrl.trim() || null,
          model: model.trim() || null,
          apiKey: apiKey.trim() === '' ? '' : apiKey.trim(),
          isActive,
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed to save AI config.')
      toast.success('AI configuration saved.')
      setApiKey('')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save AI config.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">AI provider</CardTitle>
        <CardDescription>
          Used by AI-powered features (e.g. blog draft generation). Any OpenAI-compatible Chat
          Completions API works.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ai-provider">Provider</Label>
              <Input
                id="ai-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="openai-compatible"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-model">Model</Label>
              <Input
                id="ai-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. glm-4, gpt-4o-mini…"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-base-url">Base URL</Label>
            <Input
              id="ai-base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
            <p className="text-xs text-muted-foreground">
              Root of the OpenAI-compatible API (without <span className="font-mono">/chat/completions</span>).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-api-key">API key</Label>
            <Input
              id="ai-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={props.hasApiKey ? `Stored: ${props.apiKeyHint} — leave blank to keep it` : 'No API key set — paste one to store it'}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Write-only: the stored key is never returned by the API or shown here (only a masked
              hint). Leave blank to keep the currently stored key.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-active">AI features active</Label>
            <div className="flex items-center gap-3">
              <Switch id="ai-active" checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-xs text-muted-foreground">
                {isActive ? 'Active — AI features can call this provider' : 'Inactive — AI features disabled'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {props.hasApiKey ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-muted-foreground">
                  API key stored (<span className="font-mono">{props.apiKeyHint}</span>)
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-muted-foreground">No API key stored yet</span>
              </>
            )}
            <Badge variant={props.isActive ? 'default' : 'secondary'} className="gap-1">
              <Bot className="h-3 w-3" />
              {props.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save AI config
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
