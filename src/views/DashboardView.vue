<template>
  <v-app-bar color="primary" elevation="2">
    <v-app-bar-title>Metas Sourcing</v-app-bar-title>
    <v-spacer />
    <span class="mr-2 text-body-2">{{ auth.user?.name }}</span>
    <v-btn icon @click="senhaDialog = true">
      <v-icon>mdi-lock-reset</v-icon>
    </v-btn>
    <v-btn icon @click="handleLogout">
      <v-icon>mdi-logout</v-icon>
    </v-btn>
  </v-app-bar>

  <TrocarSenhaDialog
    v-model="senhaDialog"
    :username="auth.user?.username || ''"
    :require-actual="true"
  />

  <v-navigation-drawer permanent width="220">
    <v-list nav class="mt-2">
      <!-- Menu do usuário comum -->
      <template v-if="!auth.isAdmin">
        <v-list-item
          prepend-icon="mdi-pencil-box-outline"
          title="Lançar Triagens"
          :to="{ name: 'Lancamentos' }"
          rounded="lg"
        />
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
        />
        <v-list-item
          prepend-icon="mdi-briefcase-outline"
          title="Projetos"
          :to="{ name: 'AdminProjects' }"
          rounded="lg"
        />
        <v-list-item
          prepend-icon="mdi-target"
          title="Metas"
          :to="{ name: 'AdminMetas' }"
          rounded="lg"
        />
      </template>
    </v-list>
  </v-navigation-drawer>

  <v-main>
    <v-container class="pa-6">
      <router-view />
    </v-container>
  </v-main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import TrocarSenhaDialog from '../components/TrocarSenhaDialog.vue'

const router = useRouter()
const auth = useAuthStore()
const senhaDialog = ref(false)

function handleLogout() {
  auth.logout()
  router.push({ name: 'Login' })
}
</script>
