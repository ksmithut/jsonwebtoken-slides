import 'dotenv/config'
import { once } from 'events'
import express from 'express'
import jwt from 'jsonwebtoken'
import { expressjwt } from 'express-jwt'
import * as api from './api.js'
import { getRequiredEnv, requireUser } from './lib.js'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')
const PORT = Number.parseInt(getRequiredEnv('PORT'), 10)

const app = express()

const revokedTokens = new Set()

app.use(
  expressjwt({
    algorithms: ['HS256'],
    secret: JWT_SECRET,
    credentialsRequired: false,
    isRevoked (req, token) {
      revokedTokens.push
    }
  }),
  (req, res, next) => {
    if (req.auth?.user) {
      api
        .getUserById(req.auth.user.id)
        .then(user => {
          req.user = user
          next()
        })
        .catch(next)
    } else {
      next()
    }
  }
)

app.post('/api/session', express.json(), (req, res, next) => {
  api
    .authenticateWithCredentials(req.body.username, req.body.password)
    .then(user => {
      if (!user) return res.sendStatus(401)
      const token = jwt.sign({ user }, JWT_SECRET, {
        algorithm: 'HS256'
      })
      res.json({ token })
    })
    .catch(next)
})

app.get('/api/session', requireUser(), (req, res, next) => {
  res.json(req.user)
})

app.delete('/api/session', requireUser(), (req, res, next) => {
  // TODO?
  res.sendStatus(204)
})

app.get('/api/users', requireUser(), (req, res, next) => {
  api
    .listUsers(req.user)
    .then(users => res.json(users))
    .catch(next)
})

app.patch('/api/users/:id', requireUser(), express.json(), (req, res, next) => {
  api
    .updateUser(req.user, req.params.id, req.body)
    .then(user => {
      if (!user) return res.status(404).json({ error: 'user not found' })
      res.json(user)
    })
    .catch(next)
})

app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status).json({ code: error.code, message: error.message })
    return
  }
  console.log(error)
  res.status(500).json({ message: 'Unauthorized' })
})

await once(app.listen(PORT), 'listening')
console.log(`Server started on port ${PORT}`)
