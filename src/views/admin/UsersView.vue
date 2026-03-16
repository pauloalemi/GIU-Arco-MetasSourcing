<template>
  <!-- Conectar ao Google -->
  <v-banner v-if="!google.isConnected" color="warning" icon="mdi-google" class="mb-4">
    <template #text>Conecte sua conta Google para gerenciar os usuários na planilha.</template>
    <template #actions>
      <v-btn variant="flat" color="warning" @click="connect" :loading="connecting">
        Conectar Google Sheets
      </v-btn>
    </template>
  </v-banner>

  <!-- Cabeçalho -->
  <div class="d-flex align-center mb-6">
    <div>
      <h2 class="text-h5 font-weight-bold">Usuários</h2>
      <p class="text-body-2 text-medium-emphasis">
        Cada usuário corresponde a uma aba na planilha do Google Sheets.
      </p>
    </div>
    <v-spacer />
    <v-btn color="primary" prepend-icon="mdi-plus" :disabled="!google.isConnected" @click="openCreate">
      Novo Usuário
    </v-btn>
  </div>

  <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4" closable @click:close="store.error = null">
    {{ store.error }}
  </v-alert>

  <div v-if="store.loading && !store.users.length" class="d-flex justify-center py-12">
    <v-progress-circular indeterminate color="primary" />
  </div>

  <v-row v-else>
    <v-col v-for="user in store.users" :key="user.id" cols="12" sm="6" md="4">
      <v-card rounded="lg" elevation="2">
        <v-card-text class="d-flex align-center">
          <v-avatar color="primary" size="48" class="mr-4">
            <span class="text-h6 text-white">{{ user.name[0]?.toUpperCase() }}</span>
          </v-avatar>
          <div class="flex-grow-1" style="min-width: 0">
            <div class="font-weight-medium text-body-1 text-truncate">{{ user.name }}</div>
            <div class="text-caption text-medium-emphasis text-truncate">{{ getUserUsername(user.name) }}</div>
          </div>
          <div>
            <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(user)" />
            <v-btn icon="mdi-lock-reset" variant="text" size="small" color="warning" @click="openTrocarSenha(user)" />
            <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="openDelete(user)" />
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col v-if="!store.loading && !store.users.length" cols="12">
      <v-empty-state
        icon="mdi-account-group-outline"
        title="Nenhum usuário encontrado"
        text="Crie o primeiro usuário ou verifique sua conexão com o Google Sheets."
      />
    </v-col>
  </v-row>

  <!-- Dialog: Criar -->
  <v-dialog v-model="createDialog.open" max-width="460" persistent>
    <v-card rounded="lg">
      <v-card-title class="pa-6 pb-2">Novo Usuário</v-card-title>
      <v-card-text class="pt-2">
        <v-text-field
          v-model="createDialog.name"
          label="Nome completo"
          variant="outlined"
          class="mb-3"
          autofocus
        />
        <v-text-field
          v-model="createDialog.username"
          label="Usuário (login)"
          variant="outlined"
          class="mb-3"
          hint="Ex: carolina.hidalgo"
          persistent-hint
        />
        <v-text-field
          v-model="createDialog.password"
          label="Senha inicial"
          :type="createDialog.showPass ? 'text' : 'password'"
          :append-inner-icon="createDialog.showPass ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="createDialog.showPass = !createDialog.showPass"
          variant="outlined"
        />
      </v-card-text>
      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="createDialog.open = false">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="store.loading"
          :disabled="!createDialog.name.trim() || !createDialog.username.trim() || !createDialog.password"
          @click="saveCreate"
        >
          Criar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog: Editar nome -->
  <v-dialog v-model="editDialog.open" max-width="420" persistent>
    <v-card rounded="lg">
      <v-card-title class="pa-6 pb-2">Editar Usuário</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="editDialog.name"
          label="Nome"
          variant="outlined"
          autofocus
          @keyup.enter="saveEdit"
        />
      </v-card-text>
      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="editDialog.open = false">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="store.loading"
          :disabled="!editDialog.name.trim()"
          @click="saveEdit"
        >
          Salvar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog: Trocar senha (admin) -->
  <TrocarSenhaDialog
    v-if="senhaDialog.open"
    v-model="senhaDialog.open"
    :username="senhaDialog.username"
    :display-name="senhaDialog.user?.name || ''"
    :require-actual="false"
  />

  <!-- Dialog: Confirmar exclusão -->
  <v-dialog v-model="deleteDialog.open" max-width="380">
    <v-card rounded="lg">
      <v-card-title class="pa-6 pb-2">Excluir usuário?</v-card-title>
      <v-card-text>
        Isso vai remover a aba <strong>{{ deleteDialog.user?.name }}</strong> da planilha e as credenciais de acesso permanentemente.
      </v-card-text>
      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="deleteDialog.open = false">Cancelar</v-btn>
        <v-btn color="error" variant="flat" :loading="store.loading" @click="confirmDelete">
          Excluir
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useGoogleStore } from '../../stores/googleStore'
import { useUsersStore } from '../../stores/usersStore'
import { loadRegistry } from '../../services/usuarios'
import TrocarSenhaDialog from '../../components/TrocarSenhaDialog.vue'

const google = useGoogleStore()
const store = useUsersStore()
const connecting = ref(false)

const createDialog = reactive({ open: false, name: '', username: '', password: '', showPass: false })
const editDialog = reactive({ open: false, user: null, name: '', username: '' })
const deleteDialog = reactive({ open: false, user: null, username: '' })
const senhaDialog = reactive({ open: false, user: null, username: '' })

onMounted(async () => {
  await google.init()
  if (google.isConnected) store.fetchUsers()
})

async function connect() {
  connecting.value = true
  try {
    await google.requestToken()
    await store.fetchUsers()
  } finally {
    connecting.value = false
  }
}

function getUserUsername(name) {
  const registry = loadRegistry()
  const entry = Object.entries(registry).find(([, v]) => v.name === name)
  return entry ? entry[0] : ''
}

function openCreate() {
  createDialog.name = ''
  createDialog.username = ''
  createDialog.password = ''
  createDialog.showPass = false
  createDialog.open = true
}

async function saveCreate() {
  if (!createDialog.name.trim() || !createDialog.username.trim() || !createDialog.password) return
  try {
    await store.createUser(createDialog.name.trim(), createDialog.username.trim(), createDialog.password)
    createDialog.open = false
  } catch {}
}

function openEdit(user) {
  editDialog.user = user
  editDialog.name = user.name
  editDialog.username = getUserUsername(user.name)
  editDialog.open = true
}

async function saveEdit() {
  if (!editDialog.name.trim()) return
  try {
    await store.renameUser(editDialog.user.id, editDialog.name.trim(), editDialog.username)
    editDialog.open = false
  } catch {}
}

function openTrocarSenha(user) {
  senhaDialog.user = user
  senhaDialog.username = getUserUsername(user.name)
  senhaDialog.open = true
}

function openDelete(user) {
  deleteDialog.user = user
  deleteDialog.username = getUserUsername(user.name)
  deleteDialog.open = true
}

async function confirmDelete() {
  try {
    await store.deleteUser(deleteDialog.user.id, deleteDialog.username)
    deleteDialog.open = false
  } catch {}
}
</script>
