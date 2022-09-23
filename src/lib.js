import process from 'node:process'

export function getRequiredEnv (name) {
  const value = process.env[name]
  if (!value) throw new ReferenceError(`Missing env ${name}`)
  return value
}

/**
 * @returns {import('express').RequestHandler}
 */
export function requireUser () {
  return (req, res, next) => {
    if (req.user) return next()
    res.sendStatus(401)
  }
}
