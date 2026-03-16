<template>
  <v-app-bar color="primary" elevation="2">
    <v-app-bar-title>Metas Sourcing</v-app-bar-title>
    <v-spacer />
    <span class="mr-2 text-body-2">{{ auth.user?.name }}</span>
    <v-btn v-if="google.isConnected" icon @click="senhaDialog = true">
      <v-icon>mdi-lock-reset</v-icon>
    </v-btn>
    <v-btn icon @click="handleLogout">
      <v-icon>mdi-logout</v-icon>
    </v-btn>
  </v-app-bar>

  <TrocarSenhaDialog
    v-model="senhaDialog"
    :username="auth.user?.username || ''"
    :display-name="auth.user?.name || ''"
    :require-actual="true"
  />

  <v-navigation-drawer permanent width="220">
    <v-list nav class="mt-2">
      <!-- Menu do usuário comum -->
      <template v-if="!auth.isAdmin">
        <!-- Data picker -->
        <div class="px-3 pt-1 pb-2">
          <v-text-field
            v-model="lancamentosStore.selectedDate"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </div>
        <v-list-subheader>Meus Projetos</v-list-subheader>
        <template v-if="google.isConnected">
          <v-tooltip
            v-for="project in assignedProjects"
            :key="project.id"
            :text="project.name"
            location="right"
          >
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                :to="{ name: 'Projeto', params: { projectId: project.id } }"
                rounded="lg"
                class="px-3"
              >
                <div class="d-flex align-center" style="gap: 8px; min-width: 0">
                  <v-icon size="18" style="flex-shrink: 0">mdi-briefcase-outline</v-icon>
                  <span class="text-truncate text-body-2 flex-grow-1">{{ project.name }}</span>
                  <v-icon
                    v-if="projectStatus(project.id) === 'ok'"
                    size="16"
                    color="success"
                    style="flex-shrink: 0"
                  >mdi-check-circle</v-icon>
                  <v-icon
                    v-else-if="projectStatus(project.id) === 'warning'"
                    size="16"
                    color="warning"
                    style="flex-shrink: 0"
                  >mdi-alert</v-icon>
                </div>
              </v-list-item>
            </template>
          </v-tooltip>
          <div v-if="!assignedProjects.length" class="px-3 py-2 d-flex align-center text-medium-emphasis" style="gap: 8px">
            <v-icon size="18">mdi-briefcase-off-outline</v-icon>
            <span class="text-body-2">Nenhum projeto</span>
          </div>
        </template>
      </template>

      <!-- Menu do admin -->
      <template v-else>
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="Início"
          :to="{ name: 'Dashboard' }"
          rounded="lg"
        />
        <v-divider class="my-2" />
        <v-list-subheader>Administração</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-account-group"
          title="Usuários"
          :to="{ name: 'AdminUsers' }"
          rounded="lg"
          :disabled="!google.isConnected"
        />
        <v-list-item
          prepend-icon="mdi-briefcase-outline"
          title="Projetos"
          :to="{ name: 'AdminProjects' }"
          rounded="lg"
          :disabled="!google.isConnected"
        />
        <v-list-item
          prepend-icon="mdi-target"
          title="Metas"
          :to="{ name: 'AdminMetas' }"
          rounded="lg"
          :disabled="!google.isConnected"
        />
      </template>
    </v-list>

    <!-- Banner de conexão no rodapé do menu -->
    <template #append>
      <div v-if="!google.isConnected" class="pa-3">
        <v-btn
          block
          color="warning"
          variant="flat"
          prepend-icon="mdi-google"
          :loading="connecting"
          @click="connect"
        >
          Conectar Google
        </v-btn>
      </div>
      <div v-else class="pa-3">
        <v-chip block color="success" variant="tonal" prepend-icon="mdi-check-circle" class="w-100">
          Google conectado
        </v-chip>
      </div>
    </template>
  </v-navigation-drawer>

  <v-main>
    <v-container class="pa-6">
      <!-- Banner no topo do conteúdo se não conectado -->
      <v-alert
        v-if="!google.isConnected"
        type="warning"
        variant="tonal"
        class="mb-6"
        icon="mdi-google"
      >
        <div class="d-flex align-center justify-space-between flex-wrap gap-2">
          <span>Conecte sua conta Google para usar o app.</span>
          <v-btn color="warning" variant="flat" size="small" :loading="connecting" @click="connect">
            Conectar agora
          </v-btn>
        </div>
      </v-alert>

      <router-view />
    </v-container>
  </v-main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useGoogleStore } from '../stores/googleStore'
import { useProjectsStore } from '../stores/projectsStore'
import { useMetasStore } from '../stores/metasStore'
import { useLancamentosStore } from '../stores/lancamentosStore'
import { initConfigSheets } from '../services/sheets'
import TrocarSenhaDialog from '../components/TrocarSenhaDialog.vue'

const router = useRouter()
const auth = useAuthStore()
const google = useGoogleStore()
const projectsStore = useProjectsStore()
const metasStore = useMetasStore()
const lancamentosStore = useLancamentosStore()
const senhaDialog = ref(false)
const connecting = ref(false)

const assignedProjects = computed(() =>
  projectsStore.active
    .filter((p) => p.users.includes(auth.user?.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
)

function projectStatus(projectId) {
  const meta = metasStore.metas.find((m) => m.projectId === projectId)
  if (!meta) return null
  const lancamento = lancamentosStore.lancamentos.find(
    (l) => l.data === lancamentosStore.selectedDate && l.projectId === projectId
  )
  const trigemOk = !meta.triagem || (lancamento && lancamento.triagem > 0)
  const abordadosOk = !meta.abordados || (lancamento && lancamento.abordados > 0)
  return trigemOk && abordadosOk ? 'ok' : 'warning'
}

onMounted(async () => {
  await google.init()
})

watch(() => google.isConnected, async (connected) => {
  if (connected && !auth.isAdmin) {
    await initConfigSheets(google.accessToken)
    await Promise.all([
      projectsStore.fetchProjects(),
      metasStore.fetchMetas(),
      lancamentosStore.init(),
    ])
  }
}, { immediate: true })

async function connect() {
  connecting.value = true
  try {
    await google.requestToken()
  } finally {
    connecting.value = false
  }
}

function handleLogout() {
  auth.logout()
  router.push({ name: 'Login' })
}
</script>
