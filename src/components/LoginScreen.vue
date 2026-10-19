<script setup>
import { ref } from 'vue'

const emit = defineEmits(['unlocked'])

const pinCode = ref('')
const correctPin = '1129'

const checkPin = () => {
  if (pinCode.value === correctPin) {
    localStorage.setItem('totoAppUnlocked', 'true') 
    emit('unlocked') // パスワード正解時、親コンポーネントに合図を送る
  } else {
    alert('パスワードが違います！')
    pinCode.value = ''
  }
}
</script>

<template>
  <div class="login-screen">
    <h2>🔒 パスワード入力</h2>
    <input type="password" v-model="pinCode" placeholder="4桁の数字" class="pin-input">
    <button @click="checkPin" class="unlock-btn">解除する</button>
  </div>
</template>

<style scoped>
.login-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 70vh; }
.pin-input { font-size: 24px; padding: 10px; margin: 20px 0; width: 220px; text-align: center; border: 2px solid #ccc; border-radius: 8px; }
.unlock-btn { padding: 12px 30px; font-size: 18px; background: #333; color: white; border: none; border-radius: 8px; cursor: pointer; }
</style>