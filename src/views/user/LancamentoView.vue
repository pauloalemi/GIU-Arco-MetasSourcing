<template>
  <div>
    <!-- Conectar ao Google -->
    <v-banner v-if="!google.isConnected" color="warning" icon="mdi-google" class="mb-4">
      <template #text>Conecte sua conta Google para registrar suas triagens.</template>
      <template #actions>
        <v-btn variant="flat" color="warning" @click="connect" :loading="connecting">
          Conectar Google Sheets
        </v-btn>
      </template>
    </v-banner>

    <!-- Cabeçalho -->
    <div class="d-flex align-center mb-6">
      <div>
        <h2 class="text-h5 font-weight-bold">Lançar Triagens</h2>
        <p class="text-body-2 text-medium-emphasis">Registre as triagens realizadas por projeto.</p>
      </div>
      <v-spacer />
      <v-text-field
        v-model="selectedDate"
        type="date"
        variant="outlined"
        density="compact"
        hide-details
        style="max-width: 180px"
      />
    </div>

    <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4" closable @click:close="store.error = null">
      {{ store.error }}
    </v-alert>

    <!-- Loading -->
    <div v-if="store.loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else>
      <!-- Projetos atribuídos -->
      <v-row v-if="assignedProjects.length">
        <v-col v-for="project in assignedProjects" :key="project.id" cols="12" sm="6" md="4">
          <v-card rounded="lg" elevation="2">
            <v-card-text>
              <div class="d-flex align-center mb-4">
                <v-icon color="primary" class="mr-2">mdi-briefcase-outline</v-icon>
                <span class="font-weight-medium">{{ project.name }}</span>
              </div>

              <!-- Metas -->
              <div v-if="getMeta(project.id)" class="d-flex flex-wrap gap-2 mb-3">
                <v-chip v-if="getMeta(project.id).triagem" size="small" color="primary" variant="tonal">
                  Meta: {{ getMeta(project.id).triagem }} triagens / {{ cadenciaLabel(getMeta(project.id).cadencia) }}
                </v-chip>
                <v-chip v-if="getMeta(project.id).abordados" size="small" color="secondary" variant="tonal">
                  Meta: {{ getMeta(project.id).abordados }} abordados / {{ cadenciaLabel(getMeta(project.id).cadencia) }}
                </v-chip>
              </div>

              <!-- Inputs -->
              <v-text-field
                v-model.number="form[project.id].triagem"
                label="Triagens realizadas"
                type="number"
                min="0"
                variant="outlined"
                density="compact"
                suffix="triagens"
                hide-details
                class="mb-3"
              />
              <v-text-field
                v-model.number="form[project.id].abordados"
                label="Abordados"
                type="number"
                min="0"
                variant="outlined"
                density="compact"
                suffix="abordados"
                hide-details
              />

              <!-- Progresso triagens -->
              <div v-if="getMeta(project.id)?.triagem && form[project.id].triagem >= 0" class="mt-3">
                <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
                  <span>Triagens</span>
                  <span>{{ progressoPct(project.id, 'triagem') }}%</span>
                </div>
                <v-progress-linear
                  :model-value="progressoPct(project.id, 'triagem')"
                  :color="progressoColor(project.id, 'triagem')"
                  rounded
                  height="6"
                />
              </div>

              <!-- Progresso abordados -->
              <div v-if="getMeta(project.id)?.abordados && form[project.id].abordados >= 0" class="mt-2">
                <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
                  <span>Abordados</span>
                  <span>{{ progressoPct(project.id, 'abordados') }}%</span>
                </div>
                <v-progress-linear
                  :model-value="progressoPct(project.id, 'abordados')"
                  :color="progressoColor(project.id, 'abordados')"
                  rounded
                  height="6"
                />
              </div>
            </v-card-text>
            <v-card-actions class="px-4 pb-4 pt-0">
              <v-spacer />
              <v-btn
                color="primary"
                variant="flat"
                size="small"
                :loading="saving[project.id]"
                :disabled="form[project.id].triagem === null && form[project.id].abordados === null"
                @click="salvar(project)"
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
        title="Nenhum projeto atribuído"
        text="Aguarde o administrador atribuir projetos ao seu perfil."
      />
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useProjectsStore } from '../../stores/projectsStore'
import { useMetasStore } from '../../stores/metasStore'
import { useLancamentosStore } from '../../stores/lancamentosStore'
import { useGoogleStore } from '../../stores/googleStore'
import { initConfigSheets } from '../../services/sheets'

const auth = useAuthStore()
const google = useGoogleStore()
const projectsStore = useProjectsStore()
const metasStore = useMetasStore()
const store = useLancamentosStore()

const saving = reactive({})
const connecting = ref(false)

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)
const form = reactive({})

const assignedProjects = computed(() =>
  projectsStore.active.filter((p) => p.users.includes(auth.user?.name))
)

function getMeta(projectId) {
  return metasStore.metas.find((m) => m.projectId === projectId)
}

function cadenciaLabel(c) {
  return c === 'diaria' ? 'dia' : 'semana'
}

function progressoPct(projectId, campo) {
  const meta = getMeta(projectId)
  if (!meta || !meta[campo]) return 0
  return Math.min(100, Math.round(((form[projectId][campo] || 0) / meta[campo]) * 100))
}

function progressoColor(projectId, campo) {
  const pct = progressoPct(projectId, campo)
  if (pct >= 100) return 'success'
  if (pct >= 60) return 'warning'
  return 'error'
}

function preencherForm(date) {
  assignedProjects.value.forEach((p) => {
    const lancamento = store.lancamentos.find((l) => l.data === date && l.projectId === p.id)
    form[p.id] = {
      triagem: lancamento ? lancamento.triagem : null,
      abordados: lancamento ? lancamento.abordados : null,
    }
  })
}

watch(selectedDate, preencherForm)
watch(assignedProjects, () => preencherForm(selectedDate.value))
watch(() => store.lancamentos, () => preencherForm(selectedDate.value))

onMounted(async () => {
  await google.init()
  if (google.isConnected) {
    await initConfigSheets(google.accessToken)
    await Promise.all([
      projectsStore.fetchProjects(),
      metasStore.fetchMetas(),
      store.init(),
    ])
    preencherForm(selectedDate.value)
  }
})

async function connect() {
  connecting.value = true
  try {
    await google.requestToken()
    await initConfigSheets(google.accessToken)
    await Promise.all([
      projectsStore.fetchProjects(),
      metasStore.fetchMetas(),
      store.init(),
    ])
    preencherForm(selectedDate.value)
  } finally {
    connecting.value = false
  }
}

async function salvar(project) {
  const f = form[project.id]
  if (f.triagem === null && f.abordados === null) return
  saving[project.id] = true
  try {
    await store.save(selectedDate.value, project.id, project.name, f.triagem || 0, f.abordados || 0)
  } finally {
    saving[project.id] = false
  }
}
</script>
