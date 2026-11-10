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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Save, Share2 } from 'lucide-react'

export interface ReferralConfigFormProps {
  rewardType: string
  rewardValue: number
  rules: string
  isActive: boolean
}

export function ReferralConfigForm(props: ReferralConfigFormProps) {
  const router = useRouter()
  const [rewardType, setRewardType] = useState(props.rewardType)
  const [rewardValue, setRewardValue] = useState(String(props.rewardValue))
  const [rules, setRules] = useState(props.rules)
  const [isActive, setIsActive] = useState(props.isActive)
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const valueNum = Number(rewardValue)
    if (!Number.isFinite(valueNum) || valueNum < 0) {
      toast.error('Enter a valid non-negative reward value.')
      return
    }
    if (rewardType === 'PERCENT' && valueNum > 100) {
      toast.error('Percent reward cannot exceed 100.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/admin/referral-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewardType,
          rewardValue: Math.round(valueNum),
          rules,
          isActive,
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Failed to save referral config.')
      toast.success('Referral settings saved.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save referral config.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Referral reward</CardTitle>
            <CardDescription>
              What referrers earn when a referred student makes their first purchase. Shown on the
              student dashboard referral card.
            </CardDescription>
          </div>
          <Badge variant={props.isActive ? 'default' : 'secondary'}>
            {props.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="referral-reward-type">Reward type</Label>
              <Select value={rewardType} onValueChange={setRewardType}>
                <SelectTrigger id="referral-reward-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WALLET">Wallet credit (fixed amount)</SelectItem>
                  <SelectItem value="PERCENT">Percent of purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referral-reward-value">
                {rewardType === 'PERCENT' ? 'Percent (% of first purchase)' : 'Amount (₹ credited to wallet)'}
              </Label>
              <Input
                id="referral-reward-value"
                type="number"
                min="0"
                step="1"
                value={rewardValue}
                onChange={(e) => setRewardValue(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="referral-rules">Referral rules (shown to students)</Label>
            <Textarea
              id="referral-rules"
              rows={4}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Refer a friend. When they make their first purchase, both of you get ₹50 in your wallet."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="referral-active">Referral programme active</Label>
            <div className="flex items-center gap-3">
              <Switch id="referral-active" checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-xs text-muted-foreground">
                {isActive ? 'Active — students can refer & earn' : 'Inactive — referral rewards paused'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              The active flag lives on the ReferralConfig record; the reward type/value/rules are
              stored as site settings and mirrored to the same record.
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save referral settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function ReferralHowItWorksNote() {
  return (
    <div className="flex items-start gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
      <Share2 className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <p>
          Each student gets a personal referral link (<span className="font-mono">/signup?ref=…</span>)
          visible on their dashboard. Referred signups are linked via
          <span className="font-mono"> referredById</span>, and referral rewards are credited as
          wallet transactions with reason <span className="font-mono">REFERRAL</span>.
        </p>
      </div>
    </div>
  )
}
