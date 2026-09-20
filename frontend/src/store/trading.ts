import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import type { Tick, OrderBook, GridConfig, GridResult, ViewMode, Account } from '@/types'

// 受控账号清单与后端 backend/app/authz.py 保持一致
const ACCOUNTS: Account[] = [
  { id: 'trader-01', name: '交易员 · 李明', role: 'trader' },
  { id: 'viewer-01', name: '观察者 · 王芳', role: 'viewer' }
]
const MODE_KEY = 'grid.viewMode'
const ACCOUNT_KEY = 'grid.accountId'

function loadMode(): ViewMode {
  return localStorage.getItem(MODE_KEY) === 'observe' ? 'observe' : 'live'
}
function loadAccount(): Account {
  const id = localStorage.getItem(ACCOUNT_KEY)
  return ACCOUNTS.find(a => a.id === id) ?? ACCOUNTS[0]
}

export const useTradingStore = defineStore('trading', () => {
  const loading = ref(false)
  const ticks = ref<Tick[]>([])
  const orderBook = ref<OrderBook | null>(null)
  const gridResult = ref<GridResult | null>(null)
  const wsConnected = ref(false)
  const config = ref<GridConfig>({ lowerPrice: 95, upperPrice: 115, gridCount: 20, capitalPerGrid: 1000, initialCapital: 100000 })

  const accounts = ref<Account[]>(ACCOUNTS)
  const currentAccount = ref<Account>(loadAccount())
  // 刷新后仍停在进入前的模式：初始化即读取 localStorage
  const viewMode = ref<ViewMode>(loadMode())
  const isObserve = computed(() => viewMode.value === 'observe')
  const isViewer = computed(() => currentAccount.value.role === 'viewer')
  // 只读口径只有一个：观察模式下全员受控；观察者账号即便在 live 模式也不能改参数/发起计算
  const readOnly = computed(() => isObserve.value || isViewer.value)

  let ws: WebSocket | null = null
  // 模式切换不触碰 WebSocket：订阅只建立一次，实时连接状态提示不会被改坏
  function connectWS() {
    if (ws) return
    ws = new WebSocket(`ws://${location.hostname}:8000/ws`)
    ws.onopen = () => { wsConnected.value = true }
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        if (d.ticks) ticks.value = d.ticks.slice(-60)
        if (d.orderBook) orderBook.value = d.orderBook
      } catch {}
    }
    ws.onclose = () => { wsConnected.value = false; ws = null }
  }

  function denyReason(action: string): string {
    if (isObserve.value) return `只读观察模式已开启，不能${action}；退出观察模式后再试。`
    return `当前账号“${currentAccount.value.name}”为观察者，无${action}权限。`
  }

  // 所有改参数 / 发起计算的入口统一走这里；返回 false 表示已拒绝并说明原因
  function guardMutation(action: string): boolean {
    if (readOnly.value) {
      ElMessage.warning({ message: denyReason(action), duration: 3000 })
      return false
    }
    return true
  }

  // 防止通过 devtools / 控制台直接改 store 的受控参数
  function patchConfig(patch: Partial<GridConfig>): boolean {
    if (!guardMutation('修改网格参数')) return false
    config.value = { ...config.value, ...patch }
    return true
  }

  function setViewMode(mode: ViewMode) {
    if (viewMode.value === mode) return
    viewMode.value = mode
    localStorage.setItem(MODE_KEY, mode)
  }
  function setAccount(account: Account) {
    currentAccount.value = account
    localStorage.setItem(ACCOUNT_KEY, account.id)
  }

  async function runBacktest() {
    if (!guardMutation('发起回测计算')) return
    loading.value = true
    try {
      // 后端做二次强制校验，前端绕过也会被拒绝
      const { data } = await axios.post('/api/backtest', config.value, {
        headers: { 'X-Account-Id': currentAccount.value.id, 'X-View-Mode': viewMode.value }
      })
      gridResult.value = data
    } catch (err: any) {
      const reason: string = err?.response?.data?.detail ?? '回测请求失败，请稍后重试'
      ElMessage.error({ message: `操作被拒绝：${reason}`, duration: 3500 })
    } finally {
      loading.value = false
    }
  }

  function disconnectWS() { ws?.close(); ws = null; wsConnected.value = false }

  return {
    loading, ticks, orderBook, gridResult, wsConnected, config,
    accounts, currentAccount, viewMode, isObserve, isViewer, readOnly,
    connectWS, runBacktest, disconnectWS,
    patchConfig, guardMutation, setViewMode, setAccount
  }
})
