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

    const before = catalogSnapshot()
    alignStoreCatalogs()
    if (catalogSnapshot() !== before) await persistStores({ notify: false })
  } catch (e) {
    store1Suppliers.value = JSON.parse(JSON.stringify(suppliersData))
    store2Suppliers.value = JSON.parse(JSON.stringify(suppliersData))
  }
})

const handleUnlock = () => isUnlocked.value = true

const persistStores = async ({ notify = false } = {}) => {
  isSaving.value = true
  try {
    await setDoc(doc(db, 'toto_stores', 'store1'), {
      suppliers: store1Suppliers.value,
      selected: store1Selected.value,
      prep: store1Prep.value
    })
    await setDoc(doc(db, 'toto_stores', 'store2'), {
      suppliers: store2Suppliers.value,
      selected: store2Selected.value,
      prep: store2Prep.value
    })
    if (notify) alert('💾 一時保存しました！')
    return true
  } catch (e) {
    console.error('保存エラー:', e)
    alert(notify ? '保存に失敗しました。接続を確認してください。' : 'リストは画面上で更新しましたが、保存に失敗しました。接続を確認してください。')
    return false
  } finally { isSaving.value = false }
}

const saveCurrentData = () => persistStores({ notify: true })

const toItemList = (value) => (
  Array.isArray(value) ? value.map(item => String(item).trim()).filter(Boolean) : []
)

const mergeSupplierMaps = (first, second) => {
  const merged = {}
  const seen = new Set()
  ;[...Object.keys(first || {}), ...Object.keys(second || {})].forEach(key => {
    if (seen.has(key)) return
    seen.add(key)
    const items = []
    const itemSeen = new Set()
    ;[...toItemList(first?.[key]), ...toItemList(second?.[key])].forEach(item => {
      if (itemSeen.has(item)) return
      itemSeen.add(item)
      items.push(item)
    })
    merged[key] = items
  })
  return merged
}

const tagListOf = (item) => {
  if (!item) return []
  if (Array.isArray(item.tags) && item.tags.length) return [...item.tags]
  if (item.tag) return [item.tag]
  return ['C']
}

const mergePrepCatalog = (first, second) => {
  const names = []
  const seen = new Set()
  const firstByName = {}
  const secondByName = {}
  ;(first || []).forEach(item => {
    if (!item?.name || seen.has(item.name)) return
    seen.add(item.name)
    names.push(item.name)
    firstByName[item.name] = item
  })
  ;(second || []).forEach(item => {
    if (!item?.name) return
    secondByName[item.name] = item
    if (seen.has(item.name)) return
    seen.add(item.name)
    names.push(item.name)
  })
  const order = { 'C': 1, '洗': 2, 'P': 3 }
  return names.map(name => {
    const tags = []
    ;[...tagListOf(firstByName[name]), ...tagListOf(secondByName[name])].forEach(tag => {
      if (!tags.includes(tag)) tags.push(tag)
    })
    tags.sort((a, b) => (order[a] || 99) - (order[b] || 99))
    if (tags.length === 0) tags.push('C')
    return { name, tags }
  })
}

const catalogSnapshot = () => JSON.stringify({
  s1: store1Suppliers.value,
  s2: store2Suppliers.value,
  p1: store1Prep.value,
  p2: store2Prep.value
})

const alignStoreCatalogs = () => {
  const supplierMap = mergeSupplierMaps(store1Suppliers.value, store2Suppliers.value)
  const prepCatalog = mergePrepCatalog(store1Prep.value, store2Prep.value)
  const counts1 = Object.fromEntries(store1Prep.value.map(item => [item.name, item.count || 0]))
  const counts2 = Object.fromEntries(store2Prep.value.map(item => [item.name, item.count || 0]))
  store1Suppliers.value = JSON.parse(JSON.stringify(supplierMap))
  store2Suppliers.value = JSON.parse(JSON.stringify(supplierMap))
  store1Prep.value = prepCatalog.map(item => ({ name: item.name, tags: [...item.tags], count: counts1[item.name] || 0 }))
  store2Prep.value = prepCatalog.map(item => ({ name: item.name, tags: [...item.tags], count: counts2[item.name] || 0 }))
}

const filteredSuppliers = computed(() => {
  const currentSuppliers = suppliers.value
  const query = isEditMode.value ? '' : searchQuery.value.trim().toLowerCase()
  const masterKeys = Object.keys(suppliersData)
  const resultArr = []
  const seen = new Set()

  const pushSupplier = (supplier) => {
    const items = toItemList(currentSuppliers[supplier])
    const matchedItems = query
      ? items.filter(item => item.toLowerCase().includes(query) || supplier.toLowerCase().includes(query))
      : items
    const supplierMatches = !query || supplier.toLowerCase().includes(query)
    if (matchedItems.length > 0 || (isEditMode.value && supplierMatches)) {
      resultArr.push({ supplier, items: matchedItems })
    }
  }

  masterKeys.forEach(supplier => {
    if (!Object.prototype.hasOwnProperty.call(currentSuppliers, supplier)) return
    seen.add(supplier)
    pushSupplier(supplier)
  })
  Object.keys(currentSuppliers).forEach(supplier => {
    if (!seen.has(supplier)) pushSupplier(supplier)
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

// 業者リストは両店舗で同じ内容にし、発注個数（selectedItems）は書き換えない。
const syncSuppliers = async (mutate) => {
  const next = mutate(mergeSupplierMaps(store1Suppliers.value, store2Suppliers.value))
  const cloned = JSON.parse(JSON.stringify(next))
  store1Suppliers.value = cloned
  store2Suppliers.value = JSON.parse(JSON.stringify(cloned))
  await persistStores({ notify: false })
}

const addNewSupplier = () => {
  const newName = prompt('新しい業者名を入力してください:')
  const name = newName?.trim()
  if (!name) return
  syncSuppliers((source) => {
    if (source[name]) return source
    return { ...source, [name]: [] }
  })
}

const removeSupplier = (supplier) => {
  if (!confirm(`本当に「${supplier}」を削除しますか？`)) return
  syncSuppliers((source) => {
    if (!source[supplier]) return source
    const next = { ...source }
    delete next[supplier]
    return next
  })
}

const addNewItem = (supplier) => {
  const newItem = prompt(`「${supplier}」に追加するアイテム名:`)
  const itemName = newItem?.trim()
  if (!itemName) return
  syncSuppliers((source) => {
    const items = source[supplier] ? [...source[supplier]] : []
    if (items.includes(itemName)) return source
    return { ...source, [supplier]: [...items, itemName] }
  })
}

const removeItem = (supplier, item) => {
  if (!confirm(`「${item}」を削除しますか？`)) return
  syncSuppliers((source) => {
    if (!Array.isArray(source[supplier])) return source
    return { ...source, [supplier]: source[supplier].filter(i => i !== item) }
  })
}

// === PrepTab用関数 ===
const PREP_TAG_ORDER = { 'C': 1, '洗': 2, 'P': 3 }

const nextPrepTags = (tags, tag) => {
  const next = Array.isArray(tags) ? [...tags] : []
  const tagIndex = next.indexOf(tag)
  if (tagIndex > -1) next.splice(tagIndex, 1)
  else {
    next.push(tag)
    next.sort((a, b) => (PREP_TAG_ORDER[a] || 99) - (PREP_TAG_ORDER[b] || 99))
  }
  return next
}

// 仕込み項目の名前とタグは両店舗で揃え、count は店舗ごとの値を残す。
const syncPrepCatalog = async (mutate) => {
  const counts1 = Object.fromEntries(store1Prep.value.map(item => [item.name, item.count || 0]))
  const counts2 = Object.fromEntries(store2Prep.value.map(item => [item.name, item.count || 0]))
  const next = mutate(mergePrepCatalog(store1Prep.value, store2Prep.value))
  store1Prep.value = next.map(item => ({ name: item.name, tags: [...item.tags], count: counts1[item.name] || 0 }))
  store2Prep.value = next.map(item => ({ name: item.name, tags: [...item.tags], count: counts2[item.name] || 0 }))
  await persistStores({ notify: false })
}

const toggleTag = (item, tag) => {
  syncPrepCatalog(catalog => catalog.map(entry => (
    entry.name === item.name ? { ...entry, tags: nextPrepTags(entry.tags, tag) } : entry
  )))
}

const addNewPrepItem = () => {
  const name = prompt('追加する仕込みアイテム名:')
  const itemName = name?.trim()
  if (!itemName) return
  syncPrepCatalog(catalog => (
    catalog.some(entry => entry.name === itemName)
      ? catalog
      : [...catalog, { name: itemName, tags: ['C'] }]
  ))
}

const removePrepItem = (index) => {
  const target = prepItems.value[index]
  if (!target) return
  if (!confirm('この仕込み項目を削除しますか？')) return
  syncPrepCatalog(catalog => catalog.filter(entry => entry.name !== target.name))
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