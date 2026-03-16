<template>
  <!-- Conectar ao Google -->
  <v-banner v-if="!google.isConnected" color="warning" icon="mdi-google" class="mb-4">
    <template #text>Conecte sua conta Google para gerenciar as metas.</template>
    <template #actions>
      <v-btn variant="flat" color="warning" @click="connect" :loading="connecting">
        Conectar Google Sheets
      </v-btn>
    </template>
  </v-banner>

  <!-- Cabeçalho -->
  <div class="mb-6">
    <h2 class="text-h5 font-weight-bold">Metas</h2>
    <p class="text-body-2 text-medium-emphasis">Defina as metas por projeto e parâmetro.</p>
  </div>

  <v-alert v-if="metasStore.error" type="error" variant="tonal" class="mb-4" closable @click:close="metasStore.error = null">
    {{ metasStore.error }}
  </v-alert>

  <!-- Seletor de projeto -->
  <v-select
    v-model="selectedProjectId"
    :items="projectItems"
    label="Selecione um projeto"
    variant="outlined"
    density="compact"
    clearable
    style="max-width: 360px"
    class="mb-6"
    :disabled="!google.isConnected"
  />

  <!-- Tabela de parâmetros -->
  <v-card v-if="selectedProject" rounded="lg" elevation="2">
    <!-- Cabeçalho -->
    <div class="d-flex align-center px-4 py-2 bg-grey-lighten-4 text-caption text-medium-emphasis font-weight-medium">
      <div style="width: 160px">Parâmetro</div>
      <div style="width: 180px">Cadência</div>
      <div class="flex-grow-1">Meta</div>
      <div style="width: 80px"></div>
    </div>

    <v-divider />

    <!-- Linha por parâmetro -->
    <div
      v-for="param in parametros"
      :key="param.key"
      class="d-flex align-center px-4 py-3"
    >
      <div style="width: 160px">
        <div class="text-body-2 font-weight-medium">{{ param.label }}</div>
        <v-chip
          v-if="getMeta(param.key)"
          size="x-small"
          color="success"
          variant="tonal"
          class="mt-1"
        >
          Configurado
        </v-chip>
        <v-chip v-else size="x-small" color="warning" variant="tonal" class="mt-1">
          Sem meta
        </v-chip>
      </div>

      <div style="width: 180px">
        <v-select
          v-model="form[param.key].cadencia"
          :items="cadencias"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 160px"
        />
      </div>

      <div class="flex-grow-1">
        <v-text-field
          v-model.number="form[param.key].valor"
          type="number"
          min="1"
          variant="outlined"
          density="compact"
          hide-details
          :suffix="param.suffix"
          style="max-width: 200px"
        />
      </div>

      <div class="d-flex align-center justify-end" style="width: 100px; gap: 6px">
        <v-btn
          v-if="getMeta(param.key)"
          icon="mdi-delete"
          variant="text"
          size="small"
          color="error"
          :loading="removing[param.key]"
          @click="remover(param)"
        />
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          :loading="saving[param.key]"
          :disabled="!form[param.key].valor"
          @click="salvar(param)"
        >
          Salvar
        </v-btn>
      </div>
    </div>
  </v-card>

  <div v-else-if="google.isConnected && !selectedProjectId" class="text-body-2 text-medium-emphasis">
    Selecione um projeto para configurar as metas.
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useGoogleStore } from '../../stores/googleStore'
import { useProjectsStore } from '../../stores/projectsStore'
import { useMetasStore } from '../../stores/metasStore'
import { initConfigSheets } from '../../services/sheets'

const google = useGoogleStore()
const projectsStore = useProjectsStore()
const metasStore = useMetasStore()

const connecting = ref(false)
const saving = reactive({})
const removing = reactive({})
const selectedProjectId = ref(null)
const form = reactive({})

// Parâmetros disponíveis — adicionar aqui quando houver novos
const parametros = [
  { key: 'triagem', label: 'Triagens', suffix: 'triagens' },
  { key: 'abordados', label: 'Abordados', suffix: 'abordados' },
]

const cadencias = [
  { title: 'Diária', value: 'diaria' },
  { title: 'Semanal', value: 'semanal' },
]

const projectItems = computed(() =>
  projectsStore.active
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
    .map((p) => ({ title: p.name, value: p.id }))
)

const selectedProject = computed(() =>
  projectsStore.active.find((p) => p.id === selectedProjectId.value)
)

function getMeta(paramKey) {
  const meta = metasStore.metas.find((m) => m.projectId === selectedProjectId.value)
  return meta?.[paramKey] ? meta : null
}

function initForm() {
  parametros.forEach((param) => {
    const meta = getMeta(param.key)
    form[param.key] = {
      cadencia: meta?.cadencia || 'semanal',
      valor: meta?.[param.key] || null,
    }
  })
}

watch(selectedProjectId, initForm)
watch(() => metasStore.metas, initForm)

onMounted(async () => {
  await google.init()
  if (google.isConnected) {
    await initConfigSheets(google.accessToken)
    await Promise.all([projectsStore.fetchProjects(), metasStore.fetchMetas()])
  }
})

async function connect() {
  connecting.value = true
  try {
    await google.requestToken()
    await initConfigSheets(google.accessToken)
    await Promise.all([projectsStore.fetchProjects(), metasStore.fetchMetas()])
  } finally {
    connecting.value = false
  }
}

async function remover(param) {
  if (!selectedProject.value) return
  removing[param.key] = true
  try {
    await metasStore.removeMeta(selectedProject.value.id)
    form[param.key] = { cadencia: 'semanal', valor: null }
  } finally {
    removing[param.key] = false
  }
}

async function salvar(param) {
  if (!selectedProject.value || !form[param.key].valor) return
  saving[param.key] = true
  try {
    await metasStore.saveMeta(
      selectedProject.value.id,
      selectedProject.value.name,
      form[param.key].cadencia,
      form['triagem'].valor || 0,
      form['abordados'].valor || 0,
    )
  } finally {
    saving[param.key] = false
  }
}
</script>
