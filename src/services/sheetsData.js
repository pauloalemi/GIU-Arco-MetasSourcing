import { SPREADSHEET_ID } from '../config'

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets'

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function request(url, token, options = {}) {
  const res = await fetch(url, { ...options, headers: headers(token) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Erro ${res.status}`)
  }
  return res.json()
}

export async function readSheet(token, sheetName) {
  const url = `${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}`
  const data = await request(url, token)
  return data.values || []
}

export async function appendRows(token, sheetName, values) {
  const url = `${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
  return request(url, token, { method: 'POST', body: JSON.stringify({ values }) })
}

export async function updateRange(token, range, values) {
  const url = `${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
  return request(url, token, { method: 'PUT', body: JSON.stringify({ values }) })
}
