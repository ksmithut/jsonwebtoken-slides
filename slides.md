---
theme: ./theme.json
author: Keith Smith
paging: Securely use JSON Web Tokens
size: 110 x 30
---

# How to Securely use JSON Web Tokens

---

# How to Securely use JSON Web Tokens

## About me

<!-- -->
<!-- -->
<!-- -->

- Kuali
  <!-- -->
  - Higher-education adminitration
    <!-- -->
- Wrote a JWT library once
  <!-- -->
- Loves to work with identity management/authz/authn

---

# What is a JSON Web Token?

<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->

> JSON Web Token (JWT) is a compact, URL-safe means of
> representing claims to be transferred between two parties.

---

# What is a JSON Web Token?

<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->

Thank you for coming to my TED talk

---

# What is a JSON Web Token?

<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1MTYyMzkwMjJ9.tbDepxpstvGdW8TC3G8zg4B6rUYAOvfzdceoH48wgRQ

header.payload.signature

---

# What is a JSON Web Token?

### Header

- Contains meta information about the token
  - Algorithm
  - key used to sign/verify

### Payload

- The stuff that the token consumer will actually use
- `iss` (issuer) Who issued the token
- `sub` (subject) Who the token is about (e.g. user)
- `aud` (audience) Who the token is intended for
- `exp` (expiration) When the token should no longer be valid
- `nbf` (not before) Earliest the token should be valid
- `iat` (issued at) When the token was issued
- `jti` (JWT ID) Identifier than can be used to prevent replays

### Signature

- Cryptographic signature used to verify that the contents of the header and payload have not changed since it was signed.

---

# What is a JSON Web Token?

```javascript
const crypto = require('node:crypto')

function signHS256 (payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const headerStr = Buffer.from(JSON.stringify(header)).toString('base64url')
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerStr}.${payloadStr}`)
    .digest('base64url')
  return `${headerStr}.${payloadStr}.${signature}`
}

const payload = { iat: Math.floor(Date.now() / 1000) }
const secret = 'fhqwhgads' // everybody to the limit
const token = signHS256(payload, secret)

console.log(payload)
console.log(token)
```

---

# Symmetric and Asymmetric Keys

- Symmetric Algorithms
  - `HS256`, `HS384`, `HS512` (HMAC)
  - Single secret used for both signing and verifying
  - Secrets must not be made public
  - Secrets must remain with 1st party (do not distribute to 3rd party developers)
  - 3rd parties must verify tokens by sending them to 1st party service.

<!-- -->

- Asymmetric Algorithms
  - `RS256`, `RS384`, `RS512` (RSA)
  - `ES256`, `ES384`, `ES512`, `ES256K` (ECDSA)
  - `PS256`, `PS384`, `PS512` (RSA-PSS)
  - `EdDSA`
  - Use a tool (such as openssl, libressl, etc) to generate keys
  - Sign with private key, verify with public key
  - Allows you to distribute the public key
  - Private keys must remain with 1st party
  - 3rd party applications can verify tokens with public key

---

# How can JWTs be attacked?

---

# How can JWTs be attacked?

<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->

Accidentally pasting a production auth token in your slide deck

---

# How can JWTs be attacked?

## `none` algorithm

It is possible to create a JWT with no signature:

```javascript
const header = { alg: 'none', typ: 'JWT' }
const payload = { iat: Math.floor(Date.now() / 1000) }
const headerStr = Buffer.from(JSON.stringify(header)).toString('base64url')
const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url')
const token = `${headerStr}.${payloadStr}.`
console.log(token)
```

<!-- -->
<!-- -->
<!-- -->

Mitigations:

- Make sure you do not accept tokens with the `none` algorithm.
- Test the libraries you use to be sure they handle this case.

---

# How can JWTs be attacked?

## Key Confusion

<!-- -->

If the public key is accessible, it can be used to sign a new key with with an
`HS###` algorithm instead. In your verify function if you just pass in the
public key, the public key could technically be used as the secret for a
symmetric key.

<!-- -->
<!-- -->
<!-- -->

Mitigations:

- Test libraries to make sure they are not vulnerable to this.
- Specify accepted algorithms.
- Do not accept both symmetric and asymmetric keys.
- Sign tokens with with a kid that maps to a token you control. Use `kid` to
  select verifying token.

---

# What can I use JWTs for?

---

# What can I use JWTs for?

## Temporary download/upload URLs

```js
const secret = process.env.JWT_SECRET
const app = express()
app.get('/document/:id', (req, res, next) => {
  db.findOne({ id: req.params.id })
    .then(document => {
      const temporaryImageToken = jwt.sign({ sub: document.id }, secret, {
        expiresIn: 300 // 5 minutes
      })
      document.temporaryImageURL = `/images/${temporaryImageToken}`
      res.json(document)
    })
    .catch(next)
})
app.get('/images/:token', (req, res, next) => {
  const { sub: documentId } = jwt.verify(req.params.token, secret, {
    algorithms: ['HS256']
  })
  // TODO Fetch image info by documentId
})
```

---

# What can I use JWTs for?

## Callback URLs

```js
const secret = process.env.JWT_SECRET
const app = express()
app.post('/call-external-service', (req, res, next) => {
  const token = jwt.sign({ sub: 'someimportantid' }, secret, {
    algorithm: 'HS256',
    expiresIn: 3600
  })
  fetch('https://example.org/api', {
    method: 'POST',
    headers: { 'X-Response-URL': `https://${req.hostname}/callback/${token}` }
  }).catch(error => console.log(error, 'Error calling api'))
  res.sendStatus(202)
})
app.get('/callback/:token', (req, res, next) => {
  const payload = jwt.verify(req.params.token, secret, {
    algorithms: ['HS256']
  })
  // TODO process response
})
```

---

# What can I use JWTs for?

## Interservice state transfer (e.g. info about current user, etc.)

```js
const secret = process.env.JWT_SECRET
const proxy = httpProxy.createProxyServer({
  target: 'http://service.internal:9000'
})
http
  .createServer((req, res) => {
    users
      .fetchUser(req.headers.authorization)
      .then(user => {
        const userToken = jwt.sign({ user: req.user }, secret, {
          algorithm: 'HS256',
          exp: 60
        })
        proxy.web(req, res, { headers: { 'x-user-token': userToken } })
      })
      .catch(users.handleError)
  })
  .listen(process.env.PORT)
```

---

# What can I use JWTs for?

## OAuth2? / OpenID Connect

<!-- -->
<!-- -->
<!-- -->

- OAuth2 does not require JWTs

  <!-- -->

- OpenID Connect (extension of OAuth2) uses JWTs for the ID Token

  <!-- -->

- The library you use will likely take care of the details

  <!-- -->

---

# What can I use JWTs for?

## Short lived auth tokens

<!-- -->
<!-- -->
<!-- -->

- Used in some OAuth2 implementations

  <!-- -->

- Only needed if horizontal scalability is an issue

  <!-- -->

- Provide method of refreshing token (OAuth2 refresh grant)

  <!-- -->

- The longer the expiration, the longer a token may be "valid" after permission is revoked

---

# What can I use JWTs for?

## Session Tokens

---

# What can I use JWTs for?

## Session Tokens

<!-- -->
<!-- -->

How is it done without JWTs?

<!-- -->

- Session token/cookie
  <!-- -->
  - Signed Http-Only Cookie (similar to JWT signature)
    <!-- -->
  - Usually need backing store (Redis, MongoDB, PostgreSQL, etc.)
    <!-- -->
  - CSRF/Same-Site
    <!-- -->

---

# What can I use JWTs for?

## Session Tokens

How can I do it with JWTs?

- Stateless JWT (store session data in JWT)
  <!-- -->
  - No need for session storage
    <!-- -->
  - Don't lose session on restarts
    <!-- -->
  - Built-in expiration
    <!-- -->
  - Flexible, just a JSON Object
    <!-- -->
  - Easier to scale
    <!-- -->
  - Reduce calls to database
    <!-- -->
- Stateful JWT (payload contains session id)

---

<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->

```
    ____                       __                            ___       ________
   / __ \____     ____  ____  / /_   __  __________         / / |     / /_  __/____
  / / / / __ \   / __ \/ __ \/ __/  / / / / ___/ _ \   __  / /| | /| / / / / / ___/
 / /_/ / /_/ /  / / / / /_/ / /_   / /_/ (__  )  __/  / /_/ / | |/ |/ / / / (__  )
/_____/\____/  /_/ /_/\____/\__/   \__,_/____/\___/   \____/  |__/|__/ /_/ /____/


    ____              _____                _                ______      __
   / __/___  _____   / ___/___  __________(_)___  ____     /_  __/___  / /_____  ____  _____
  / /_/ __ \/ ___/   \__ \/ _ \/ ___/ ___/ / __ \/ __ \     / / / __ \/ //_/ _ \/ __ \/ ___/
 / __/ /_/ / /      ___/ /  __(__  |__  ) / /_/ / / / /    / / / /_/ / ,< /  __/ / / (__  )
/_/  \____/_/      /____/\___/____/____/_/\____/_/ /_/    /_/  \____/_/|_|\___/_/ /_/____/
```

---

# Best Practices (Rules of thumb)

<!-- -->

- Do not use/accept the `none` algorithms

  <!-- -->

- Verify the tokens. Don't just decode them.

  <!-- -->

- Do not put personal information (PPI) in the token.

  <!-- -->

- Utilize the standard claims such as `iss` and `aud` and verify that they match
  expected values

  <!-- -->

- Use strong Asymmetric keys

  <!-- -->

- Encode the key ids (`kid`) in the header so you can look up the correct key to use

  <!-- -->

- Set a reasonable expiration

  <!-- -->

- Include the Issued At (`iat`) claim to improve cryptographic entropy

  <!-- -->

- Don't use JWT if you're not prepared to deal with the cryptographic minefield

---

# Alternatives to JWT

<!-- -->
<!-- -->

- PASETO
  - **P**latform-**A**gnostic **SE**curity **TO**kens
  - https://paseto.io

<!-- -->

- Branca
  - https://branca.io

<!-- -->

- Biscuit
  - https://www.biscuitsec.org/

---

# How to Securely use JSON Web Tokens

<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->

                                                      Thank you

```

```
