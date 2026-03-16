<template>
  <div>
    <div class="mb-6">
      <h2 class="text-h5 font-weight-bold">{{ project?.name }}</h2>
      <p class="text-body-2 text-medium-emphasis">Registre as triagens realizadas neste projeto.</p>
    </div>

    <v-alert v-if="lancamentosStore.error" type="error" variant="tonal" class="mb-4" closable @click:close="lancamentosStore.error = null">
      {{ lancamentosStore.error }}
    </v-alert>

    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else-if="project">
      <v-row>
        <v-col cols="12" md="5">
          <v-card rounded="lg" elevation="2">
            <v-card-text>
              <!-- Seletor de data -->
              <v-text-field
                v-model="selectedDate"
                type="date"
                label="Data"
                variant="outlined"
                density="compact"
                class="mb-4"
                hide-details
              />

              <!-- Meta -->
              <div v-if="meta" class="mb-4">
                <v-chip color="primary" variant="tonal" size="small">
                  Meta: {{ meta.triagem }} triagens / {{ cadenciaLabel }}
                </v-chip>
              </div>

              <!-- Input de triagem -->
              <v-text-field
                v-model.number="triagem"
                label="Triagens realizadas"
                type="number"
                min="0"
                variant="outlined"
                density="compact"
                suffix="triagens"
                hide-details
                class="mb-4"
              />

              <!-- Progresso -->
              <div v-if="meta && triagem >= 0" class="mb-4">
                <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
                  <span>Progresso</span>
                  <span>{{ progressoPct }}%</span>
                </div>
                <v-progress-linear
                  :model-value="progressoPct"
                  :color="progressoColor"
                  rounded
                  height="8"
                />
              </div>

              <v-btn
                color="primary"
                variant="flat"
                block
                :loading="saving"
                :disabled="triagem === null || triagem === undefined"
                @click="salvar"
              >
                Salvar
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <v-empty-state
      v-else
      icon="mdi-briefcase-outline"
      title="Projeto não encontrado"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useProjectsStore } from '../../stores/projectsStore'
import { useMetasStore } from '../../stores/metasStore'
import { useLancamentosStore } from '../../stores/lancamentosStore'
import { useGoogleStore } from '../../stores/googleStore'
import { initConfigSheets } from '../../services/sheets'

const route = useRoute()
const auth = useAuthStore()
const google = useGoogleStore()
const projectsStore = useProjectsStore()
const metasStore = useMetasStore()
const lancamentosStore = useLancamentosStore()

const saving = ref(false)
const triagem = ref(null)
const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)

const loading = computed(() => projectsStore.loading || metasStore.loading || lancamentosStore.loading)

const project = computed(() =>
  projectsStore.active.find((p) => p.id === route.params.projectId)
)

const meta = computed(() =>
  metasStore.metas.find((m) => m.projectId === route.params.projectId)
)

const cadenciaLabel = computed(() =>
  meta.value?.cadencia === 'diaria' ? 'dia' : 'semana'
)

const progressoPct = computed(() => {
  if (!meta.value?.triagem) return 0
  return Math.min(100, Math.round(((triagem.value || 0) / meta.value.triagem) * 100))
})

const progressoColor = computed(() => {
  if (progressoPct.value >= 100) return 'success'
  if (progressoPct.value >= 60) return 'warning'
  return 'error'
})

function preencherForm(date) {
  const lancamento = lancamentosStore.lancamentos.find(
    (l) => l.data === date && l.projectId === route.params.projectId
  )
  triagem.value = lancamento ? lancamento.triagem : null
}

watch(selectedDate, preencherForm)
watch(() => lancamentosStore.lancamentos, () => preencherForm(selectedDate.value))
watch(() => route.params.projectId, () => preencherForm(selectedDate.value))

onMounted(async () => {
  await google.init()
  if (google.isConnected) {
    await initConfigSheets(google.accessToken)
    await Promise.all([
      projectsStore.fetchProjects(),
      metasStore.fetchMetas(),
      lancamentosStore.init(),
    ])
    preencherForm(selectedDate.value)
  }
})

async function salvar() {
  if (!project.value || triagem.value === null) return
  saving.value = true
  try {
    await lancamentosStore.save(selectedDate.value, project.value.id, project.value.name, triagem.value)
  } finally {
    saving.value = false
  }
}
</script>
