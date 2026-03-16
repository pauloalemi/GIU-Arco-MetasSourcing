import { defineStore } from 'pinia'
import { useGoogleStore } from './googleStore'
import { readSheet, appendRows, updateRange } from '../services/sheetsData'

const SHEET = '_metas'

function parseMetas(rows) {
  if (rows.length <= 1) return []
  return rows.slice(1).map((row, index) => ({
    rowIndex: index + 2,
    projectId: row[0] || '',
    projectName: row[1] || '',
    cadencia: row[2] || 'semanal',
    triagem: row[3] ? Number(row[3]) : 0,
  }))
}

export const useMetasStore = defineStore('metas', {
  state: () => ({
    metas: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchMetas() {
      const google = useGoogleStore()
      this.loading = true
      this.error = null
      try {
        const rows = await readSheet(google.accessToken, SHEET)
        this.metas = parseMetas(rows)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async saveMeta(projectId, projectName, cadencia, triagem) {
      const google = useGoogleStore()
      this.loading = true
      this.error = null
      try {
        const existing = this.metas.find((m) => m.projectId === projectId)
        if (existing) {
          await updateRange(
            google.accessToken,
            `${SHEET}!A${existing.rowIndex}:D${existing.rowIndex}`,
            [[projectId, projectName, cadencia, triagem]]
          )
          existing.projectName = projectName
          existing.cadencia = cadencia
          existing.triagem = triagem
        } else {
          await appendRows(google.accessToken, SHEET, [[projectId, projectName, cadencia, triagem]])
          await this.fetchMetas()
        }
      } catch (e) {
        this.error = e.message
        throw e
      } finally {
        this.loading = false
      }
    },
  },
})
