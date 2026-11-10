// MY CS MTP — Admin promotional wallet config page. ADMIN-only (via admin layout).
import { getSettings } from '@/lib/settings'
import { readPromoWalletStatus } from '@/lib/promo-wallet-status'
import {
  PromotionalWalletForm,
  PromoWalletBehaviorNote,
} from '@/components/admin/promotional-wallet-form'

export const dynamic = 'force-dynamic'

export default async function AdminPromotionalWalletPage() {
  const [settings, wiring] = await Promise.all([getSettings(), readPromoWalletStatus()])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Promotional Wallet Config</h2>
        <p className="text-sm text-muted-foreground">
          Set the promotional wallet credit amount and the rules text shown to students.
        </p>
      </div>

      <PromotionalWalletForm
        promoWalletAmount={settings.promoWalletAmount}
        promoWalletRules={settings.promoWalletRules}
      />

      <PromoWalletBehaviorNote wiredOnSignup={wiring.wiredOnSignup} />
    </div>
  )
}
