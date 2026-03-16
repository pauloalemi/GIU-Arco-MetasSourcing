import { defineStore } from 'pinia'
import { loadRegistry } from '../services/usuarios'

// Credenciais de fallback — usadas apenas se o registry ainda não foi sincronizado
const FALLBACK_USERS = [
  { username: 'carolina.hidalgo',  password: 'senha123', role: 'user',  name: 'Carolina Hidalgo' },
  { username: 'lorrana.ferraz',    password: 'senha123', role: 'user',  name: 'Lorrana Ferraz' },
  { username: 'carolina.schrann', password: 'senha123', role: 'user',  name: 'Carolina Schrann' },
  { username: 'giuliana',          password: 'admin123', role: 'admin', name: 'Giuliana Caram' },
]

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(sessionStorage.getItem('user')) || null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
  },

  actions: {
    login(username, password) {
      // Tenta usar o registry sincronizado primeiro
      const registry = loadRegistry()

      let found = null
      if (registry[username]) {
        const r = registry[username]
        if (r.password === password) {
          // Role do FALLBACK_USERS tem prioridade — evita perda acidental de privilégios
          const fallback = FALLBACK_USERS.find((u) => u.username === username)
          found = { username, role: fallback?.role || r.role, name: r.name }
        }
      } else {
        // Fallback para credenciais hardcoded
        const fallback = FALLBACK_USERS.find((u) => u.username === username && u.password === password)
        if (fallback) {
          const { password: _, ...safe } = fallback
          found = safe
        }
      }

      if (!found) return false

      this.user = found
      sessionStorage.setItem('user', JSON.stringify(found))
      return true
    },

    logout() {
      this.user = null
      sessionStorage.removeItem('user')
    },
  },
})
