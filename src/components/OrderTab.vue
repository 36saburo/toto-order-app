<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentStore: String,
  suppliers: Object,
  selectedItems: Object,
  searchQuery: String,
  isEditMode: Boolean
})

const emit = defineEmits([
  'update:searchQuery',
  'update:isEditMode',
  'toggleItem',
  'updateOrderCount',
  'addNewSupplier',
  'removeSupplier',
  'addNewItem',
  'removeItem',
  'openModal'
])

// ⭐️ 検索バーの入力を親(App.vue)に反映させるための computed
const localSearchQuery = computed({
  get: () => props.searchQuery,
  set: (val) => emit('update:searchQuery', val)
})

// ⭐️ 発注モード/編集モードの切り替えを親に反映させる computed
const localIsEditMode = computed({
  get: () => props.isEditMode,
  set: (val) => emit('update:isEditMode', val)
})

const isSelected = (supplier, item) => props.selectedItems[supplier]?.[item] !== undefined
</script>

<template>
  <div class="order-tab">
    <div class="sticky-header">
      <div class="header-area">
        <h1>📝 {{ currentStore === 'store1' ? '1号店' : '2号店' }} の仕入れ</h1>
        <label class="edit-toggle">
          <input type="checkbox" v-model="localIsEditMode">
          <span class="toggle-label" :class="{ active: localIsEditMode }">{{ localIsEditMode ? '🛠️ 編集中' : '発注モード' }}</span>
        </label>
      </div>
      <div class="search-box" v-if="!localIsEditMode">
        <input type="text" v-model="localSearchQuery" placeholder="🔍 アイテム名で検索..." class="search-input">
      </div>
    </div>
    
    <div v-for="group in suppliers" :key="group.supplier" class="supplier-block">
      <div class="supplier-header">
        <h2>{{ group.supplier }}</h2>
        <button v-if="localIsEditMode" @click="emit('removeSupplier', group.supplier)" class="delete-supplier-btn">業者削除</button>
      </div>
      <div class="item-grid">
        <div v-for="item in group.items" :key="item" class="item-wrapper">
          <button class="item-btn" :class="{ 'is-active': isSelected(group.supplier, item), 'is-edit': localIsEditMode }" @click="emit('toggleItem', group.supplier, item)">{{ item }}</button>
          <button v-if="localIsEditMode" @click="emit('removeItem', group.supplier, item)" class="delete-item-btn">×</button>
          
          <div v-if="isSelected(group.supplier, item) && !localIsEditMode" class="order-counter">
            <button class="order-count-btn minus" @click.stop="emit('updateOrderCount', group.supplier, item, -1)">－</button>
            <span class="order-count-display">{{ selectedItems[group.supplier][item] }}</span>
            <button class="order-count-btn plus" @click.stop="emit('updateOrderCount', group.supplier, item, 1)">＋</button>
          </div>
        </div>
        <button v-if="localIsEditMode" @click="emit('addNewItem', group.supplier)" class="add-item-btn">＋ 追加</button>
      </div>
    </div>
    
    <div v-if="localIsEditMode" class="add-supplier-area">
      <button @click="emit('addNewSupplier')" class="add-supplier-btn">＋ 新しい業者を追加</button>
    </div>

    <div class="bottom-bar" v-if="!localIsEditMode">
      <button class="confirm-btn" @click="emit('openModal')">確認画面へ進む</button>
    </div>
  </div>
</template>

<style scoped>
/* App.vue から仕入れ関連のCSSをお引っ越し */
.sticky-header { position: sticky; top: 0; background-color: white; z-index: 50; padding: 10px 0 15px 0; border-bottom: 2px solid #f0f0f0; margin-bottom: 20px; }
.header-area { display: flex; justify-content: space-between; align-items: center; width: 100%; }
h1 { font-size: 22px; margin: 0; }

.edit-toggle { margin-left: auto; display: flex; align-items: center; }
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

.item-wrapper { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.item-btn { padding: 12px 16px; border: 1px solid #ccc; border-radius: 8px; background-color: #f9f9f9; font-size: 16px; cursor: pointer; transition: all 0.2s; width: 100%; }
.item-btn.is-active { background-color: #00B900; color: white; border-color: #00B900; font-weight: bold; }
.item-btn.is-edit { cursor: default; background-color: #f0f0f0; border-style: dashed; }

.order-counter { display: flex; align-items: center; gap: 8px; background: white; border: 2px solid #00B900; border-radius: 20px; padding: 2px 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.15); margin-top: 2px;}
.order-count-btn { border: none; background: transparent; font-size: 16px; font-weight: bold; cursor: pointer; color: #333; width: 24px; height: 24px; display: flex; justify-content: center; align-items: center; }
.order-count-btn.minus { color: #757575; }
.order-count-btn.plus { color: #ff5252; }
.order-count-display { font-size: 14px; font-weight: bold; min-width: 16px; text-align: center; color: #00B900; }

.delete-item-btn { position: absolute; top: -8px; right: -8px; background: #f44336; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; font-size: 14px; cursor: pointer; font-weight: bold; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 10;}
.add-item-btn { padding: 12px 16px; border: 1px dashed #2196F3; border-radius: 8px; background-color: #e3f2fd; color: #1976d2; font-size: 14px; cursor: pointer; font-weight: bold; height: fit-content;}
.add-supplier-area { text-align: center; margin-top: 20px; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 2px dashed #ccc; }
.add-supplier-btn { padding: 12px 24px; font-size: 16px; background-color: #333; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;}

/* 下部ボタン */
.bottom-bar { position: fixed; bottom: 0; left: 0; width: 100%; padding: 16px; background-color: white; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); z-index: 20; display: grid; justify-items: center; box-sizing: border-box;}
.confirm-btn { width: 90%; max-width: 400px; padding: 16px; font-size: 18px; font-weight: bold; background-color: #333; color: white; border: none; border-radius: 30px; cursor: pointer; }
</style>