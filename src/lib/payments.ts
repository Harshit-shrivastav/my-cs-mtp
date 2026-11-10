// MY CS MTP — Payment gateway abstraction.
// Supports Razorpay, Cashfree, and a built-in MOCK mode for when no keys are set.
// All secrets live in env. Server creates the order; client opens checkout; server verifies.

import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import crypto from 'crypto'

export type GatewayName = 'RAZORPAY' | 'CASHFREE' | 'MOCK'

export interface CreateOrderInput {
  orderId: string  // internal order id
  amount: number   // in INR (currency units)
  customerName: string
  customerEmail: string
  customerMobile: string
}

export interface CreateOrderResult {
  gateway: GatewayName
  gatewayOrderId: string
  // Razorpay: order id; Cashfree: order id / session id
  checkout: any
}

export interface VerifyInput {
  gateway: GatewayName
  gatewayOrderId: string
  gatewayPaymentId: string
  gatewaySignature?: string
  internalOrderId: string
}

export async function activeGateway(): Promise<GatewayName> {
  const cfg = await db.paymentGatewayConfig.findFirst()
  if (!cfg) {
    const settings = await getSettings()
    return (settings.activePaymentGateway as GatewayName) || 'MOCK'
  }
  if (cfg.activeGateway === 'RAZORPAY' && cfg.razorpayEnabled && process.env.RAZORPAY_KEY_ID) return 'RAZORPAY'
  if (cfg.activeGateway === 'CASHFREE' && cfg.cashfreeEnabled && process.env.CASHFREE_APP_ID) return 'CASHFREE'
  return 'MOCK'
}

// ---------- Razorpay ----------
async function createRazorpayOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const key = process.env.RAZORPAY_KEY_ID!
  const secret = process.env.RAZORPAY_KEY_SECRET!
  const amountPaise = Math.round(input.amount * 100)
  const resp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(key + ':' + secret).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt: input.orderId,
      notes: { internalOrderId: input.orderId, email: input.customerEmail },
    }),
  })
  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error('Razorpay create order failed: ' + txt)
  }
  const json = await resp.json()
  return {
    gateway: 'RAZORPAY',
    gatewayOrderId: json.id,
    checkout: {
      keyId: key,
      orderId: json.id,
      amount: json.amount,
      currency: 'INR',
      name: 'MY CS MTP',
      description: 'Test series purchase',
      prefill: { name: input.customerName, email: input.customerEmail, contact: input.customerMobile },
    },
  }
}

async function verifyRazorpay(input: VerifyInput): Promise<boolean> {
  const secret = process.env.RAZORPAY_KEY_SECRET!
  if (!input.gatewaySignature) return false
  const body = `${input.gatewayOrderId}|${input.gatewayPaymentId}`
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return expected === input.gatewaySignature
}

// ---------- Cashfree ----------
async function createCashfreeOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const appId = process.env.CASHFREE_APP_ID!
  const secret = process.env.CASHFREE_SECRET_KEY!
  const settings = await getSettings()
  const isProd = settings.paymentMode === 'PRODUCTION'
  const base = isProd ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com'
  const resp = await fetch(`${base}/pg/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': appId,
      'x-client-secret': secret,
    },
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: input.amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: input.orderId,
        customer_email: input.customerEmail,
        customer_phone: input.customerMobile,
        customer_name: input.customerName,
      },
      order_meta: {
        return_url: `${process.env.SITE_URL}/payment/cashfree/return?order_id=${input.orderId}`,
      },
    }),
  })
  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error('Cashfree create order failed: ' + txt)
  }
  const json = await resp.json()
  return {
    gateway: 'CASHFREE',
    gatewayOrderId: json.order_id || input.orderId,
    checkout: {
      paymentSessionId: json.payment_session_id,
      orderId: json.order_id || input.orderId,
      appId: appId,
      env: isProd ? 'production' : 'sandbox',
    },
  }
}

async function verifyCashfree(input: VerifyInput): Promise<boolean> {
  const appId = process.env.CASHFREE_APP_ID!
  const secret = process.env.CASHFREE_SECRET_KEY!
  const settings = await getSettings()
  const isProd = settings.paymentMode === 'PRODUCTION'
  const base = isProd ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com'
  const resp = await fetch(`${base}/pg/orders/${input.gatewayOrderId}/payments/${input.gatewayPaymentId}`, {
    headers: {
      'x-api-version': '2023-08-01',
      'x-client-id': appId,
      'x-client-secret': secret,
    },
  })
  if (!resp.ok) return false
  const json = await resp.json()
  return json.payment_status === 'SUCCESS' || json.payment_status === 'PAID'
}

// ---------- Mock ----------
async function createMockOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  return {
    gateway: 'MOCK',
    gatewayOrderId: 'mock_' + input.orderId,
    checkout: {
      mode: 'mock',
      orderId: input.orderId,
      amount: input.amount,
      // The client shows a fake "Pay" button; success auto-returns to /payment-success
    },
  }
}

async function verifyMock(input: VerifyInput): Promise<boolean> {
  return true
}

// ---------- Public API ----------
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const gw = await activeGateway()
  if (gw === 'RAZORPAY') return createRazorpayOrder(input)
  if (gw === 'CASHFREE') return createCashfreeOrder(input)
  return createMockOrder(input)
}

export async function verifyPayment(input: VerifyInput): Promise<boolean> {
  if (input.gateway === 'RAZORPAY') return verifyRazorpay(input)
  if (input.gateway === 'CASHFREE') return verifyCashfree(input)
  return verifyMock(input)
}
