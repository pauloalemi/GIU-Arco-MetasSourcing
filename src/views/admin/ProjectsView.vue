<template>
  <!-- Conectar ao Google -->
  <v-banner v-if="!google.isConnected" color="warning" icon="mdi-google" class="mb-4">
    <template #text>Conecte sua conta Google para gerenciar os projetos.</template>
    <template #actions>
      <v-btn variant="flat" color="warning" @click="connect" :loading="connecting">
        Conectar Google Sheets
      </v-btn>
    </template>
  </v-banner>

  <!-- Cabeçalho -->
  <div class="d-flex align-center mb-6">
    <div>
      <h2 class="text-h5 font-weight-bold">Projetos</h2>
      <p class="text-body-2 text-medium-emphasis">Gerencie os projetos e atribua usuários.</p>
    </div>
    <v-spacer />
    <v-btn color="primary" prepend-icon="mdi-plus" :disabled="!google.isConnected" @click="openCreate">
      Novo Projeto
    </v-btn>
  </div>

  <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4" closable @click:close="store.error = null">
    {{ store.error }}
  </v-alert>

  <div v-if="store.loading && !store.projects.length" class="d-flex justify-center py-12">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <template v-else>
    <!-- Projetos ativos -->
    <v-row>
      <v-col v-for="project in store.active" :key="project.id" cols="12" sm="6" md="4">
        <v-card rounded="lg" elevation="2">
          <v-card-text>
            <div class="d-flex align-center mb-3">
              <v-icon color="primary" class="mr-2">mdi-briefcase-outline</v-icon>
              <span class="font-weight-medium text-body-1">{{ project.name }}</span>
              <v-spacer />
              <v-menu>
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
                </template>
                <v-list density="compact">
                  <v-list-item prepend-icon="mdi-pencil" title="Renomear" @click="openRename(project)" />
                  <v-list-item prepend-icon="mdi-account-multiple" title="Atribuir usuários" @click="openAssign(project)" />
                  <v-divider />
                  <v-list-item prepend-icon="mdi-archive-arrow-down" title="Arquivar" @click="openArchive(project)" />
                </v-list>
              </v-menu>
            </div>

            <div v-if="project.users.length" class="d-flex flex-wrap gap-2">
              <v-chip v-for="u in project.users" :key="u" size="small" color="primary" variant="tonal" class="mr-2 mb-1">
                {{ u }}
              </v-chip>
            </div>
            <p v-else class="text-caption text-medium-emphasis">Nenhum usuário atribuído</p>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col v-if="!store.loading && !store.active.length" cols="12">
        <v-empty-state
          icon="mdi-briefcase-outline"
          title="Nenhum projeto ativo"
          text="Crie o primeiro projeto."
        />
      </v-col>
    </v-row>

    <!-- Projetos arquivados -->
    <template v-if="store.archived.length">
      <v-divider class="my-6" />
      <div class="d-flex align-center mb-4 cursor-pointer" @click="showArchived = !showArchived">
        <v-icon class="mr-2" :icon="showArchived ? 'mdi-chevron-down' : 'mdi-chevron-right'" />
        <span class="text-body-2 text-medium-emphasis font-weight-medium">
          Arquivados ({{ store.archived.length }})
        </span>
      </div>

      <v-row v-if="showArchived">
        <v-col v-for="project in store.archived" :key="project.id" cols="12" sm="6" md="4">
          <v-card rounded="lg" elevation="0" color="grey-lighten-3">
            <v-card-text>
              <div class="d-flex align-center">
                <v-icon color="grey" class="mr-2">mdi-archive-outline</v-icon>
                <span class="text-body-1 text-medium-emphasis">{{ project.name }}</span>
                <v-spacer />
                <v-btn
                  variant="text"
                  size="small"
                  color="primary"
                  @click="store.setStatus(project, 'ativo')"
                  :loading="store.loading"
                >
                  Reativar
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </template>

  <!-- Dialog: Criar -->
  <v-dialog v-model="createDialog.open" max-width="420" persistent>
    <v-card rounded="lg">
      <v-card-title class="pa-6 pb-2">Novo Projeto</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="createDialog.name"
          label="Nome do projeto"
          variant="outlined"
          autofocus
          @keyup.enter="saveCreate"
        />
      </v-card-text>
      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="createDialog.open = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="store.loading" :disabled="!createDialog.name.trim()" @click="saveCreate">
          Criar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog: Renomear -->
  <v-dialog v-model="renameDialog.open" max-width="420" persistent>
    <v-card rounded="lg">
      <v-card-title class="pa-6 pb-2">Renomear Projeto</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="renameDialog.name"
          label="Novo nome"
          variant="outlined"
          autofocus
          @keyup.enter="saveRename"
        />
      </v-card-text>
      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="renameDialog.open = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="store.loading" :disabled="!renameDialog.name.trim()" @click="saveRename">
          Salvar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog: Atribuir usuários -->
  <v-dialog v-model="assignDialog.open" max-width="420" persistent>
    <v-card rounded="lg">
      <v-card-title class="pa-6 pb-2">Atribuir Usuários</v-card-title>
      <v-card-subtitle class="px-6">{{ assignDialog.project?.name }}</v-card-subtitle>
      <v-card-text>
        <v-checkbox
          v-for="user in availableUsers"
          :key="user.name"
          v-model="assignDialog.selected"
          :label="user.name"
          :value="user.name"
          density="compact"
          hide-details
        />
        <p v-if="!availableUsers.length" class="text-body-2 text-medium-emphasis">
          Nenhum usuário cadastrado ainda.
        </p>
      </v-card-text>
      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="assignDialog.open = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="store.loading" @click="saveAssign">
          Salvar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog: Arquivar -->
  <v-dialog v-model="archiveDialog.open" max-width="380">
    <v-card rounded="lg">
      <v-card-title class="pa-6 pb-2">Arquivar projeto?</v-card-title>
      <v-card-text>
        O projeto <strong>{{ archiveDialog.project?.name }}</strong> será arquivado.
        Os dados já registrados serão preservados e o projeto poderá ser reativado depois.
      </v-card-text>
      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="archiveDialog.open = false">Cancelar</v-btn>
        <v-btn color="warning" variant="flat" :loading="store.loading" @click="confirmArchive">
          Arquivar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useGoogleStore } from '../../stores/googleStore'
import { useProjectsStore } from '../../stores/projectsStore'
import { useUsersStore } from '../../stores/usersStore'
import { initConfigSheets } from '../../services/sheets'

const google = useGoogleStore()
const store = useProjectsStore()
const usersStore = useUsersStore()
const connecting = ref(false)
const showArchived = ref(false)

const availableUsers = computed(() => usersStore.users)

const createDialog = reactive({ open: false, name: '' })
const renameDialog = reactive({ open: false, project: null, name: '' })
const assignDialog = reactive({ open: false, project: null, selected: [] })
const archiveDialog = reactive({ open: false, project: null })

onMounted(async () => {
  await google.init()
  if (google.isConnected) {
    await initConfigSheets(google.accessToken)
    await Promise.all([store.fetchProjects(), usersStore.fetchUsers()])
  }
})

async function connect() {
  connecting.value = true
  try {
    await google.requestToken()
    await initConfigSheets(google.accessToken)
    await Promise.all([store.fetchProjects(), usersStore.fetchUsers()])
  } finally {
    connecting.value = false
  }
}

function openCreate() {
  createDialog.name = ''
  createDialog.open = true
}

async function saveCreate() {
  if (!createDialog.name.trim()) return
  try {
    await store.createProject(createDialog.name.trim())
    createDialog.open = false
  } catch {}
}

function openRename(project) {
  renameDialog.project = project
  renameDialog.name = project.name
  renameDialog.open = true
}

async function saveRename() {
  if (!renameDialog.name.trim()) return
  try {
    await store.renameProject(renameDialog.project, renameDialog.name.trim())
    renameDialog.open = false
  } catch {}
}

function openAssign(project) {
  assignDialog.project = project
  assignDialog.selected = [...project.users]
  assignDialog.open = true
}

async function saveAssign() {
  try {
    await store.updateAssignments(assignDialog.project, assignDialog.selected)
    assignDialog.open = false
  } catch {}
}

function openArchive(project) {
  archiveDialog.project = project
  archiveDialog.open = true
}

async function confirmArchive() {
  try {
    await store.setStatus(archiveDialog.project, 'arquivado')
    archiveDialog.open = false
  } catch {}
}
</script>
