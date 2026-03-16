<template>
  <v-dialog v-model="model" max-width="420" persistent>
    <v-card rounded="lg">
      <v-card-title class="pa-6 pb-2">Trocar Senha</v-card-title>
      <v-card-subtitle class="px-6">{{ displayName || username }}</v-card-subtitle>
      <v-card-text class="pt-4">
        <v-text-field
          v-if="requireActual"
          v-model="senhaAtual"
          label="Senha atual"
          :type="show.atual ? 'text' : 'password'"
          :append-inner-icon="show.atual ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="show.atual = !show.atual"
          variant="outlined"
          class="mb-3"
        />
        <v-text-field
          v-model="novaSenha"
          label="Nova senha"
          :type="show.nova ? 'text' : 'password'"
          :append-inner-icon="show.nova ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="show.nova = !show.nova"
          variant="outlined"
          class="mb-3"
        />
        <v-text-field
          v-model="confirmar"
          label="Confirmar nova senha"
          :type="show.confirmar ? 'text' : 'password'"
          :append-inner-icon="show.confirmar ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="show.confirmar = !show.confirmar"
          variant="outlined"
          :error-messages="erroConfirmar"
        />
        <v-alert v-if="erro" type="error" variant="tonal" density="compact" class="mt-2">
          {{ erro }}
        </v-alert>
        <v-alert v-if="sucesso" type="success" variant="tonal" density="compact" class="mt-2">
          Senha alterada com sucesso.
        </v-alert>
      </v-card-text>
      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="fechar">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="!podeсалvar"
          @click="salvar"
        >
          Salvar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useGoogleStore } from '../stores/googleStore'
import { updateSenha } from '../services/usuarios'

const props = defineProps({
  username: { type: String, required: true },
  displayName: { type: String, default: '' },
  requireActual: { type: Boolean, default: false },
})

const model = defineModel()

const google = useGoogleStore()
const senhaAtual = ref('')
const novaSenha = ref('')
const confirmar = ref('')
const loading = ref(false)
const erro = ref('')
const sucesso = ref(false)
const show = reactive({ atual: false, nova: false, confirmar: false })

const erroConfirmar = computed(() =>
  confirmar.value && novaSenha.value !== confirmar.value ? 'As senhas não coincidem' : ''
)

const podeсалvar = computed(() =>
  novaSenha.value.length >= 4 &&
  novaSenha.value === confirmar.value &&
  (!props.requireActual || senhaAtual.value.length > 0)
)

function fechar() {
  novaSenha.value = ''
  confirmar.value = ''
  senhaAtual.value = ''
  erro.value = ''
  sucesso.value = false
  model.value = false
}

async function salvar() {
  erro.value = ''
  sucesso.value = false
  loading.value = true

  try {
    if (!google.accessToken) {
      erro.value = 'Conecte o Google Sheets antes de trocar a senha.'
      loading.value = false
      return
    }

    if (props.requireActual) {
      const { useAuthStore } = await import('../stores/auth')
      const authStore = useAuthStore()
      const ok = authStore.login(props.username, senhaAtual.value)
      if (!ok) {
        erro.value = 'Senha atual incorreta.'
        loading.value = false
        return
      }
    }

    await updateSenha(google.accessToken, props.username, novaSenha.value)
    sucesso.value = true
    setTimeout(fechar, 1500)
  } catch (e) {
    erro.value = e.message || 'Erro ao salvar. Verifique sua conexão com o Google.'
  } finally {
    loading.value = false
  }
}
</script>
