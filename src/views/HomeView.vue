<template>
  <div>
    <h2 class="text-h5 font-weight-bold mb-1">Bem-vinda, {{ auth.user?.name }}!</h2>
    <p class="text-body-2 text-medium-emphasis">Selecione uma opção no menu lateral.</p>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
</script>
