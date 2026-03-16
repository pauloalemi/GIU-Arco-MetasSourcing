import { readSheet, appendRows, updateRange } from './sheetsData'

// Inicializa a aba do usuário com cabeçalhos se estiver vazia
export async function initUserSheet(token, userName) {
  const rows = await readSheet(token, userName).catch(() => [])
  if (rows.length === 0) {
    await appendRows(token, userName, [['data', 'projeto_id', 'projeto_nome', 'triagem', 'abordados']])
  }
}

// Lê todos os lançamentos de um usuário
export async function readLancamentos(token, userName) {
  const rows = await readSheet(token, userName).catch(() => [])
  if (rows.length <= 1) return []
  return rows.slice(1).map((row, index) => ({
    rowIndex: index + 2,
    data: row[0] || '',
    projectId: row[1] || '',
    projectName: row[2] || '',
    triagem: row[3] ? Number(row[3]) : 0,
    abordados: row[4] ? Number(row[4]) : 0,
  }))
}

// Cria ou atualiza um lançamento (data + projeto)
export async function upsertLancamento(token, userName, data, projectId, projectName, triagem, abordados) {
  const rows = await readSheet(token, userName).catch(() => [])
  const dataRows = rows.slice(1)
  const existingIndex = dataRows.findIndex((r) => r[0] === data && r[1] === projectId)

  if (existingIndex >= 0) {
    const rowIndex = existingIndex + 2
    await updateRange(token, `${userName}!A${rowIndex}:E${rowIndex}`, [
      [data, projectId, projectName, triagem, abordados],
    ])
  } else {
    await appendRows(token, userName, [[data, projectId, projectName, triagem, abordados]])
  }
}
