import argon2 from 'argon2'

const users = [
  {
    id: '13bfd0bb-0765-44be-a633-50e914809626',
    username: 'admin',
    role: 'admin',
    password: await argon2.hash('password')
  },
  {
    id: '643bb0de-90eb-41e1-bc2a-8adafa485471',
    username: 'user',
    role: 'user',
    password: await argon2.hash('password')
  }
]

function mapUser (user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role
  }
}

/**
 * @param {string} username
 * @param {string} password
 */
export async function authenticateWithCredentials (username, password) {
  const user = users.find(user => user.username === username)
  if (!user) return null
  const validPassword = await argon2.verify(user.password, password)
  if (!validPassword) return null
  return mapUser(user)
}

export async function getUserById (userId) {
  const user = users.find(user => user.id === userId)
  return user ? mapUser(user) : null
}

export async function listUsers (currentUser) {
  if (currentUser.role !== 'admin') return []
  return users.map(mapUser)
}

export async function updateUser (currentUser, userId, { role }) {
  if (currentUser.role !== 'admin') return null
  const user = users.find(user => user.id === userId)
  if (!user) return null
  user.role = role
  return mapUser(user)
}
