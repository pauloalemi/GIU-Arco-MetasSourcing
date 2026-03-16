<template>
  <div>
    <!-- Cabeçalho -->
    <div class="d-flex align-center mb-6">
      <div>
        <h2 class="text-h5 font-weight-bold">{{ project?.name }}</h2>
        <p class="text-body-2 text-medium-emphasis">Registre os resultados do dia.</p>
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

    <v-alert v-if="lancamentosStore.error" type="error" variant="tonal" class="mb-4" closable @click:close="lancamentosStore.error = null">
      {{ lancamentosStore.error }}
    </v-alert>

    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else-if="project">
      <v-card rounded="lg" elevation="2">
        <!-- Cabeçalho da tabela -->
        <div class="d-flex align-center px-4 py-2 bg-grey-lighten-4 text-caption text-medium-emphasis font-weight-medium">
          <div style="width: 160px">Métrica</div>
          <div style="width: 180px">Realizado</div>
          <div class="flex-grow-1">Progresso</div>
        </div>

        <v-divider />

        <!-- Linha: Triagem -->
        <div class="d-flex align-center px-4 py-3">
          <div style="width: 160px">
            <div class="text-body-2 font-weight-medium">Triagens</div>
            <div v-if="meta" class="text-caption text-medium-emphasis">
              Meta: {{ meta.triagem }} / {{ cadenciaLabel }}
            </div>
          </div>

          <div style="width: 180px">
            <v-text-field
              v-model.number="form.triagem"
              type="number"
              min="0"
              variant="outlined"
              density="compact"
              hide-details
              suffix="triagens"
              style="max-width: 160px"
            />
          </div>

          <div class="flex-grow-1 d-flex align-center" style="gap: 12px">
            <v-progress-linear
              v-if="meta"
              :model-value="progressoPct"
              :color="progressoColor"
              rounded
              height="8"
              class="flex-grow-1"
            />
            <span v-if="meta" class="text-caption text-medium-emphasis" style="min-width: 36px">
              {{ progressoPct }}%
            </span>
            <span v-if="!meta" class="text-caption text-medium-emphasis">Sem meta definida</span>
          </div>
        </div>

        <!-- Futuras métricas virão aqui como novas linhas -->

        <v-divider />

        <div class="d-flex justify-end px-4 py-3">
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="form.triagem === null || form.triagem === undefined"
            @click="salvar"
          >
            Salvar
          </v-btn>
        </div>
      </v-card>
    </template>

    <v-empty-state
      v-else
      icon="mdi-briefcase-outline"
      title="Projeto não encontrado"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
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
const form = reactive({ triagem: null })
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
  return Math.min(100, Math.round(((form.triagem || 0) / meta.value.triagem) * 100))
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
  form.triagem = lancamento ? lancamento.triagem : null
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
  if (!project.value || form.triagem === null) return
  saving.value = true
  try {
    await lancamentosStore.save(selectedDate.value, project.value.id, project.value.name, form.triagem)
  } finally {
    saving.value = false
  }
}
</script>
