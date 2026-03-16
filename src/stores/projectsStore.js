import { defineStore } from 'pinia'
import { useGoogleStore } from './googleStore'
import { readSheet, appendRows, updateRange } from '../services/sheetsData'

const SHEET = '_projetos'

function parseProjects(rows) {
  if (rows.length <= 1) return []
  return rows.slice(1).map((row, index) => ({
    rowIndex: index + 2, // linha real na planilha (1-indexed + header)
    id: row[0] || '',
    name: row[1] || '',
    status: row[2] || 'ativo',
    users: row[3] ? row[3].split(',').filter(Boolean) : [],
  }))
}

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects: [],
    loading: false,
    error: null,
  }),

  getters: {
    active: (state) => state.projects.filter((p) => p.status === 'ativo'),
    archived: (state) => state.projects.filter((p) => p.status === 'arquivado'),
  },

  actions: {
    async fetchProjects() {
      const google = useGoogleStore()
      this.loading = true
      this.error = null
      try {
        const rows = await readSheet(google.accessToken, SHEET)
        this.projects = parseProjects(rows)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async createProject(name) {
      const google = useGoogleStore()
      this.loading = true
      this.error = null
      try {
        const id = Date.now().toString()
        await appendRows(google.accessToken, SHEET, [[id, name, 'ativo', '']])
        await this.fetchProjects()
      } catch (e) {
        this.error = e.message
        throw e
      } finally {
        this.loading = false
      }
    },

    async renameProject(project, newName) {
      const google = useGoogleStore()
      this.loading = true
      this.error = null
      try {
        await updateRange(google.accessToken, `${SHEET}!B${project.rowIndex}`, [[newName]])
        project.name = newName
      } catch (e) {
        this.error = e.message
        throw e
      } finally {
        this.loading = false
      }
    },

    async setStatus(project, status) {
      const google = useGoogleStore()
      this.loading = true
      this.error = null
      try {
        await updateRange(google.accessToken, `${SHEET}!C${project.rowIndex}`, [[status]])
        project.status = status
      } catch (e) {
        this.error = e.message
        throw e
      } finally {
        this.loading = false
      }
    },

    async updateAssignments(project, users) {
      const google = useGoogleStore()
      this.loading = true
      this.error = null
      try {
        await updateRange(google.accessToken, `${SHEET}!D${project.rowIndex}`, [[users.join(',')]])
        project.users = users
      } catch (e) {
        this.error = e.message
        throw e
      } finally {
        this.loading = false
      }
    },
  },
})
