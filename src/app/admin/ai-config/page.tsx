// MY CS MTP — Admin AI config page. ADMIN-only (via admin layout).
import { db } from '@/lib/db'
import { AiConfigForm } from '@/components/admin/ai-config-form'

export const dynamic = 'force-dynamic'

function maskKey(key: string | null | undefined): string | null {
  if (!key) return null
  const trimmed = key.trim()
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 3)}…${trimmed.slice(-4)}`
}

export default async function AdminAiConfigPage() {
  const row = await db.aiConfig.findFirst()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">AI Config</h2>
        <p className="text-sm text-muted-foreground">
          Connection details for the OpenAI-compatible AI provider used by AI features.
        </p>
      </div>

      <AiConfigForm
        provider={row?.provider ?? ''}
        baseUrl={row?.baseUrl ?? ''}
        model={row?.model ?? ''}
        isActive={row?.isActive ?? false}
        hasApiKey={Boolean(row?.apiKey)}
        apiKeyHint={maskKey(row?.apiKey)}
      />

      <p className="text-xs text-muted-foreground">
        The API key is stored server-side in the AiConfig table and is write-only through this
        panel — responses only ever include <span className="font-mono">hasApiKey</span> and a
        masked hint like <span className="font-mono">sk-…abc4</span>.
      </p>
    </div>
  )
}
