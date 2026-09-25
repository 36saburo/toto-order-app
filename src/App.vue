<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { suppliersData } from './data/suppliers'

// ==========================================
// 1. パスワード設定
// ==========================================
const isUnlocked = ref(false)
const pinCode = ref('')
const correctPin = '1129'

onMounted(() => {
  if (localStorage.getItem('totoAppUnlocked') === 'true') {
    isUnlocked.value = true
  }
  // 保存されたリストがあればそれを読み込み、なければ初期データを使う
  const savedSuppliers = localStorage.getItem('totoSuppliers')
  if (savedSuppliers) {
    suppliers.value = JSON.parse(savedSuppliers)
  } else {
    suppliers.value = JSON.parse(JSON.stringify(suppliersData))
  }
})

const checkPin = () => {
  if (pinCode.value === correctPin) {
    isUnlocked.value = true
    localStorage.setItem('totoAppUnlocked', 'true') 
  } else {
    alert('パスワードが違います！')
    pinCode.value = ''
  }
}

// ==========================================
// 2. 仕入れマスターデータと状態管理
// ==========================================
const suppliers = ref({})
const selectedItems = ref({})
const searchQuery = ref('')
const isEditMode = ref(false) // 編集モードのON/OFF

// リストが変更されたら、自動的にブラウザに保存する
watch(suppliers, (newVal) => {
  localStorage.setItem('totoSuppliers', JSON.stringify(newVal))
}, { deep: true })

const filteredSuppliers = computed(() => {
  if (!searchQuery.value) return suppliers.value
  const filtered = {}
  for (const [supplier, items] of Object.entries(suppliers.value)) {
    const matchedItems = items.filter(item => 
      item.includes(searchQuery.value) || supplier.includes(searchQuery.value)
    )
    if (matchedItems.length > 0) {
      filtered[supplier] = matchedItems
    }
  }
  return filtered
})

// 発注用のアイテム選択
const toggleItem = (supplier, item) => {
  if (isEditMode.value) return // 編集モード中は選択できないようにする

  if (!selectedItems.value[supplier]) {
    selectedItems.value[supplier] = {}
  }
  
  if (selectedItems.value[supplier][item] !== undefined) {
    delete selectedItems.value[supplier][item]
    if (Object.keys(selectedItems.value[supplier]).length === 0) {
      delete selectedItems.value[supplier]
    }
  } else {
    selectedItems.value[supplier][item] = ''
  }
}

const isSelected = (supplier, item) => {
  return selectedItems.value[supplier]?.[item] !== undefined
}

// ==========================================
// 3. アプリ内編集機能（追加・削除）
// ==========================================
const addNewSupplier = () => {
  const newName = prompt('新しい業者名を入力してください:')
  if (newName && !suppliers.value[newName]) {
    suppliers.value[newName] = []
  } else if (suppliers.value[newName]) {
    alert('すでに存在する業者名です。')
  }
}

const removeSupplier = (supplier) => {
  if (confirm(`本当に「${supplier}」を削除しますか？`)) {
    delete suppliers.value[supplier]
  }
}

const addNewItem = (supplier) => {
  const newItem = prompt(`「${supplier}」に追加するアイテム名:`)
  if (newItem && !suppliers.value[supplier].includes(newItem)) {
    suppliers.value[supplier].push(newItem)
  }
}

const removeItem = (supplier, item) => {
  if (confirm(`「${item}」を削除しますか？`)) {
    const index = suppliers.value[supplier].indexOf(item)
    if (index > -1) {
      suppliers.value[supplier].splice(index, 1)
    }
  }
}

// ==========================================
// 4. モーダルとLINE送信処理
// ==========================================
const showModal = ref(false)

const openModal = () => {
  if (Object.keys(selectedItems.value).length === 0) {
    alert('仕入れるアイテムを選択してください！')
    return
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const sendToLine = () => {
  let message = '【本日の仕入れリスト】\n\n'
  for (const [supplier, itemsObj] of Object.entries(selectedItems.value)) {
    message += `・${supplier}\n`
    for (const [item, memo] of Object.entries(itemsObj)) {
      if (memo.trim() !== '') {
        message += `${item} （${memo}）\n`
      } else {
        message += `${item}\n`
      }
    }
    message += '\n'
  }
  const encodedMessage = encodeURIComponent(message)
  const lineUrl = `https://line.me/R/msg/text/?${encodedMessage}`
  window.location.href = lineUrl
}
</script>

<template>
  <div class="app-container">
    
    <div v-if="!isUnlocked" class="login-screen">
      <h2>🔒 パスワード入力</h2>
      <input type="password" v-model="pinCode" placeholder="4桁の数字" class="pin-input">
      <button @click="checkPin" class="unlock-btn">解除する</button>
    </div>

    <div v-else class="main-app">
      <!-- 上部固定エリア -->
      <div class="sticky-header">
        <div class="header-area">
          <h1>📝 トトの仕入れ表</h1>
          <label class="edit-toggle">
            <input type="checkbox" v-model="isEditMode">
            <span class="toggle-label" :class="{ active: isEditMode }">
              {{ isEditMode ? '🛠️ 編集モードON' : '発注モード' }}
            </span>
          </label>
        </div>
        
        <div class="search-box" v-if="!isEditMode">
          <input type="text" v-model="searchQuery" placeholder="🔍 アイテム名で検索..." class="search-input">
        </div>
      </div>
      
      <!-- 業者リスト -->
      <div v-for="(items, supplier) in filteredSuppliers" :key="supplier" class="supplier-block">
        <div class="supplier-header">
          <h2>{{ supplier }}</h2>
          <button v-if="isEditMode" @click="removeSupplier(supplier)" class="delete-supplier-btn">業者を削除</button>
        </div>
        
        <div class="item-grid">
          <div v-for="item in items" :key="item" class="item-wrapper">
            <button 
              class="item-btn"
              :class="{ 'is-active': isSelected(supplier, item), 'is-edit': isEditMode }"
              @click="toggleItem(supplier, item)"
            >
              {{ item }}
            </button>
            <button v-if="isEditMode" @click="removeItem(supplier, item)" class="delete-item-btn">×</button>
          </div>
          
          <button v-if="isEditMode" @click="addNewItem(supplier)" class="add-item-btn">＋ 追加</button>
        </div>
      </div>
      
      <div v-if="isEditMode" class="add-supplier-area">
        <button @click="addNewSupplier" class="add-supplier-btn">＋ 新しい業者を追加</button>
      </div>

      <div class="bottom-bar" v-if="!isEditMode">
        <button class="confirm-btn" @click="openModal">確認画面へ進む</button>
      </div>
    </div>

    <!-- 確認モーダル -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h2>✅ 発注リストの確認</h2>
        <p class="modal-desc">必要に応じて個数やグラムを入力してください</p>
        <div class="modal-list-area">
          <div v-for="(itemsObj, supplier) in selectedItems" :key="supplier" class="modal-supplier-block">
            <h3 class="modal-supplier-name">・{{ supplier }}</h3>
            <div v-for="(memo, item) in itemsObj" :key="item" class="modal-item-row">
              <span class="modal-item-name">{{ item }}</span>
              <input type="text" v-model="selectedItems[supplier][item]" placeholder="例: 2kg" class="modal-memo-input">
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="back-btn" @click="closeModal">戻る</button>
          <button class="send-btn" @click="sendToLine">LINEに送る</button>
        </div>
      </div>
    </div>
    
  </div>
</template>

<style scoped>
.app-container { padding: 20px; font-family: sans-serif; padding-bottom: 100px; }

/* ログイン */
.login-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 70vh; }
.pin-input { font-size: 24px; padding: 10px; margin: 20px 0; width: 220px; text-align: center; border: 2px solid #ccc; border-radius: 8px; }
.unlock-btn { padding: 12px 30px; font-size: 18px; background-color: #333; color: white; border: none; border-radius: 8px; cursor: pointer; }

/* 上部固定エリア */
.sticky-header {
  position: sticky;
  top: 0;
  background-color: white;
  z-index: 50;
  padding: 10px 0 15px 0;
  border-bottom: 2px solid #f0f0f0;
  margin-bottom: 20px;
}

/* ヘッダー・トグル */
.header-area { display: flex; justify-content: space-between; align-items: center; }
h1 { font-size: 22px; margin: 0; }
.edit-toggle input { display: none; }
.toggle-label { 
  background: #eee; padding: 8px 12px; border-radius: 20px; font-size: 14px; cursor: pointer; font-weight: bold;
  border: 2px solid #ccc; color: #666;
}
.toggle-label.active { background: #ffebee; border-color: #f44336; color: #d32f2f; }

/* 検索 */
.search-box { margin-top: 15px; }
.search-input { width: 100%; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; box-sizing: border-box; }

/* メインリスト */
.supplier-block { margin-bottom: 30px; }
.supplier-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #ddd; padding-bottom: 4px; margin-bottom: 10px;}
h2 { font-size: 18px; color: #333; margin: 0; }
.delete-supplier-btn { background: #ffebee; color: #d32f2f; border: 1px solid #ffcdd2; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; }

.item-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.item-wrapper { position: relative; }
.item-btn { padding: 12px 16px; border: 1px solid #ccc; border-radius: 8px; background-color: #f9f9f9; font-size: 16px; cursor: pointer; transition: all 0.2s; }
.item-btn.is-active { background-color: #00B900; color: white; border-color: #00B900; font-weight: bold; }
.item-btn.is-edit { cursor: default; background-color: #f0f0f0; border-style: dashed; }

.delete-item-btn { 
  position: absolute; top: -8px; right: -8px; background: #f44336; color: white; border: none; 
  border-radius: 50%; width: 24px; height: 24px; font-size: 14px; cursor: pointer; font-weight: bold;
  display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.add-item-btn { padding: 12px 16px; border: 1px dashed #2196F3; border-radius: 8px; background-color: #e3f2fd; color: #1976d2; font-size: 14px; cursor: pointer; font-weight: bold;}

.add-supplier-area { text-align: center; margin-top: 20px; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 2px dashed #ccc; }
.add-supplier-btn { padding: 12px 24px; font-size: 16px; background-color: #333; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;}

/* 下部ボタン・モーダル */
.bottom-bar { position: fixed; bottom: 0; left: 0; width: 100%; padding: 16px; background-color: white; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); text-align: center; z-index: 20; }
.confirm-btn { width: 90%; max-width: 400px; padding: 16px; font-size: 18px; font-weight: bold; background-color: #333; color: white; border: none; border-radius: 30px; cursor: pointer; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-content { background-color: white; width: 90%; max-width: 500px; max-height: 80vh; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; }
.modal-desc { font-size: 14px; color: #666; margin-bottom: 16px; }
.modal-list-area { overflow-y: auto; flex-grow: 1; margin-bottom: 20px; }
.modal-supplier-block { margin-bottom: 16px; }
.modal-supplier-name { font-size: 16px; font-weight: bold; margin-bottom: 8px; }
.modal-item-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #eee; }
.modal-item-name { font-size: 16px; flex-grow: 1; }
.modal-memo-input { width: 100px; padding: 8px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; margin-left: 10px; }
.modal-actions { display: flex; gap: 10px; }
.back-btn, .send-btn { flex: 1; padding: 14px; font-size: 16px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; }
.back-btn { background-color: #eee; color: #333; }
.send-btn { background-color: #00B900; color: white; }
</style>