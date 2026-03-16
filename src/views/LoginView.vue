<template>
  <v-container fluid class="fill-height bg-grey-lighten-3">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="4">
        <v-card elevation="4" rounded="lg" class="pa-4">
          <v-card-title class="text-center text-h5 font-weight-bold pt-4 pb-2">
            Metas Sourcing
          </v-card-title>
          <v-card-subtitle class="text-center mb-4">
            Faça login para continuar
          </v-card-subtitle>

          <v-card-text>
            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="username"
                label="Usuário"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                class="mb-3"
                :disabled="loading || syncing"
              />

              <v-text-field
                v-model="password"
                label="Senha"
                prepend-inner-icon="mdi-lock"
                :type="showPassword ? 'text' : 'password'"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
                variant="outlined"
                class="mb-2"
                :disabled="loading || syncing"
              />

              <v-alert
                v-if="error && !showSync"
                type="error"
                variant="tonal"
                class="mb-4"
                density="compact"
              >
                Usuário ou senha incorretos.
              </v-alert>

              <!-- Sugestão de sincronizar quando usuário não encontrado -->
              <v-alert
                v-if="showSync"
                type="warning"
                variant="tonal"
                class="mb-4"
                density="compact"
              >
                Usuário não encontrado localmente. Sincronize as credenciais com o Google.
              </v-alert>

              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="loading"
                :disabled="syncing"
                class="mb-3"
              >
                Entrar
              </v-btn>

              <v-btn
                v-if="showSync"
                color="warning"
                variant="tonal"
                size="large"
                block
                prepend-icon="mdi-google"
                :loading="syncing"
                @click="syncAndLogin"
              >
                Sincronizar e entrar
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useGoogleStore } from '../stores/googleStore'
import { syncRegistry, loadRegistry } from '../services/usuarios'

const router = useRouter()
const auth = useAuthStore()
const google = useGoogleStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const syncing = ref(false)
const error = ref(false)
const showSync = ref(false)

async function handleLogin() {
  error.value = false
  showSync.value = false
  loading.value = true

  await new Promise((r) => setTimeout(r, 400))

  const success = auth.login(username.value, password.value)

  if (success) {
    router.push({ name: 'Dashboard' })
  } else {
    // Verifica se o usuário existe no registry local
    const registry = loadRegistry()
    const existeLocal = !!registry[username.value]
    showSync.value = !existeLocal
    error.value = existeLocal
  }

  loading.value = false
}

async function syncAndLogin() {
  syncing.value = true
  error.value = false
  try {
    await google.init()
    await google.requestToken()
    await syncRegistry(google.accessToken)

    const success = auth.login(username.value, password.value)
    if (success) {
      router.push({ name: 'Dashboard' })
    } else {
      showSync.value = false
      error.value = true
    }
  } catch {
    error.value = true
    showSync.value = false
  } finally {
    syncing.value = false
  }
}
</script>
