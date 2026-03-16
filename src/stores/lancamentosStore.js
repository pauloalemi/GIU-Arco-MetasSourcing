import { defineStore } from 'pinia'
import { useGoogleStore } from './googleStore'
import { useAuthStore } from './auth'
import { initUserSheet, readLancamentos, upsertLancamento } from '../services/lancamentos'

export const useLancamentosStore = defineStore('lancamentos', {
  state: () => ({
    lancamentos: [],
    loading: false,
    saving: false,
    error: null,
  }),

  getters: {
    byDate: (state) => (date) =>
      state.lancamentos.filter((l) => l.data === date),
  },

  actions: {
    async init() {
      const google = useGoogleStore()
      const auth = useAuthStore()
      this.loading = true
      this.error = null
      try {
        await initUserSheet(google.accessToken, auth.user.name)
        this.lancamentos = await readLancamentos(google.accessToken, auth.user.name)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async save(date, projectId, projectName, triagem) {
      const google = useGoogleStore()
      const auth = useAuthStore()
      this.saving = true
      this.error = null
      try {
        await upsertLancamento(google.accessToken, auth.user.name, date, projectId, projectName, triagem)
        // Atualiza local
        const existing = this.lancamentos.find((l) => l.data === date && l.projectId === projectId)
        if (existing) {
          existing.triagem = triagem
        } else {
          this.lancamentos.push({ data: date, projectId, projectName, triagem })
        }
      } catch (e) {
        this.error = e.message
        throw e
      } finally {
        this.saving = false
      }
    },
  },
})
