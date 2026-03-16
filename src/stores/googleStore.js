import { defineStore } from 'pinia'
import { GOOGLE_CLIENT_ID, SHEETS_SCOPE } from '../config'

const TOKEN_KEY = 'google_token'

function saveToken(token) {
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify({
    token,
    expiry: Date.now() + 55 * 60 * 1000, // 55 minutos (token dura 1h)
  }))
}

function loadToken() {
  const stored = sessionStorage.getItem(TOKEN_KEY)
  if (!stored) return null
  const { token, expiry } = JSON.parse(stored)
  if (Date.now() >= expiry) {
    sessionStorage.removeItem(TOKEN_KEY)
    return null
  }
  return token
}

function waitForGoogle(timeout = 5000) {
  return new Promise((resolve) => {
    if (window.google) return resolve(true)
    const interval = setInterval(() => {
      if (window.google) {
        clearInterval(interval)
        resolve(true)
      }
    }, 100)
    setTimeout(() => {
      clearInterval(interval)
      resolve(false)
    }, timeout)
  })
}

export const useGoogleStore = defineStore('google', {
  state: () => ({
    accessToken: loadToken(), // restaura da sessão imediatamente
    tokenClient: null,
  }),

  getters: {
    isConnected: (state) => !!state.accessToken,
  },

  actions: {
    async init() {
      const loaded = await waitForGoogle()
      if (!loaded || !GOOGLE_CLIENT_ID) return false

      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SHEETS_SCOPE,
        callback: async (response) => {
          if (response.access_token) {
            this.accessToken = response.access_token
            saveToken(response.access_token)
            // Sincroniza registry de usuários ao conectar
            const { syncRegistry } = await import('../services/usuarios')
            syncRegistry(response.access_token).catch(() => {})
          }
        },
      })

      // Se não tem token salvo, tenta reconectar silenciosamente
      if (!this.accessToken) {
        await this._trySilentConnect()
      }

      return true
    },

    _trySilentConnect() {
      return new Promise((resolve) => {
        if (!this.tokenClient) return resolve(false)

        const original = this.tokenClient.callback
        this.tokenClient.callback = (response) => {
          this.tokenClient.callback = original
          if (response.access_token) {
            this.accessToken = response.access_token
            saveToken(response.access_token)
            resolve(true)
          } else {
            resolve(false)
          }
        }
        // prompt: '' tenta silenciosamente se o usuário já autorizou
        this.tokenClient.requestAccessToken({ prompt: '' })
      })
    },

    requestToken() {
      return new Promise((resolve, reject) => {
        if (!this.tokenClient) return reject(new Error('Google não inicializado'))

        const original = this.tokenClient.callback
        this.tokenClient.callback = (response) => {
          if (response.error) return reject(new Error(response.error))
          this.accessToken = response.access_token
          saveToken(response.access_token)
          this.tokenClient.callback = original
          resolve(response.access_token)
        }
        this.tokenClient.requestAccessToken()
      })
    },

    disconnect() {
      if (this.accessToken) {
        window.google?.accounts.oauth2.revoke(this.accessToken)
      }
      this.accessToken = null
      sessionStorage.removeItem(TOKEN_KEY)
    },
  },
})
