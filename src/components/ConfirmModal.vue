<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  show: Boolean,
  store1Selected: Object,
  store2Selected: Object,
  store1Prep: Array,
  store2Prep: Array
})

const emit = defineEmits(['close'])

const sendMode = ref('separate')

const orderedSuppliers = computed(() => {
  const names = []
  const seen = new Set()
  ;[props.store1Selected, props.store2Selected].forEach(selected => {
    Object.entries(selected || {}).forEach(([supplier, itemsObj]) => {
      if (!itemsObj || Object.keys(itemsObj).length === 0 || seen.has(supplier)) return
      seen.add(supplier)
      names.push(supplier)
    })
  })
  return names
})

const parseQty = (value) => {
  const text = String(value ?? '').trim().replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
  if (!text) return null
  const matched = text.match(/^(\d+(?:\.\d+)?)(.*)$/)
  if (!matched) return { amount: null, unit: '', raw: text }
  return { amount: Number(matched[1]), unit: matched[2].trim(), raw: text }
}

const formatAmount = (amount) => (
  Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100)
)

const combineQty = (a, b) => {
  const left = parseQty(a)
  const right = parseQty(b)
  if (!left && !right) return ''
  if (!left) return right.amount == null ? right.raw : `${formatAmount(right.amount)}${right.unit}`
  if (!right) return left.amount == null ? left.raw : `${formatAmount(left.amount)}${left.unit}`
  const unitsConflict = left.unit && right.unit && left.unit !== right.unit
  if (left.amount == null || right.amount == null || unitsConflict) return `${left.raw}+${right.raw}`
  return `${formatAmount(left.amount + right.amount)}${left.unit || right.unit}`
}

const supplierOrderLines = (supplier) => {
  const store1Items = props.store1Selected?.[supplier] || {}
  const store2Items = props.store2Selected?.[supplier] || {}
  const names = []
  const seen = new Set()
  ;[store1Items, store2Items].forEach(itemsObj => {
    Object.keys(itemsObj).forEach(item => {
      if (seen.has(item)) return
      seen.add(item)
      names.push(item)
    })
  })
  return names.map(item => {
    const qty = combineQty(store1Items[item], store2Items[item])
    return qty ? `・${item} （${qty}）` : `・${item}`
  }).join('\n')
}

const sendSupplierToLine = (supplier) => {
  const message = `【トトグループ 発注】${supplier}\n\n${supplierOrderLines(supplier)}`
  window.location.href = `https://line.me/R/msg/text/?${encodeURIComponent(message.trim())}`
}

// ⭐️ App.vue からお引っ越ししてきたLINE送信処理
const sendToLine = () => {
  let message = '【トトグループ 業務連絡】\n\n'

  if (sendMode.value === 'separate') {
    message += '--- 🏠 1号店 ---\n'
    if (Object.keys(props.store1Selected).length > 0) {
      message += '【発注】\n'
      for (const [supplier, itemsObj] of Object.entries(props.store1Selected)) {
        message += `［${supplier}］\n`
        for (const [item, memo] of Object.entries(itemsObj)) {
          const memoText = memo ? String(memo).trim() : ''
          message += memoText !== '' ? `・${item} （${memoText}）\n` : `・${item}\n`
        }
      }
    }
    if (props.store1Prep.some(i => i.count > 0)) {
      message += '【明日の仕込み】\n'
      props.store1Prep.filter(i => i.count > 0).forEach(item => {
        const tagStr = item.tags && item.tags.length > 0 ? ` [${item.tags.join(', ')}]` : ''
        message += `・${item.name}${tagStr}： ${item.count}\n`
      })
    }
    message += '\n--- 🏠 2号店 ---\n'
    if (Object.keys(props.store2Selected).length > 0) {
      message += '【発注】\n'
      for (const [supplier, itemsObj] of Object.entries(props.store2Selected)) {
        message += `［${supplier}］\n`
        for (const [item, memo] of Object.entries(itemsObj)) {
          const memoText = memo ? String(memo).trim() : ''
          message += memoText !== '' ? `・${item} （${memoText}）\n` : `・${item}\n`
        }
      }
    }
    if (props.store2Prep.some(i => i.count > 0)) {
      message += '【明日の仕込み】\n'
      props.store2Prep.filter(i => i.count > 0).forEach(item => {
        const tagStr = item.tags && item.tags.length > 0 ? ` [${item.tags.join(', ')}]` : ''
        message += `・${item.name}${tagStr}： ${item.count}\n`
      })
    }
  } else {
    message += '--- 🛒 全店舗 合算発注リスト ---\n'
    const mergedOrders = {}

    ;[props.store1Selected, props.store2Selected].forEach(orderObj => {
      if (!orderObj) return
      for (const [supplier, itemsObj] of Object.entries(orderObj)) {
        if (!mergedOrders[supplier]) mergedOrders[supplier] = {}
        for (const [item, memo] of Object.entries(itemsObj)) {
          mergedOrders[supplier][item] = Object.prototype.hasOwnProperty.call(mergedOrders[supplier], item)
            ? combineQty(mergedOrders[supplier][item], memo)
            : (memo ? String(memo).trim() : '')
        }
      }
    })

    for (const [supplier, itemsObj] of Object.entries(mergedOrders)) {
      message += `［${supplier}］\n`
      for (const [item, qty] of Object.entries(itemsObj)) {
        message += qty ? `・${item} （${qty}）\n` : `・${item}\n`
      }
    }

    message += '\n--- 🔪 全店舗 合算仕込みリスト ---\n'
    const mergedPrep = {}
    
    ;[props.store1Prep, props.store2Prep].forEach(prepList => {
      if (!prepList) return
      prepList.forEach(i => { 
        if (i.count > 0) {
          const tagsArr = Array.isArray(i.tags) ? i.tags : (i.tag ? [i.tag] : ['C'])
          const tagsKey = [...tagsArr].sort().join(',')
          const key = `${i.name}_${tagsKey}`
          if (!mergedPrep[key]) mergedPrep[key] = { name: i.name, tags: tagsArr, count: 0 }
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
  <div v-if="show" class="modal-overlay">
    <div class="modal-content">
      <h2>✅ 送信内容の確認</h2>
      
      <div class="send-mode-switch">
        <button :class="{ active: sendMode === 'separate' }" @click="sendMode = 'separate'">店舗別に送る</button>
        <button :class="{ active: sendMode === 'merge' }" @click="sendMode = 'merge'">全店舗合算して送る</button>
      </div>

      <div class="modal-list-area">
        <div class="store-preview-block">
          <h3>🏠 1号店</h3>
          <div v-if="Object.keys(store1Selected).length > 0">
            <p class="preview-sub">【発注】</p>
            <div v-for="(itemsObj, supplier) in store1Selected" :key="supplier">
              <span style="font-weight: bold; font-size: 14px;">・{{ supplier }}</span>
              <div v-for="(memo, item) in itemsObj" :key="item" class="modal-item-row">
                <span class="modal-item-name">&nbsp;&nbsp;{{ item }}</span>
                <input type="text" v-model="store1Selected[supplier][item]" placeholder="個数や単位" class="modal-memo-input">
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

        <div class="store-preview-block" style="margin-top: 20px;">
          <h3>🏢 2号店</h3>
          <div v-if="Object.keys(store2Selected).length > 0">
            <p class="preview-sub">【発注】</p>
            <div v-for="(itemsObj, supplier) in store2Selected" :key="supplier">
              <span style="font-weight: bold; font-size: 14px;">・{{ supplier }}</span>
              <div v-for="(memo, item) in itemsObj" :key="item" class="modal-item-row">
                <span class="modal-item-name">&nbsp;&nbsp;{{ item }}</span>
                <input type="text" v-model="store2Selected[supplier][item]" placeholder="個数や単位" class="modal-memo-input">
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

      <div v-if="orderedSuppliers.length" class="supplier-send-list">
        <p class="supplier-send-label">業者ごとに送る（1号店と2号店の個数を足した数）</p>
        <div v-for="supplier in orderedSuppliers" :key="supplier" class="supplier-send-block">
          <button type="button" class="supplier-send-btn" @click="sendSupplierToLine(supplier)">
            {{ supplier }}
          </button>
          <p class="supplier-send-preview">{{ supplierOrderLines(supplier) }}</p>
        </div>
      </div>

      <div class="modal-actions">
        <button class="back-btn" @click="emit('close')">戻る</button>
        <button class="send-btn" @click="sendToLine">まとめてLINEに送る</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-content { background-color: white; width: 90%; max-width: 500px; max-height: 85vh; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; }
.send-mode-switch { display: flex; margin: 15px 0px; height: 46px; border-radius: 6px; overflow: hidden; border: 2px solid #00B900; background: #fff; box-sizing: border-box; }
.send-mode-switch button { flex: 1; height: 100%; padding: 0 4px; font-size: 13px; font-weight: bold; background: white; border: none; cursor: pointer; color: #00B900; display: flex; align-items: center; justify-content: center; text-align: center; }
.send-mode-switch button.active { background: #00B900 !important; color: #ffffff !important; }
.modal-list-area { overflow-y: auto; flex-grow: 1; margin-bottom: 20px; padding-right: 5px; }
.store-preview-block { background: #f9f9f9; padding: 12px; border-radius: 8px; border: 1px solid #eee; }
.store-preview-block h3 { margin: 0 0 8px 0; font-size: 16px; color: #333; }
.preview-sub { font-size: 13px; font-weight: bold; color: #666; margin: 6px 0 2px 0; }
.no-data { font-size: 13px; color: #999; margin: 4px 0; }
.modal-item-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed #eee; }
.modal-memo-input { width: 90px; padding: 6px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; }
.supplier-send-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.supplier-send-label { margin: 0; font-size: 13px; font-weight: bold; color: #333; }
.supplier-send-block { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.supplier-send-btn { padding: 8px 12px; font-size: 13px; font-weight: bold; background: white; color: #00B900; border: 2px solid #00B900; border-radius: 999px; cursor: pointer; }
.supplier-send-preview { margin: 0; font-size: 13px; line-height: 1.5; white-space: pre-line; color: #333; }
.modal-actions { display: flex; gap: 10px; }
.back-btn, .send-btn { flex: 1; padding: 14px; font-size: 16px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; }
.back-btn { background-color: #eee; color: #333; }
.send-btn { background-color: #00B900; color: white; }
</style>