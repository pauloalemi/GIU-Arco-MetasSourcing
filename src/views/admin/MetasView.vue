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
    <p class="text-body-2 text-medium-emphasis">
      Defina as metas de triagem por projeto.
    </p>
  </div>

  <v-alert v-if="metasStore.error" type="error" variant="tonal" class="mb-4" closable @click:close="metasStore.error = null">
    {{ metasStore.error }}
  </v-alert>

  <div v-if="loading" class="d-flex justify-center py-12">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <template v-else>
    <v-row v-if="projectsStore.active.length">
      <v-col v-for="project in projectsStore.active" :key="project.id" cols="12" sm="6" md="4">
        <v-card rounded="lg" elevation="2">
          <v-card-text>
            <div class="d-flex align-center mb-4">
              <v-icon color="primary" class="mr-2">mdi-briefcase-outline</v-icon>
              <span class="font-weight-medium">{{ project.name }}</span>
              <v-spacer />
              <v-chip
                size="small"
                :color="getMeta(project.id) ? 'success' : 'warning'"
                variant="tonal"
              >
                {{ getMeta(project.id) ? 'Configurado' : 'Sem meta' }}
              </v-chip>
            </div>

            <v-select
              v-model="form[project.id].cadencia"
              label="Cadência"
              :items="cadencias"
              variant="outlined"
              density="compact"
              class="mb-3"
            />

            <v-text-field
              v-model.number="form[project.id].triagem"
              label="Meta de triagens"
              type="number"
              min="1"
              variant="outlined"
              density="compact"
              suffix="triagens"
            />
          </v-card-text>
          <v-card-actions class="px-4 pb-4 pt-0">
            <v-spacer />
            <v-btn
              color="primary"
              variant="flat"
              size="small"
              :loading="saving[project.id]"
              :disabled="!form[project.id].triagem"
              @click="save(project)"
            >
              Salvar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-empty-state
      v-else
      icon="mdi-briefcase-outline"
      title="Nenhum projeto ativo"
      text="Crie projetos na seção Projetos para configurar as metas."
    />
  </template>
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
const form = reactive({})

const cadencias = [
  { title: 'Diária', value: 'diaria' },
  { title: 'Semanal', value: 'semanal' },
]

const loading = computed(() => projectsStore.loading || metasStore.loading)

function getMeta(projectId) {
  return metasStore.metas.find((m) => m.projectId === projectId)
}

function initForm() {
  projectsStore.active.forEach((project) => {
    const meta = getMeta(project.id)
    form[project.id] = {
      cadencia: meta?.cadencia || 'semanal',
      triagem: meta?.triagem || null,
    }
  })
}

watch(() => projectsStore.active, initForm, { immediate: true })
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

async function save(project) {
  saving[project.id] = true
  try {
    await metasStore.saveMeta(
      project.id,
      project.name,
      form[project.id].cadencia,
      form[project.id].triagem
    )
  } finally {
    saving[project.id] = false
  }
}
</script>
