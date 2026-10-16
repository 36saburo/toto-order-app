<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { suppliersData } from './data/suppliers'
import { db } from './firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

// ==========================================
// 0. 店舗切り替え・パスワード設定
// ==========================================
const currentStore = ref('store1') // 'store1'=1号店, 'store2'=2号店
const activeTab = ref('order')    // 'order'=仕入れ, 'prep'=仕込み
const isUnlocked = ref(false)
const pinCode = ref('')
const correctPin = '1129'

// ==========================================
// 1. 各店舗ごとのデータ（リアクティブ管理）
// ==========================================
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
const sendMode = ref('separate')

// ==========================================
// 2. Firebaseからデータ読み込み (onMounted)
// ==========================================
onMounted(async () => {
  if (localStorage.getItem('totoAppUnlocked') === 'true') isUnlocked.value = true
  
  const s1Ref = doc(db, 'toto_stores', 'store1')
  const s1Snap = await getDoc(s1Ref)
  if (s1Snap.exists()) {
    store1Suppliers.value = s1Snap.data().suppliers || {}
    store1Selected.value = s1Snap.data().selected || {}
    store1Prep.value = (s1Snap.data().prep || store1Prep.value).map(i => ({
      ...i,
      tags: i.tags || (i.tag ? [i.tag] : ['C']) // 旧データの互換性対応
    }))
  } else {
    store1Suppliers.value = JSON.parse(JSON.stringify(suppliersData))
  }

  const s2Ref = doc(db, 'toto_stores', 'store2')
  const s2Snap = await getDoc(s2Ref)
  if (s2Snap.exists()) {
    store2Suppliers.value = s2Snap.data().suppliers || {}
    store2Selected.value = s2Snap.data().selected || {}
    store2Prep.value = (s2Snap.data().prep || store2Prep.value).map(i => ({
      ...i,
      tags: i.tags || (i.tag ? [i.tag] : ['C'])
    }))
  } else {
    store2Suppliers.value = JSON.parse(JSON.stringify(suppliersData))
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
// 3. データ変更時の自動保存 (Firebase Watcher)
// ==========================================
watch([store1Suppliers, store1Selected, store1Prep], async () => {
  await setDoc(doc(db, 'toto_stores', 'store1'), { 
    suppliers: store1Suppliers.value, 
    selected: store1Selected.value, 
    prep: store1Prep.value 
  }, { merge: true })
}, { deep: true })

watch([store2Suppliers, store2Selected, store2Prep], async () => {
  await setDoc(doc(db, 'toto_stores', 'store2'), { 
    suppliers: store2Suppliers.value, 
    selected: store2Selected.value, 
    prep: store2Prep.value 
  }, { merge: true })
}, { deep: true })

// ==========================================
// 4. 操作用関数
// ==========================================
const resetPrep = () => {
  if (confirm(`【${currentStore.value === 'store1' ? '1号店' : '2号店'}】の仕込みカウントをすべて 0 にリセットしますか？`)) {
    prepItems.value.forEach(item => item.count = 0)
  }
}

const filteredSuppliers = computed(() => {
  const currentSuppliers = suppliers.value
  if (!searchQuery.value) return currentSuppliers
  const filtered = {}
  for (const [supplier, items] of Object.entries(currentSuppliers)) {
    const matchedItems = items.filter(item => item.includes(searchQuery.value) || supplier.includes(searchQuery.value))
    if (matchedItems.length > 0) filtered[supplier] = matchedItems
  }
  return filtered
})

const toggleItem = (supplier, item) => {
  if (isEditMode.value) return
  const currentSel = { ...selectedItems.value }
  if (!currentSel[supplier]) currentSel[supplier] = {}
  if (currentSel[supplier][item] !== undefined) {
    delete currentSel[supplier][item]
    if (Object.keys(currentSel[supplier]).length === 0) delete currentSel[supplier]
  } else {
    currentSel[supplier][item] = ''
  }
  selectedItems.value = currentSel
}

const isSelected = (supplier, item) => selectedItems.value[supplier]?.[item] !== undefined

const addNewSupplier = () => {
  const newName = prompt('新しい業者名を入力してください:')
  if (newName && !suppliers.value[newName]) {
    suppliers.value = { ...suppliers.value, [newName]: [] }
  }
}
const removeSupplier = (supplier) => {
  if (confirm(`本当に「${supplier}」を削除しますか？`)) {
    const updated = { ...suppliers.value }
    delete updated[supplier]
    suppliers.value = updated
  }
}
const addNewItem = (supplier) => {
  const newItem = prompt(`「${supplier}」に追加するアイテム名:`)
  if (newItem && !suppliers.value[supplier].includes(newItem)) {
    const updated = { ...suppliers.value }
    updated[supplier] = [...updated[supplier], newItem]
    suppliers.value = updated
  }
}
const removeItem = (supplier, item) => {
  if (confirm(`「${item}」を削除しますか？`)) {
    const updated = { ...suppliers.value }
    updated[supplier] = updated[supplier].filter(i => i !== item)
    suppliers.value = updated
  }
}

// 複数選択用タグのトグル関数
const toggleTag = (item, tag) => {
  if (!item.tags) item.tags = []
  const index = item.tags.indexOf(tag)
  if (index > -1) {
    item.tags.splice(index, 1) // 既に含まれていれば外す
  } else {
    item.tags.push(tag) // 含まれていなければ追加
    // 綺麗な順番（C, 洗, P）に並び替え
    const order = { 'C': 1, '洗': 2, 'P': 3 }
    item.tags.sort((a, b) => (order[a] || 99) - (order[b] || 99))
  }
}

const addNewPrepItem = () => {
  const name = prompt('追加する仕込みアイテム名:')
  if (!name) return
  prepItems.value = [...prepItems.value, { name, count: 0, tags: ['C'] }]
}

const removePrepItem = (index) => {
  if (confirm('この仕込み項目を削除しますか？')) {
    const updated = [...prepItems.value]
    updated.splice(index, 1)
    prepItems.value = updated
  }
}

const openModal = () => {
  const hasOrder1 = Object.keys(store1Selected.value).length > 0
  const hasOrder2 = Object.keys(store2Selected.value).length > 0
  const hasPrep1 = store1Prep.value.some(i => i.count > 0)
  const hasPrep2 = store2Prep.value.some(i => i.count > 0)
  
  if (!hasOrder1 && !hasOrder2 && !hasPrep1 && !hasPrep2) {
    return alert('両店舗あわせて発注または仕込みのデータがありません！')
  }
  showModal.value = true
}

const closeModal = () => showModal.value = false

// ==========================================
// 5. LINE送信処理
// ==========================================
const sendToLine = () => {
  let message = '【トトグループ 業務連絡】\n\n'

  if (sendMode.value === 'separate') {
    message += '--- 🏠 1号店 ---\n'
    if (Object.keys(store1Selected.value).length > 0) {
      message += '【発注】\n'
      for (const [supplier, itemsObj] of Object.entries(store1Selected.value)) {
        message += `［${supplier}］\n`
        for (const [item, memo] of Object.entries(itemsObj)) {
          message += memo.trim() !== '' ? `・${item} （${memo}）\n` : `・${item}\n`
        }
      }
    }
    if (store1Prep.value.some(i => i.count > 0)) {
      message += '【明日の仕込み】\n'
      store1Prep.value.filter(i => i.count > 0).forEach(item => {
        const tagStr = item.tags && item.tags.length > 0 ? ` [${item.tags.join(', ')}]` : ''
        message += `・${item.name}${tagStr}： ${item.count}\n`
      })
    }
    message += '\n--- 🏠 2号店 ---\n'
    if (Object.keys(store2Selected.value).length > 0) {
      message += '【発注】\n'
      for (const [supplier, itemsObj] of Object.entries(store2Selected.value)) {
        message += `［${supplier}］\n`
        for (const [item, memo] of Object.entries(itemsObj)) {
          message += memo.trim() !== '' ? `・${item} （${memo}）\n` : `・${item}\n`
        }
      }
    }
    if (store2Prep.value.some(i => i.count > 0)) {
      message += '【明日の仕込み】\n'
      store2Prep.value.filter(i => i.count > 0).forEach(item => {
        const tagStr = item.tags && item.tags.length > 0 ? ` [${item.tags.join(', ')}]` : ''
        message += `・${item.name}${tagStr}： ${item.count}\n`
      })
    }
  } else {
    message += '--- 🛒 全店舗 合算発注リスト ---\n'
    const mergedOrders = {}
    [store1Selected.value, store2Selected.value].forEach(orderObj => {
      for (const [supplier, itemsObj] of Object.entries(orderObj)) {
        if (!mergedOrders[supplier]) mergedOrders[supplier] = {}
        for (const [item, memo] of Object.entries(itemsObj)) {
          if (!mergedOrders[supplier][item]) mergedOrders[supplier][item] = []
          if (memo.trim() !== '') mergedOrders[supplier][item].push(memo)
        }
      }
    })
    for (const [supplier, itemsObj] of Object.entries(mergedOrders)) {
      message += `［${supplier}］\n`
      for (const [item, memos] of Object.entries(itemsObj)) {
        const memoStr = memos.length > 0 ? ` （${memos.join(', ')}）` : ''
        message += `・${item}${memoStr}\n`
      }
    }

    message += '\n--- 🔪 全店舗 合算仕込みリスト ---\n'
    const mergedPrep = {}
    [store1Prep.value, store2Prep.value].forEach(prepList => {
      prepList.forEach(i => { 
        if (i.count > 0) {
          const tagsKey = i.tags ? [...i.tags].sort().join(',') : 'C'
          const key = `${i.name}_${tagsKey}`
          if (!mergedPrep[key]) mergedPrep[key] = { name: i.name, tags: i.tags || ['C'], count: 0 }
          mergedPrep[key].count += i.count
        }
      })
    })
    for (const item of Object.values(mergedPrep)) {
      const tagStr = item.tags && item.tags.length > 0 ? ` [${item.tags.join(', ')}]` : ''
      message += `・${item.name}${tagStr}： ${item.count}\n`
    }
  }

  window.location.href = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`
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
      
      <!-- 店舗切り替えスイッチ -->
      <div class="store-switcher">
        <button :class="{ active: currentStore === 'store1' }" @click="currentStore = 'store1'">🏠 1号店</button>
        <button :class="{ active: currentStore === 'store2' }" @click="currentStore = 'store2'">🏢 2号店</button>
      </div>

      <!-- タブ切り替えボタン -->
      <div class="tab-nav">
        <button :class="{ active: activeTab === 'order' }" @click="activeTab = 'order'">🛒 仕入れ表</button>
        <button :class="{ active: activeTab === 'prep' }" @click="activeTab = 'prep'">🔪 仕込み表</button>
      </div>

      <!-- 画面A：仕入れ表 -->
      <div v-if="activeTab === 'order'">
        <div class="sticky-header">
          <div class="header-area">
            <h1>📝 {{ currentStore === 'store1' ? '1号店' : '2号店' }} の仕入れ</h1>
            <label class="edit-toggle">
              <input type="checkbox" v-model="isEditMode">
              <span class="toggle-label" :class="{ active: isEditMode }">{{ isEditMode ? '🛠️ 編集中' : '発注モード' }}</span>
            </label>
          </div>
          <div class="search-box" v-if="!isEditMode">
            <input type="text" v-model="searchQuery" placeholder="🔍 アイテム名で検索..." class="search-input">
          </div>
        </div>
        
        <div v-for="(items, supplier) in filteredSuppliers" :key="supplier" class="supplier-block">
          <div class="supplier-header">
            <h2>{{ supplier }}</h2>
            <button v-if="isEditMode" @click="removeSupplier(supplier)" class="delete-supplier-btn">業者削除</button>
          </div>
          <div class="item-grid">
            <div v-for="item in items" :key="item" class="item-wrapper">
              <button class="item-btn" :class="{ 'is-active': isSelected(supplier, item), 'is-edit': isEditMode }" @click="toggleItem(supplier, item)">{{ item }}</button>
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

      <!-- 画面B：明日の仕込み表 -->
      <div v-if="activeTab === 'prep'">
        <div class="sticky-header">
          <div class="header-area">
            <h1>🔪 {{ currentStore === 'store1' ? '1号店' : '2号店' }} の仕込み</h1>
            <label class="edit-toggle">
              <input type="checkbox" v-model="isEditMode">
              <span class="toggle-label" :class="{ active: isEditMode }">{{ isEditMode ? '🛠️ 編集中' : '仕込みモード' }}</span>
            </label>
          </div>
        </div>

        <div class="prep-list">
          <div v-for="(item, index) in prepItems" :key="item.name" class="prep-item" :class="{ 'is-active': item.count > 0 }">
            <div class="prep-info">
              <span class="prep-name">{{ item.name }}</span>
              <!-- ⭐️ 複数選択可能なタグ切り替えボタン -->
              <div class="tag-selector" v-if="!isEditMode">
                <button 
                  v-for="t in ['C', '洗', 'P']" 
                  :key="t" 
                  class="tag-btn" 
                  :class="{ active: item.tags && item.tags.includes(t) }"
                  @click="toggleTag(item, t)"
                >
                  {{ t }}
                </button>
              </div>
              <span v-else class="tag-badge">[{{ item.tags ? item.tags.join(', ') : 'C' }}]</span>
            </div>

            <div class="counter-box" v-if="!isEditMode">
              <button class="count-btn minus" @click="item.count > 0 ? item.count-- : null" :disabled="item.count === 0">－</button>
              <span class="count-display">{{ item.count }}</span>
              <button class="count-btn plus" @click="item.count++">＋</button>
            </div>

            <button v-if="isEditMode" @click="removePrepItem(index)" class="delete-prep-btn">削除</button>
          </div>
          
          <div v-if="isEditMode" class="add-supplier-area" style="margin-top: 10px;">
            <button @click="addNewPrepItem" class="add-supplier-btn">＋ 新しい仕込み項目を追加</button>
          </div>
        </div>

        <div class="reset-area" v-if="!isEditMode">
          <button @click="resetPrep" class="reset-btn">🔄 すべて 0 に戻す</button>
        </div>

        <div class="bottom-bar" v-if="!isEditMode">
          <button class="confirm-btn" @click="openModal">確認画面へ進む</button>
        </div>
      </div>

    </div>

    <!-- 統合確認モーダル -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h2>✅ 送信内容の確認</h2>
        
        <div class="send-mode-switch">
          <button :class="{ active: sendMode === 'separate' }" @click="sendMode = 'separate'">店舗別に送る</button>
          <button :class="{ active: sendMode === 'merge' }" @click="sendMode = 'merge'">全店舗合算して送る</button>
        </div>

        <div class="modal-list-area">
          <!-- 1号店データ表示 -->
          <div class="store-preview-block">
            <h3>🏠 1号店</h3>
            <div v-if="Object.keys(store1Selected).length > 0">
              <p class="preview-sub">【発注】</p>
              <div v-for="(itemsObj, supplier) in store1Selected" :key="supplier">
                <span style="font-weight: bold; font-size: 14px;">・{{ supplier }}</span>
                <div v-for="(memo, item) in itemsObj" :key="item" class="modal-item-row">
                  <span class="modal-item-name">&nbsp;&nbsp;{{ item }}</span>
                  <input type="text" v-model="store1Selected[supplier][item]" placeholder="例: 2kg" class="modal-memo-input">
                </div>
              </div>
            </div>
            <div v-if="store1Prep.some(i => i.count > 0)">
              <p class="preview-sub" style="color: #ff5252;">【仕込み】</p>
              <div v-for="item in store1Prep.filter(i => i.count > 0)" :key="item.name" class="modal-item-row">
                <span class="modal-item-name">&nbsp;&nbsp;{{ item.name }} [{{ item.tags ? item.tags.join(', ') : 'C' }}]</span>
                <span style="font-weight: bold; color: #ff5252;">{{ item.count }}</span>
              </div>
            </div>
            <p v-if="Object.keys(store1Selected).length === 0 && !store1Prep.some(i => i.count > 0)" class="no-data">入力データなし</p>
          </div>

          <!-- 2号店データ表示 -->
          <div class="store-preview-block" style="margin-top: 20px;">
            <h3>🏢 2号店</h3>
            <div v-if="Object.keys(store2Selected).length > 0">
              <p class="preview-sub">【発注】</p>
              <div v-for="(itemsObj, supplier) in store2Selected" :key="supplier">
                <span style="font-weight: bold; font-size: 14px;">・{{ supplier }}</span>
                <div v-for="(memo, item) in itemsObj" :key="item" class="modal-item-row">
                  <span class="modal-item-name">&nbsp;&nbsp;{{ item }}</span>
                  <input type="text" v-model="store2Selected[supplier][item]" placeholder="例: 2kg" class="modal-memo-input">
                </div>
              </div>
            </div>
            <div v-if="store2Prep.some(i => i.count > 0)">
              <p class="preview-sub" style="color: #ff5252;">【仕込み】</p>
              <div v-for="item in store2Prep.filter(i => i.count > 0)" :key="item.name" class="modal-item-row">
                <span class="modal-item-name">&nbsp;&nbsp;{{ item.name }} [{{ item.tags ? item.tags.join(', ') : 'C' }}]</span>
                <span style="font-weight: bold; color: #ff5252;">{{ item.count }}</span>
              </div>
            </div>
            <p v-if="Object.keys(store2Selected).length === 0 && !store2Prep.some(i => i.count > 0)" class="no-data">入力データなし</p>
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

/* 店舗切り替えスイッチ */
.store-switcher { display: flex; margin-bottom: 10px; border-radius: 8px; overflow: hidden; border: 2px solid #00B900; }
.store-switcher button { flex: 1; padding: 12px; font-size: 16px; font-weight: bold; background: white; border: none; cursor: pointer; color: #00B900; transition: background 0.2s;}
.store-switcher button.active { background: #00B900; color: white; }

/* タブデザイン */
.tab-nav { display: flex; margin-bottom: 15px; border-radius: 8px; overflow: hidden; border: 2px solid #ddd; }
.tab-nav button { flex: 1; padding: 15px; font-size: 16px; font-weight: bold; background: #f9f9f9; border: none; cursor: pointer; color: #666; transition: background 0.2s;}
.tab-nav button.active { background: #333; color: white; }

/* 仕込み表デザイン */
.prep-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 30px; }
.prep-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f9f9f9; border: 2px solid #eee; border-radius: 8px; }
.prep-item.is-active { background: #fffde7; border-color: #ffeb3b; }
.prep-info { display: flex; flex-direction: column; gap: 6px; }
.prep-name { font-size: 18px; font-weight: bold; color: #333; }

/* 複数選択タグのスタイル */
.tag-selector { display: flex; gap: 4px; }
.tag-btn { padding: 2px 8px; font-size: 12px; font-weight: bold; background: #eee; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; color: #555; }
.tag-btn.active { background: #00B900; color: white; border-color: #00B900; }
.tag-badge { font-size: 12px; font-weight: bold; color: #666; background: #e0e0e0; padding: 2px 6px; border-radius: 4px; width: fit-content; }
.delete-prep-btn { background: #ffebee; color: #d32f2f; border: 1px solid #ffcdd2; padding: 6px 12px; border-radius: 4px; font-size: 14px; cursor: pointer; font-weight: bold; }

.counter-box { display: flex; align-items: center; gap: 12px; }
.count-btn { width: 40px; height: 40px; font-size: 20px; font-weight: bold; border-radius: 50%; border: none; cursor: pointer; display: flex; justify-content: center; align-items: center; }
.count-btn.minus { background: #eeeeee; color: #757575; }
.count-btn.minus:disabled { opacity: 0.3; cursor: default; }
.count-btn.plus { background: #ff5252; color: white; }
.count-display { font-size: 20px; font-weight: bold; width: 30px; text-align: center; }

.reset-area { text-align: center; margin-top: 20px; padding-bottom: 20px;}
.reset-btn { padding: 12px 24px; background: white; color: #757575; border: 2px solid #bdbdbd; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; }

/* 下部ボタンの中央寄せ */
.bottom-bar { position: fixed; bottom: 0; left: 0; width: 100%; padding: 16px; background-color: white; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); z-index: 20; display: grid; justify-items: center; box-sizing: border-box;}
.confirm-btn { width: 90%; max-width: 400px; padding: 16px; font-size: 18px; font-weight: bold; background-color: #333; color: white; border: none; border-radius: 30px; cursor: pointer; }

/* モーダル */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-content { background-color: white; width: 90%; max-width: 500px; max-height: 85vh; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; }
.send-mode-switch { display: flex; margin: 15px 0px; height: 100px; border-radius: 6px; overflow: hidden; border: 2px solid #00B900; background: #fff; }
.send-mode-switch button { flex: 1; padding: 12px 8px; font-size: 13px; font-weight: bold; background: white; border: none; cursor: pointer; color: #00B900; text-align: center; line-height: 1.4;}
.send-mode-switch button.active { background: #00B900; color: #ffffff !important; }

.modal-list-area { overflow-y: auto; flex-grow: 1; margin-bottom: 20px; padding-right: 5px; }
.store-preview-block { background: #f9f9f9; padding: 12px; border-radius: 8px; border: 1px solid #eee; }
.store-preview-block h3 { margin: 0 0 8px 0; font-size: 16px; color: #333; }
.preview-sub { font-size: 13px; font-weight: bold; color: #666; margin: 6px 0 2px 0; }
.no-data { font-size: 13px; color: #999; margin: 4px 0; }
.modal-item-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed #eee; }
.modal-memo-input { width: 90px; padding: 6px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; }
.modal-actions { display: flex; gap: 10px; }
.back-btn, .send-btn { flex: 1; padding: 14px; font-size: 16px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; }
.back-btn { background-color: #eee; color: #333; }
.send-btn { background-color: #00B900; color: white; }

/* 既存共通デザイン */
.login-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 70vh; }
.pin-input { font-size: 24px; padding: 10px; margin: 20px 0; width: 220px; text-align: center; border: 2px solid #ccc; border-radius: 8px; }
.unlock-btn { padding: 12px 30px; font-size: 18px; background: #333; color: white; border: none; border-radius: 8px; cursor: pointer; }
.sticky-header { position: sticky; top: 0; background-color: white; z-index: 50; padding: 10px 0 15px 0; border-bottom: 2px solid #f0f0f0; margin-bottom: 20px; }
.header-area { display: flex; justify-content: space-between; align-items: center; }
h1 { font-size: 22px; margin: 0; }
.edit-toggle input { display: none; }
.toggle-label { background: #eee; padding: 8px 12px; border-radius: 20px; font-size: 14px; cursor: pointer; font-weight: bold; border: 2px solid #ccc; color: #666; }
.toggle-label.active { background: #ffebee; border-color: #f44336; color: #d32f2f; }
.search-box { margin-top: 15px; }
.search-input { width: 100%; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; box-sizing: border-box; }
.supplier-block { margin-bottom: 30px; }
.supplier-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #ddd; padding-bottom: 4px; margin-bottom: 10px;}
h2 { font-size: 18px; color: #333; margin: 0; }
.delete-supplier-btn { background: #ffebee; color: #d32f2f; border: 1px solid #ffcdd2; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; }
.item-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.item-wrapper { position: relative; }
.item-btn { padding: 12px 16px; border: 1px solid #ccc; border-radius: 8px; background-color: #f9f9f9; font-size: 16px; cursor: pointer; transition: all 0.2s; }
.item-btn.is-active { background-color: #00B900; color: white; border-color: #00B900; font-weight: bold; }
.item-btn.is-edit { cursor: default; background-color: #f0f0f0; border-style: dashed; }
.delete-item-btn { position: absolute; top: -8px; right: -8px; background: #f44336; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; font-size: 14px; cursor: pointer; font-weight: bold; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.add-item-btn { padding: 12px 16px; border: 1px dashed #2196F3; border-radius: 8px; background-color: #e3f2fd; color: #1976d2; font-size: 14px; cursor: pointer; font-weight: bold;}
.add-supplier-area { text-align: center; margin-top: 20px; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 2px dashed #ccc; }
.add-supplier-btn { padding: 12px 24px; font-size: 16px; background-color: #333; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;}
</style>