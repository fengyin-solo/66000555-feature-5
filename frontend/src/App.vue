<template>
  <div class="app-root">
    <header class="top-bar">
      <div class="title-wrap">
        <h1>📈 实时订单簿深度可视化与量化网格交易引擎</h1>
        <span v-if="store.isObserve" class="mode-badge">👁 只读观察</span>
      </div>
      <div class="top-actions">
        <el-select v-model="accountId" size="small" class="account-select" :title="'当前账号'">
          <el-option v-for="a in store.accounts" :key="a.id" :value="a.id"
            :label="a.name + (a.role === 'viewer' ? '（观察者）' : '（交易员）')" />
        </el-select>
        <button class="mode-toggle" :class="{ on: store.isObserve }" @click="toggleMode">
          {{ store.isObserve ? '🚪 退出观察' : '👁 进入只读观察' }}
        </button>
        <!-- 实时连接状态：不随模式切换改动，直接读取 wsConnected -->
        <div class="status"><span class="dot" :class="{on:store.wsConnected}"></span>{{ store.wsConnected?'实时':'已断开' }}</div>
      </div>
    </header>
    <div class="mode-banner" v-if="store.readOnly" :class="{ observe: store.isObserve, viewer: !store.isObserve }">
      <template v-if="store.isObserve">🔒 只读观察模式：行情、订单簿与报告按只读呈现，修改参数与发起计算的入口已隐藏。</template>
      <template v-else>👤 观察者账号：仅可查看实时行情、订单簿与报告，无修改参数 / 发起回测权限。</template>
    </div>
    <div class="main-grid">
      <div class="col-wide">
        <OrderBookDepth />
        <PriceChart />
      </div>
      <div class="col-narrow">
        <GridControl />
        <BacktestReport />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import OrderBookDepth from './components/OrderBookDepth.vue'
import PriceChart from './components/PriceChart.vue'
import GridControl from './components/GridControl.vue'
import BacktestReport from './components/BacktestReport.vue'
import { useTradingStore } from './store/trading'
const store = useTradingStore()
onMounted(() => store.connectWS())
onUnmounted(() => store.disconnectWS())

const accountId = computed({
  get: () => store.currentAccount.id,
  set: (id: string) => { const a = store.accounts.find(x => x.id === id); if (a) store.setAccount(a) }
})

// 页面标题与模式保持一致：h1 文案不变，文档标题同步加只读前缀
watch(() => store.isObserve, (ob) => {
  document.title = ob ? '只读观察 · 量化网格交易引擎' : '量化网格交易引擎'
}, { immediate: true })

// 进入观察前快照全部滚动容器的位置，退出后恢复，避免布局变化丢失阅读位置
let scrollSnapshot: { windowY: number; positions: Map<Element, number> } | null = null
function collectScrollables(): Element[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.main-grid *')).filter(el => {
    const s = getComputedStyle(el)
    return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1
  })
}
function snapshotScroll() {
  const positions = new Map<Element, number>()
  collectScrollables().forEach(el => positions.set(el, el.scrollTop))
  scrollSnapshot = { windowY: window.scrollY, positions }
}
function restoreScroll() {
  if (!scrollSnapshot) return
  const snap = scrollSnapshot
  nextTick(() => requestAnimationFrame(() => {
    snap.positions.forEach((top, el) => { el.scrollTop = top })
    window.scrollTo(0, snap.windowY)
    scrollSnapshot = null
  }))
}
function toggleMode() {
  if (!store.isObserve) {
    snapshotScroll()
    store.setViewMode('observe')
  } else {
    // 退出总是允许：观察者退出后仍受角色约束，但布局回到 live
    store.setViewMode('live')
  }
}
watch(() => store.viewMode, (m) => { if (m === 'live') restoreScroll() })
</script>

<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#0a0e27;color:#e0e0e0}
.app-root{min-height:100vh}
.top-bar{display:flex;justify-content:space-between;align-items:center;padding:10px 24px;background:#0f1535;border-bottom:1px solid #1e2a5a;gap:12px;flex-wrap:wrap}
.title-wrap{display:flex;align-items:center;gap:10px}
.top-bar h1{font-size:1.1rem;color:#4fc3f7}
.mode-badge{font-size:11px;font-weight:600;color:#fbbf24;background:#fbbf2418;border:1px solid #fbbf2455;border-radius:10px;padding:2px 10px;white-space:nowrap}
.top-actions{display:flex;align-items:center;gap:10px}
.account-select{width:190px}
.account-select .el-input__wrapper{background:#0a0e27}
.mode-toggle{font-size:12px;color:#cbd5e1;background:#1e2a5a;border:1px solid #334155;border-radius:6px;padding:6px 12px;cursor:pointer;white-space:nowrap}
.mode-toggle:hover{border-color:#4fc3f7;color:#4fc3f7}
.mode-toggle.on{color:#fbbf24;border-color:#fbbf2466;background:#fbbf2412}
.status{display:flex;align-items:center;gap:6px;font-size:12px;color:#94a3b8}
.dot{width:8px;height:8px;border-radius:50%;background:#ef4444}.dot.on{background:#22c55e}
.mode-banner{font-size:12px;padding:7px 24px;color:#fbbf24;background:#fbbf240d;border-bottom:1px solid #fbbf2433}
.mode-banner.viewer{color:#94a3b8;background:#1e2a5a22;border-bottom-color:#1e2a5a}
.main-grid{display:grid;grid-template-columns:1fr 360px;gap:12px;padding:12px 24px;min-height:85vh}
.col-narrow{display:flex;flex-direction:column;gap:12px;overflow-y:auto}
</style>
