import type { PushSubscription } from './types'

function b64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

function bytesToB64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, ikmKey, length * 8)
  return new Uint8Array(bits)
}

async function createVAPIDJWT(
  audience: string,
  subject: string,
  publicKeyB64url: string,
  privateKeyB64url: string,
): Promise<string> {
  const pubBytes = b64urlToBytes(publicKeyB64url)
  // pubBytes: [0x04, x(32), y(32)]
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64url(pubBytes.slice(1, 33)),
    y: bytesToB64url(pubBytes.slice(33, 65)),
    d: privateKeyB64url,
  }
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const enc = new TextEncoder()
  const header = bytesToB64url(enc.encode(JSON.stringify({ alg: 'ES256', typ: 'JWT' })))
  const payload = bytesToB64url(
    enc.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 43200,
        sub: subject,
      }),
    ),
  )
  const signingInput = `${header}.${payload}`
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    enc.encode(signingInput),
  )
  return `${signingInput}.${bytesToB64url(new Uint8Array(sig))}`
}

async function encryptPayload(
  plaintext: string,
  p256dhB64url: string,
  authB64url: string,
): Promise<{ body: Uint8Array }> {
  const recipientPub = b64urlToBytes(p256dhB64url)
  const authSecret = b64urlToBytes(authB64url)

  const senderPair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  const recipientKey = await crypto.subtle.importKey(
    'raw',
    recipientPub,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )

  // @ts-expect-error Cloudflare types use $public but the V8 runtime requires public per Web Crypto spec
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: recipientKey },
    senderPair.privateKey,
    256,
  )
  const sharedSecret = new Uint8Array(sharedBits)

  const senderPub = new Uint8Array((await crypto.subtle.exportKey('raw', senderPair.publicKey)) as ArrayBuffer)

  // RFC 8291 IKM derivation
  const enc = new TextEncoder()
  const ikmInfo = new Uint8Array([...enc.encode('WebPush: info\x00'), ...recipientPub, ...senderPub])
  const ikm = await hkdf(authSecret, sharedSecret, ikmInfo, 32)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\x00'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\x00'), 12)

  // Encrypt: plaintext + 0x02 (delimiter)
  const plaintextBytes = enc.encode(plaintext)
  const padded = new Uint8Array([...plaintextBytes, 0x02])
  const cekKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, padded))

  // RFC 8188 header: salt(16) + rs(uint32 BE) + idlen(1) + keyid(65)
  const headerLen = 16 + 4 + 1 + senderPub.length
  const out = new Uint8Array(headerLen + ciphertext.length)
  const view = new DataView(out.buffer)
  out.set(salt, 0)
  view.setUint32(16, 4096, false)
  out[20] = senderPub.length
  out.set(senderPub, 21)
  out.set(ciphertext, headerLen)

  return { body: out }
}

export async function sendWebPush(
  subscription: PushSubscription,
  payload: { title: string; body: string },
  vapid: { publicKey: string; privateKey: string; subject: string },
): Promise<void> {
  const { body } = await encryptPayload(
    JSON.stringify(payload),
    subscription.keys.p256dh,
    subscription.keys.auth,
  )

  const url = new URL(subscription.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const jwt = await createVAPIDJWT(audience, vapid.subject, vapid.publicKey, vapid.privateKey)

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      Authorization: `vapid t=${jwt},k=${vapid.publicKey}`,
      TTL: '86400',
    },
    body,
  })

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`push failed: ${res.status}`)
  }
}
