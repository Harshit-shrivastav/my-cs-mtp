// MY CS MTP — Detects whether the promotional wallet credit is wired into the
// signup flow, so the admin page can show an accurate note of current behavior.
import { promises as fs } from 'fs'
import path from 'path'

const SIGNUP_ROUTE = path.join(process.cwd(), 'src', 'app', 'api', 'auth', 'signup', 'route.ts')

export interface PromoWalletStatus {
  wiredOnSignup: boolean
  signupFileFound: boolean
}

export async function readPromoWalletStatus(): Promise<PromoWalletStatus> {
  try {
    const src = await fs.readFile(SIGNUP_ROUTE, 'utf8')
    return {
      wiredOnSignup: /promoWallet|promo_wallet|PROMO_WALLET/i.test(src),
      signupFileFound: true,
    }
  } catch {
    return { wiredOnSignup: false, signupFileFound: false }
  }
}
