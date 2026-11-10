// MY CS MTP — File storage module (Cloudflare R2 via S3-compatible API)
// Falls back to local disk in /public/uploads when R2 credentials are not set,
// so the app remains fully functional in dev. The DB only ever stores the object key.

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { promises as fs } from 'fs'
import path from 'path'

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads')

export interface StorageObject {
  key: string
}

function isR2Configured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET
  )
}

let client: S3Client | null = null
function s3(): S3Client {
  if (client) return client
  client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  })
  return client
}

// ---------- Public URL for a key ----------
export function publicUrl(key: string): string | null {
  if (!key) return null
  if (isR2Configured() && process.env.S3_PUBLIC_BASE_URL) {
    return `${process.env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`
  }
  // local fallback
  return `/uploads/${key}`
}

// ---------- Presigned upload URL ----------
export async function presignedUploadUrl(key: string, contentType: string, maxSize = 50 * 1024 * 1024): Promise<string> {
  if (!isR2Configured()) {
    // Local mode — return a relative URL pointing at our own upload API
    return `/api/storage/upload?key=${encodeURIComponent(key)}`
  }
  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    ContentType: contentType,
    ContentLength: maxSize,
  })
  return getSignedUrl(s3(), cmd, { expiresIn: 600 })
}

// ---------- Server-side upload (for local mode + fallback) ----------
export async function serverUpload(key: string, buffer: Buffer, contentType: string): Promise<void> {
  if (isR2Configured()) {
    await s3().send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }))
  } else {
    const filePath = path.join(UPLOADS_DIR, key)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, buffer)
  }
}

// ---------- Presigned download URL ----------
export async function presignedDownloadUrl(key: string, expiresIn = 600): Promise<string> {
  if (!isR2Configured()) {
    // Local mode — return the public path under /uploads (protected routes will
    // have been gated by the API handler already).
    return `/api/storage/download?key=${encodeURIComponent(key)}`
  }
  const cmd = new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key })
  return getSignedUrl(s3(), cmd, { expiresIn })
}

// ---------- Read object stream/buffer (for local mode proxy or streaming) ----------
export async function getObjectBuffer(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!isR2Configured()) {
    const filePath = path.join(UPLOADS_DIR, key)
    try {
      const buffer = await fs.readFile(filePath)
      const ext = path.extname(filePath).toLowerCase()
      const contentType = extToContentType(ext)
      return { buffer, contentType }
    } catch {
      return null
    }
  }
  // R2 — fetch object
  const cmd = new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key })
  const resp = await s3().send(cmd)
  if (!resp.Body) return null
  const chunks: Uint8Array[] = []
  // @ts-ignore
  for await (const chunk of resp.Body as any) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)
  return { buffer, contentType: resp.ContentType || 'application/octet-stream' }
}

export function extToContentType(ext: string): string {
  switch (ext) {
    case '.pdf': return 'application/pdf'
    case '.doc': return 'application/msword'
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case '.xls': return 'application/vnd.ms-excel'
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.png': return 'image/png'
    case '.webp': return 'image/webp'
    case '.gif': return 'image/gif'
    default: return 'application/octet-stream'
  }
}

// ---------- Delete ----------
export async function deleteObject(key: string): Promise<void> {
  if (!isR2Configured()) {
    try { await fs.unlink(path.join(UPLOADS_DIR, key)) } catch {}
    return
  }
  await s3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }))
}

// ---------- Validation ----------
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
]

export function isAllowedType(contentType: string): boolean {
  return ALLOWED_FILE_TYPES.includes(contentType)
}

export function isImageType(contentType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType)
}

export function genObjectKey(prefix: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const year = new Date().getFullYear()
  const stamp = Date.now().toString(36)
  return `${prefix}/${year}/${stamp}-${safeName}`
}

export const storageMode = isR2Configured() ? 'r2' : 'local'
