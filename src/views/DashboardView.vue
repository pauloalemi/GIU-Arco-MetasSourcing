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
              >
                <template #prepend>
                  <v-icon size="18" class="mr-2">mdi-briefcase-outline</v-icon>
                </template>
                <v-list-item-title class="text-truncate">{{ project.name }}</v-list-item-title>
              </v-list-item>
            </template>
          </v-tooltip>
          <v-list-item
            v-if="!assignedProjects.length"
            disabled
            rounded="lg"
          >
            <template #prepend>
              <v-icon size="18" class="mr-2">mdi-briefcase-off-outline</v-icon>
            </template>
            <v-list-item-title>Nenhum projeto</v-list-item-title>
          </v-list-item>
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
import TrocarSenhaDialog from '../components/TrocarSenhaDialog.vue'

const router = useRouter()
const auth = useAuthStore()
const google = useGoogleStore()
const projectsStore = useProjectsStore()
const senhaDialog = ref(false)
const connecting = ref(false)

const assignedProjects = computed(() =>
  projectsStore.active
    .filter((p) => p.users.includes(auth.user?.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
)

onMounted(async () => {
  await google.init()
})

watch(() => google.isConnected, async (connected) => {
  if (connected && !auth.isAdmin) {
    await projectsStore.fetchProjects()
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
