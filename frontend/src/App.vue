<template>
  <div class="app-root" :class="{readonly:store.isReadonly}">
    <header class="top-bar">
      <h1>
        📈 实时订单簿深度可视化与量化网格交易引擎
        <span class="mode-badge" v-if="store.isReadonly">🔒 只读观察模式</span>
      </h1>
      <div class="top-actions">
        <el-select :model-value="store.account.id" size="small" class="account-select" @change="store.switchAccount">
          <el-option v-for="a in store.accounts" :key="a.id" :label="a.name" :value="a.id"/>
        </el-select>
        <el-button v-if="!store.isReadonly" size="small" plain @click="enterReadonly">👁 进入只读观察</el-button>
        <el-button v-else size="small" type="warning" plain :disabled="store.isObserver" @click="exitReadonly">退出观察模式</el-button>
        <div class="status"><span class="dot" :class="{on:store.wsConnected}"></span>{{ store.wsConnected?'实时':'已断开' }}</div>
      </div>
    </header>
    <div v-if="store.isReadonly" class="readonly-banner">
      只读观察模式：参数修改与发起计算的入口已隐藏，实时行情、订单簿与报告均按只读呈现；越权操作将被服务端拒绝。{{ store.isObserver ? '当前为只读观察员账号，无法退出观察模式。' : '' }}
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
import { onMounted, onUnmounted, nextTick } from 'vue'
import OrderBookDepth from './components/OrderBookDepth.vue'
import PriceChart from './components/PriceChart.vue'
import GridControl from './components/GridControl.vue'
import BacktestReport from './components/BacktestReport.vue'
import { useTradingStore } from './store/trading'
const store = useTradingStore()

let savedScroll: ScrollToOptions | null = null

// 进入前记录原布局滚动位置；实时连接（store.connectWS 在挂载时建立）不受模式切换影响
function enterReadonly() {
  savedScroll = { left: window.scrollX, top: window.scrollY }
  store.enterReadonly()
}

// 退出后先等原布局恢复，再回到原来的滚动位置
function exitReadonly() {
  if (!store.exitReadonly()) return
  if (savedScroll) {
    const pos = savedScroll
    nextTick(() => requestAnimationFrame(() => window.scrollTo(pos)))
  }
}

// 与原逻辑一致：只在挂载/卸载时连接，模式切换不重连，实时连接状态提示不受影响
onMounted(() => store.connectWS())
onUnmounted(() => store.disconnectWS())
</script>

<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#0a0e27;color:#e0e0e0}
.app-root{min-height:100vh}
.top-bar{display:flex;justify-content:space-between;align-items:center;padding:10px 24px;background:#0f1535;border-bottom:1px solid #1e2a5a}
.top-bar h1{font-size:1.1rem;color:#4fc3f7;display:flex;align-items:center;gap:10px}
.top-actions{display:flex;align-items:center;gap:10px}
.account-select{width:180px}
.mode-badge{font-size:11px;font-weight:400;color:#fbbf24;border:1px solid #fbbf2455;background:#fbbf2410;border-radius:10px;padding:2px 8px}
.readonly-banner{margin:12px 24px 0;padding:8px 12px;font-size:12px;color:#fbbf24;background:#fbbf2410;border:1px solid #fbbf2433;border-radius:6px}
.status{display:flex;align-items:center;gap:6px;font-size:12px;color:#94a3b8}
.dot{width:8px;height:8px;border-radius:50%;background:#ef4444}.dot.on{background:#22c55e}
.main-grid{display:grid;grid-template-columns:1fr 360px;gap:12px;padding:12px 24px;min-height:85vh}
.col-narrow{display:flex;flex-direction:column;gap:12px;overflow-y:auto}
</style>
