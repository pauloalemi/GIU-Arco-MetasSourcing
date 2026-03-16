import { readSheet, appendRows, updateRange } from './sheetsData'

const SHEET = '_usuarios'
const REGISTRY_KEY = 'users_registry'

// ─── Registry local (localStorage) ───────────────────────────────────────────

export function loadRegistry() {
  const stored = localStorage.getItem(REGISTRY_KEY)
  return stored ? JSON.parse(stored) : {}
}

function saveRegistry(registry) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry))
}

// Sincroniza _usuarios (planilha) → localStorage
export async function syncRegistry(token) {
  const rows = await readSheet(token, SHEET).catch(() => [])
  const registry = {}
  rows.slice(1).forEach((row) => {
    if (row[0]) {
      registry[row[0]] = { password: row[1] || '', role: row[2] || 'user', name: row[3] || '' }
    }
  })
  saveRegistry(registry)
  return registry
}

// ─── CRUD na planilha ─────────────────────────────────────────────────────────

export async function addUsuario(token, username, password, role, name) {
  await appendRows(token, SHEET, [[username, password, role, name]])
  const registry = loadRegistry()
  registry[username] = { password, role, name }
  saveRegistry(registry)
}

export async function updateSenha(token, username, password) {
  const rows = await readSheet(token, SHEET).catch(() => [])
  const index = rows.slice(1).findIndex((r) => r[0] === username)
  if (index >= 0) {
    await updateRange(token, `${SHEET}!B${index + 2}`, [[password]])
  }
  const registry = loadRegistry()
  if (registry[username]) {
    registry[username].password = password
    saveRegistry(registry)
  }
}

export async function updateNome(token, username, name) {
  const rows = await readSheet(token, SHEET).catch(() => [])
  const index = rows.slice(1).findIndex((r) => r[0] === username)
  if (index >= 0) {
    await updateRange(token, `${SHEET}!D${index + 2}`, [[name]])
  }
  const registry = loadRegistry()
  if (registry[username]) {
    registry[username].name = name
    saveRegistry(registry)
  }
}

export async function removeUsuario(token, username) {
  const rows = await readSheet(token, SHEET).catch(() => [])
  const index = rows.slice(1).findIndex((r) => r[0] === username)
  if (index >= 0) {
    // Limpa a linha (não deleta para evitar complexidade com a API)
    await updateRange(token, `${SHEET}!A${index + 2}:D${index + 2}`, [['', '', '', '']])
  }
  const registry = loadRegistry()
  delete registry[username]
  saveRegistry(registry)
}
