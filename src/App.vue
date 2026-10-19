<script setup>
import { ref, onMounted, computed } from 'vue'
import { suppliersData } from './data/suppliers'
import { db } from './firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

import LoginScreen from './components/LoginScreen.vue' 
import ConfirmModal from './components/ConfirmModal.vue'
import OrderTab from './components/OrderTab.vue'  // ⭐️ 新規
import PrepTab from './components/PrepTab.vue'    // ⭐️ 新規

const currentStore = ref('store1')
const activeTab = ref('order')    
const isUnlocked = ref(false)

const store1Suppliers = ref({})
const store1Selected = ref({})
const store1Prep = ref([
  { name: '上タン', count: 0, tags: ['C'] }, 
  { name: '塩タン', count: 0, tags: ['C'] }, 
  { name: 'ハラミ', count: 0, tags: ['洗'] },
  { name: 'サガリ', count: 0, tags: ['洗'] }, 
  { name: 'ミノ', count: 0, tags: ['C'] }, 
  { name: 'ギアラ', count: 0, tags: ['C'] },
  { name: 'テッチャン', count: 0, tags: ['C'] }, 
  { name: '上レバー', count: 0, tags: ['P'] }, 
  { name: '雲仙ハム', count: 0, tags: ['P'] }
])

const store2Suppliers = ref({})
const store2Selected = ref({})
const store2Prep = ref([
  { name: '上タン', count: 0, tags: ['C'] }, 
  { name: '塩タン', count: 0, tags: ['C'] }, 
  { name: 'ハラミ', count: 0, tags: ['洗'] },
  { name: 'サガリ', count: 0, tags: ['洗'] }, 
  { name: 'ミノ', count: 0, tags: ['C'] }, 
  { name: 'ギアラ', count: 0, tags: ['C'] },
  { name: 'テッチャン', count: 0, tags: ['C'] }, 
  { name: '上レバー', count: 0, tags: ['P'] }, 
  { name: '雲仙ハム', count: 0, tags: ['P'] }
])

const suppliers = computed({
  get: () => currentStore.value === 'store1' ? store1Suppliers.value : store2Suppliers.value,
  set: (val) => { if (currentStore.value === 'store1') store1Suppliers.value = val; else store2Suppliers.value = val; }
})
const selectedItems = computed({
  get: () => currentStore.value === 'store1' ? store1Selected.value : store2Selected.value,
  set: (val) => { if (currentStore.value === 'store1') store1Selected.value = val; else store2Selected.value = val; }
})
const prepItems = computed({
  get: () => currentStore.value === 'store1' ? store1Prep.value : store2Prep.value,
  set: (val) => { if (currentStore.value === 'store1') store1Prep.value = val; else store2Prep.value = val; }
})

const searchQuery = ref('')
const isEditMode = ref(false)
const showModal = ref(false)
const isSaving = ref(false)

onMounted(async () => {
  if (localStorage.getItem('totoAppUnlocked') === 'true') isUnlocked.value = true
  try {
    const s1Ref = doc(db, 'toto_stores', 'store1')
    const s1Snap = await getDoc(s1Ref)
    if (s1Snap.exists()) {
      store1Suppliers.value = s1Snap.data().suppliers || {}
      store1Selected.value = s1Snap.data().selected || {}
      store1Prep.value = (s1Snap.data().prep || store1Prep.value).map(i => ({ ...i, tags: i.tags || (i.tag ? [i.tag] : ['C']) }))
    } else { store1Suppliers.value = JSON.parse(JSON.stringify(suppliersData)) }

    const s2Ref = doc(db, 'toto_stores', 'store2')
    const s2Snap = await getDoc(s2Ref)
    if (s2Snap.exists()) {
      store2Suppliers.value = s2Snap.data().suppliers || {}
      store2Selected.value = s2Snap.data().selected || {}
      store2Prep.value = (s2Snap.data().prep || store2Prep.value).map(i => ({ ...i, tags: i.tags || (i.tag ? [i.tag] : ['C']) }))
    } else { store2Suppliers.value = JSON.parse(JSON.stringify(suppliersData)) }
  } catch (e) {
    store1Suppliers.value = JSON.parse(JSON.stringify(suppliersData))
    store2Suppliers.value = JSON.parse(JSON.stringify(suppliersData))
  }
})

const handleUnlock = () => isUnlocked.value = true

const saveCurrentData = async () => {
  isSaving.value = true
  try {
    await setDoc(doc(db, 'toto_stores', 'store1'), { suppliers: store1Suppliers.value, selected: store1Selected.value, prep: store1Prep.value }, { merge: true })
    await setDoc(doc(db, 'toto_stores', 'store2'), { suppliers: store2Suppliers.value, selected: store2Selected.value, prep: store2Prep.value }, { merge: true })
    alert('💾 一時保存しました！')
  } catch (e) { alert('保存に失敗しました。接続を確認してください。') } 
  finally { isSaving.value = false }
}

const filteredSuppliers = computed(() => {
  const currentSuppliers = suppliers.value
  const query = searchQuery.value.toLowerCase()
  const masterKeys = Object.keys(suppliersData)
  const resultArr = []

  masterKeys.forEach(supplier => {
    if (currentSuppliers[supplier]) {
      const items = currentSuppliers[supplier]
      const matchedItems = query ? items.filter(item => item.toLowerCase().includes(query) || supplier.toLowerCase().includes(query)) : items
      if (matchedItems.length > 0) resultArr.push({ supplier, items: matchedItems })
    }
  })
  Object.keys(currentSuppliers).forEach(supplier => {
    if (!masterKeys.includes(supplier)) {
      const items = currentSuppliers[supplier]
      const matchedItems = query ? items.filter(item => item.toLowerCase().includes(query) || supplier.toLowerCase().includes(query)) : items
      if (matchedItems.length > 0) resultArr.push({ supplier, items: matchedItems })
    }
  })
  return resultArr
})

// === OrderTab用関数 ===
const toggleItem = (supplier, item) => {
  if (isEditMode.value) return
  const currentSel = { ...selectedItems.value }
  if (!currentSel[supplier]) currentSel[supplier] = {}
  if (currentSel[supplier][item] !== undefined) {
    delete currentSel[supplier][item]
    if (Object.keys(currentSel[supplier]).length === 0) delete currentSel[supplier]
  } else {
    currentSel[supplier][item] = '1'
  }
  selectedItems.value = currentSel
}

const updateOrderCount = (supplier, item, delta) => {
  const currentSel = { ...selectedItems.value }
  let currentVal = parseInt(currentSel[supplier][item])
  if (isNaN(currentVal)) currentVal = 1 
  currentVal += delta
  if (currentVal > 0) { currentSel[supplier][item] = String(currentVal); selectedItems.value = currentSel } 
  else {
    delete currentSel[supplier][item]
    if (Object.keys(currentSel[supplier]).length === 0) delete currentSel[supplier]
    selectedItems.value = currentSel
  }
}

const addNewSupplier = () => {
  const newName = prompt('新しい業者名を入力してください:')
  if (newName && !suppliers.value[newName]) suppliers.value = { ...suppliers.value, [newName]: [] }
}
const removeSupplier = (supplier) => {
  if (confirm(`本当に「${supplier}」を削除しますか？`)) { const updated = { ...suppliers.value }; delete updated[supplier]; suppliers.value = updated }
}
const addNewItem = (supplier) => {
  const newItem = prompt(`「${supplier}」に追加するアイテム名:`)
  if (newItem && !suppliers.value[supplier].includes(newItem)) { const updated = { ...suppliers.value }; updated[supplier] = [...updated[supplier], newItem]; suppliers.value = updated }
}
const removeItem = (supplier, item) => {
  if (confirm(`「${item}」を削除しますか？`)) { const updated = { ...suppliers.value }; updated[supplier] = updated[supplier].filter(i => i !== item); suppliers.value = updated }
}

// === PrepTab用関数 ===
const toggleTag = (item, tag) => {
  if (!item.tags) item.tags = []
  const index = item.tags.indexOf(tag)
  if (index > -1) item.tags.splice(index, 1)
  else { item.tags.push(tag); const order = { 'C': 1, '洗': 2, 'P': 3 }; item.tags.sort((a, b) => (order[a] || 99) - (order[b] || 99)) }
}
const addNewPrepItem = () => {
  const name = prompt('追加する仕込みアイテム名:')
  if (name) prepItems.value = [...prepItems.value, { name, count: 0, tags: ['C'] }]
}
const removePrepItem = (index) => {
  if (confirm('この仕込み項目を削除しますか？')) { const updated = [...prepItems.value]; updated.splice(index, 1); prepItems.value = updated }
}
const resetPrep = () => {
  if (confirm(`【${currentStore.value === 'store1' ? '1号店' : '2号店'}】の仕込みカウントをすべて 0 にリセットしますか？`)) prepItems.value.forEach(item => item.count = 0)
}

const openModal = async () => {
  const hasOrder1 = Object.keys(store1Selected.value).length > 0
  const hasOrder2 = Object.keys(store2Selected.value).length > 0
  const hasPrep1 = store1Prep.value.some(i => i.count > 0)
  const hasPrep2 = store2Prep.value.some(i => i.count > 0)
  if (!hasOrder1 && !hasOrder2 && !hasPrep1 && !hasPrep2) return alert('両店舗あわせて発注または仕込みのデータがありません！')
  await saveCurrentData()
  showModal.value = true
}
</script>

<template>
  <div class="app-container">
    <LoginScreen v-if="!isUnlocked" @unlocked="handleUnlock" />
    
    <div v-else class="main-app">
      <!-- ヘッダー -->
      <div class="top-control-bar">
        <div class="store-switcher">
          <button :class="{ active: currentStore === 'store1' }" @click="currentStore = 'store1'">🏠 1号店</button>
          <button :class="{ active: currentStore === 'store2' }" @click="currentStore = 'store2'">🏢 2号店</button>
        </div>
        <button class="save-action-btn" @click="saveCurrentData" :disabled="isSaving">
          {{ isSaving ? '保存中...' : '💾 一時保存' }}
        </button>
      </div>

      <!-- タブ切り替え -->
      <div class="tab-nav">
        <button :class="{ active: activeTab === 'order' }" @click="activeTab = 'order'">🛒 仕入れ表</button>
        <button :class="{ active: activeTab === 'prep' }" @click="activeTab = 'prep'">🔪 仕込み表</button>
      </div>

      <!-- ⭐️ 分割したコンポーネントの呼び出し -->
      <OrderTab 
        v-if="activeTab === 'order'"
        :currentStore="currentStore"
        :suppliers="filteredSuppliers"
        :selectedItems="selectedItems"
        v-model:searchQuery="searchQuery"
        v-model:isEditMode="isEditMode"
        @toggleItem="toggleItem"
        @updateOrderCount="updateOrderCount"
        @addNewSupplier="addNewSupplier"
        @removeSupplier="removeSupplier"
        @addNewItem="addNewItem"
        @removeItem="removeItem"
        @openModal="openModal"
      />

      <PrepTab 
        v-if="activeTab === 'prep'"
        :currentStore="currentStore"
        :prepItems="prepItems"
        v-model:isEditMode="isEditMode"
        @toggleTag="toggleTag"
        @removePrepItem="removePrepItem"
        @addNewPrepItem="addNewPrepItem"
        @resetPrep="resetPrep"
        @openModal="openModal"
      />
    </div>

    <!-- モーダル -->
    <ConfirmModal 
      :show="showModal" 
      :store1Selected="store1Selected" 
      :store2Selected="store2Selected" 
      :store1Prep="store1Prep" 
      :store2Prep="store2Prep" 
      @close="showModal = false" 
    />
  </div>
</template>

<style scoped>
/* App全体に関わる大枠のデザインだけを残しました */
.app-container { padding: 20px; font-family: sans-serif; padding-bottom: 100px; }
.top-control-bar { display: flex; gap: 10px; margin-bottom: 10px; align-items: center; }
.store-switcher { display: flex; flex: 1; border-radius: 8px; overflow: hidden; border: 2px solid #00B900; }
.store-switcher button { flex: 1; padding: 12px; font-size: 16px; font-weight: bold; background: white; border: none; cursor: pointer; color: #00B900; transition: background 0.2s;}
.store-switcher button.active { background: #00B900; color: white; }
.save-action-btn { padding: 12px 16px; font-size: 15px; font-weight: bold; background: #2196F3; color: white; border: none; border-radius: 8px; cursor: pointer; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.save-action-btn:active { background: #1976D2; }

.tab-nav { display: flex; margin-bottom: 15px; border-radius: 8px; overflow: hidden; border: 2px solid #ddd; }
.tab-nav button { flex: 1; padding: 15px; font-size: 16px; font-weight: bold; background: #f9f9f9; border: none; cursor: pointer; color: #666; transition: background 0.2s;}
.tab-nav button.active { background: #333; color: white; }
</style>