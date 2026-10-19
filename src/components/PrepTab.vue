<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentStore: String,
  prepItems: Array,
  isEditMode: Boolean
})

const emit = defineEmits([
  'update:isEditMode',
  'toggleTag',
  'removePrepItem',
  'addNewPrepItem',
  'resetPrep',
  'openModal'
])

const localIsEditMode = computed({
  get: () => props.isEditMode,
  set: (val) => emit('update:isEditMode', val)
})
</script>

<template>
  <div class="prep-tab">
    <div class="sticky-header">
      <div class="header-area">
        <h1>🔪 {{ currentStore === 'store1' ? '1号店' : '2号店' }} の仕込み</h1>
        <label class="edit-toggle">
          <input type="checkbox" v-model="localIsEditMode">
          <span class="toggle-label" :class="{ active: localIsEditMode }">{{ localIsEditMode ? '🛠️ 編集中' : '仕込みモード' }}</span>
        </label>
      </div>
    </div>

    <div class="prep-list">
      <div v-for="(item, index) in prepItems" :key="item.name" class="prep-item" :class="{ 'is-active': item.count > 0 }">
        <div class="prep-info">
          <span class="prep-name">{{ item.name }}</span>
          <div class="tag-selector" v-if="!localIsEditMode">
            <button 
              v-for="t in ['C', '洗', 'P']" 
              :key="t" 
              class="tag-btn" 
              :class="{ active: item.tags && item.tags.includes(t) }"
              @click="emit('toggleTag', item, t)"
            >
              {{ t }}
            </button>
          </div>
          <span v-else class="tag-badge">[{{ item.tags ? item.tags.join(', ') : 'C' }}]</span>
        </div>

        <div class="counter-box" v-if="!localIsEditMode">
          <button class="count-btn minus" @click="item.count > 0 ? item.count-- : null" :disabled="item.count === 0">－</button>
          <span class="count-display">{{ item.count }}</span>
          <button class="count-btn plus" @click="item.count++">＋</button>
        </div>

        <button v-if="localIsEditMode" @click="emit('removePrepItem', index)" class="delete-prep-btn">削除</button>
      </div>
      
      <div v-if="localIsEditMode" class="add-supplier-area" style="margin-top: 10px;">
        <button @click="emit('addNewPrepItem')" class="add-supplier-btn">＋ 新しい仕込み項目を追加</button>
      </div>
    </div>

    <div class="reset-area" v-if="!localIsEditMode">
      <button @click="emit('resetPrep')" class="reset-btn">🔄 すべて 0 に戻す</button>
    </div>

    <div class="bottom-bar" v-if="!localIsEditMode">
      <button class="confirm-btn" @click="emit('openModal')">確認画面へ進む</button>
    </div>
  </div>
</template>

<style scoped>
/* App.vue から仕込み関連のCSSをお引っ越し */
.sticky-header { position: sticky; top: 0; background-color: white; z-index: 50; padding: 10px 0 15px 0; border-bottom: 2px solid #f0f0f0; margin-bottom: 20px; }
.header-area { display: flex; justify-content: space-between; align-items: center; width: 100%; }
h1 { font-size: 22px; margin: 0; }

.edit-toggle { margin-left: auto; display: flex; align-items: center; }
.edit-toggle input { display: none; }
.toggle-label { background: #eee; padding: 8px 12px; border-radius: 20px; font-size: 14px; cursor: pointer; font-weight: bold; border: 2px solid #ccc; color: #666; }
.toggle-label.active { background: #ffebee; border-color: #f44336; color: #d32f2f; }

.prep-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 30px; }
.prep-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f9f9f9; border: 2px solid #eee; border-radius: 8px; }
.prep-item.is-active { background: #fffde7; border-color: #ffeb3b; }
.prep-info { display: flex; flex-direction: column; gap: 6px; }
.prep-name { font-size: 18px; font-weight: bold; color: #333; }
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

.add-supplier-area { text-align: center; margin-top: 20px; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 2px dashed #ccc; }
.add-supplier-btn { padding: 12px 24px; font-size: 16px; background-color: #333; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;}

.bottom-bar { position: fixed; bottom: 0; left: 0; width: 100%; padding: 16px; background-color: white; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); z-index: 20; display: grid; justify-items: center; box-sizing: border-box;}
.confirm-btn { width: 90%; max-width: 400px; padding: 16px; font-size: 18px; font-weight: bold; background-color: #333; color: white; border: none; border-radius: 30px; cursor: pointer; }
</style>