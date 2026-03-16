import { defineStore } from 'pinia'
import { useGoogleStore } from './googleStore'
import * as sheetsService from '../services/sheets'
import { appendRows } from '../services/sheetsData'
import { addUsuario, removeUsuario, updateNome } from '../services/usuarios'

export const useUsersStore = defineStore('users', {
  state: () => ({
    users: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchUsers() {
      const google = useGoogleStore()
      this.loading = true
      this.error = null
      try {
        this.users = await sheetsService.listSheets(google.accessToken)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async createUser(name, username, password) {
      const google = useGoogleStore()
      this.loading = true
      this.error = null
      try {
        const newUser = await sheetsService.createSheet(google.accessToken, name)
        await appendRows(google.accessToken, name, [['data', 'projeto_id', 'projeto_nome', 'triagem']])
        await addUsuario(google.accessToken, username, password, 'user', name)
        this.users.push(newUser)
      } catch (e) {
        this.error = e.message
        throw e
      } finally {
        this.loading = false
      }
    },

    async renameUser(sheetId, newName, username) {
      const google = useGoogleStore()
      this.loading = true
      this.error = null
      try {
        await sheetsService.renameSheet(google.accessToken, sheetId, newName)
        if (username) await updateNome(google.accessToken, username, newName)
        const user = this.users.find((u) => u.id === sheetId)
        if (user) user.name = newName
      } catch (e) {
        this.error = e.message
        throw e
      } finally {
        this.loading = false
      }
    },

    async deleteUser(sheetId, username) {
      const google = useGoogleStore()
      this.loading = true
      this.error = null
      try {
        await sheetsService.deleteSheet(google.accessToken, sheetId)
        if (username) await removeUsuario(google.accessToken, username)
        this.users = this.users.filter((u) => u.id !== sheetId)
      } catch (e) {
        this.error = e.message
        throw e
      } finally {
        this.loading = false
      }
    },
  },
})
