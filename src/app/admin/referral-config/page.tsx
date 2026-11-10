// MY CS MTP — Admin referral config page. ADMIN-only (via admin layout).
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { ReferralConfigForm, ReferralHowItWorksNote } from '@/components/admin/referral-config-form'

export const dynamic = 'force-dynamic'

export default async function AdminReferralConfigPage() {
  const [settings, row] = await Promise.all([
    getSettings(),
    db.referralConfig.findFirst(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Referral Config</h2>
        <p className="text-sm text-muted-foreground">
          Configure the refer-a-friend reward programme and the rules text shown to students.
        </p>
      </div>

      <ReferralConfigForm
        rewardType={settings.referralRewardType}
        rewardValue={settings.referralRewardValue}
        rules={settings.referralRules}
        isActive={row?.isActive ?? true}
      />

      <ReferralHowItWorksNote />
    </div>
  )
}
