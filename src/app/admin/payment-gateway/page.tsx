// MY CS MTP — Admin payment gateway config page. ADMIN-only (via admin layout).
import { db } from '@/lib/db'
import { loadPaymentGatewayState } from '@/lib/payment-gateway-status'
import { PaymentGatewayForm } from '@/components/admin/payment-gateway-form'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentGatewayPage() {
  const [state, pgcCount] = await Promise.all([
    loadPaymentGatewayState(),
    db.paymentGatewayConfig.count(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Payment Gateway</h2>
        <p className="text-sm text-muted-foreground">
          Configure which gateway handles checkout. Secrets are never stored here — only whether
          the required environment variables are present.
        </p>
      </div>

      <PaymentGatewayForm
        activePaymentGateway={state.activePaymentGateway}
        paymentMode={state.paymentMode}
        razorpayEnabled={state.razorpayEnabled}
        cashfreeEnabled={state.cashfreeEnabled}
        razorpayConfigured={state.razorpayConfigured}
        cashfreeConfigured={state.cashfreeConfigured}
        effectiveGateway={state.effectiveGateway}
        tableRowInSync={state.tableRowInSync}
      />

      <p className="text-xs text-muted-foreground">
        Settings are stored in SiteConfig and mirrored to the PaymentGatewayConfig table
        ({pgcCount} row{pgcCount === 1 ? '' : 's'}), which is what
        <span className="font-mono"> activeGateway()</span> in
        <span className="font-mono"> src/lib/payments.ts</span> resolves at checkout time.
      </p>
    </div>
  )
}
