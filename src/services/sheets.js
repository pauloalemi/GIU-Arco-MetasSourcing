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

// Lista todas as abas da planilha
export async function listSheets(token) {
  const data = await request(`${BASE_URL}/${SPREADSHEET_ID}?fields=sheets.properties`, token)
  return data.sheets
    .map((s) => ({ id: s.properties.sheetId, name: s.properties.title }))
    .filter((s) => !s.name.startsWith('_'))
}

// Cria uma nova aba
export async function createSheet(token, name) {
  const body = {
    requests: [{ addSheet: { properties: { title: name } } }],
  }
  const data = await request(`${BASE_URL}/${SPREADSHEET_ID}:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const props = data.replies[0].addSheet.properties
  return { id: props.sheetId, name: props.title }
}

// Renomeia uma aba
export async function renameSheet(token, sheetId, newName) {
  const body = {
    requests: [
      {
        updateSheetProperties: {
          properties: { sheetId, title: newName },
          fields: 'title',
        },
      },
    ],
  }
  await request(`${BASE_URL}/${SPREADSHEET_ID}:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// Lista TODAS as abas sem filtro (uso interno)
async function listAllSheets(token) {
  const data = await request(`${BASE_URL}/${SPREADSHEET_ID}?fields=sheets.properties`, token)
  return data.sheets.map((s) => ({ id: s.properties.sheetId, name: s.properties.title }))
}

// Garante que abas de configuração existam com seus cabeçalhos
export async function initConfigSheets(token) {
  const all = await listAllSheets(token)
  const names = all.map((s) => s.name)

  const { appendRows } = await import('./sheetsData')

  if (!names.includes('_projetos')) {
    await createSheet(token, '_projetos')
    await appendRows(token, '_projetos', [['id', 'nome', 'status', 'usuarios']])
  }

  if (!names.includes('_metas')) {
    await createSheet(token, '_metas')
    await appendRows(token, '_metas', [['projeto_id', 'projeto_nome', 'cadencia', 'triagem']])
  }

  if (!names.includes('_usuarios')) {
    await createSheet(token, '_usuarios')
    await appendRows(token, '_usuarios', [['username', 'password', 'role', 'name']])
  }
}

// Deleta uma aba
export async function deleteSheet(token, sheetId) {
  const body = {
    requests: [{ deleteSheet: { sheetId } }],
  }
  await request(`${BASE_URL}/${SPREADSHEET_ID}:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
