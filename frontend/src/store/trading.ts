import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import type { Tick, OrderBook, GridConfig, GridResult, Account, AccountRole } from '@/types'

// 可切换的账号：交易员可操作，观察员全程只读（受控视图）
const ACCOUNTS: Account[] = [
  { id: 'trader-01', name: '交易员（操作账号）', role: 'trader' },
  { id: 'observer-01', name: '观察员（只读账号）', role: 'observer' },
]
const MODE_KEY = 'grid:viewMode' // 'readonly' | 'interactive'
const ACCOUNT_KEY = 'grid:accountId'

function loadMode(): 'readonly' | 'interactive' {
  return localStorage.getItem(MODE_KEY) === 'readonly' ? 'readonly' : 'interactive'
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

  const account = ref<Account>(loadAccount())
  // 刷新后仍停在进入前的模式；观察员账号强制只读
  const viewMode = ref<'readonly' | 'interactive'>(account.value.role === 'observer' ? 'readonly' : loadMode())

  const isReadonly = computed(() => viewMode.value === 'readonly')
  const isObserver = computed(() => account.value.role === 'observer')

  /**
   * 受控视图统一守卫：只读模式 / 观察员账号下任何写操作（改参数、发起计算）都被拒绝。
   * 返回 true 表示允许，false 表示已拦截并说明原因。
   */
  function guardWrite(action: string): boolean {
    if (isObserver.value) {
      ElMessage.warning(`已拒绝${action}：当前账号「${account.value.name}」为只读观察员，不具备参数修改与计算权限。`)
      return false
    }
    if (isReadonly.value) {
      ElMessage.warning(`已拒绝${action}：当前处于只读观察模式，请先退出观察模式后再操作。`)
      return false
    }
    return true
  }

  /** 进入只读观察模式 */
  function enterReadonly() {
    if (isReadonly.value) return
    viewMode.value = 'readonly'
    localStorage.setItem(MODE_KEY, 'readonly')
  }

  /** 退出只读观察模式（观察员账号无权退出） */
  function exitReadonly() {
    if (!isReadonly.value) return true
    if (!guardWrite('退出观察模式')) return false
    viewMode.value = 'interactive'
    localStorage.setItem(MODE_KEY, 'interactive')
    return true
  }

  /** 切换账号；观察员只能停留在只读受控视图 */
  function switchAccount(id: string) {
    const next = ACCOUNTS.find(a => a.id === id)
    if (!next) return
    account.value = next
    localStorage.setItem(ACCOUNT_KEY, next.id)
    if (next.role === 'observer') {
      viewMode.value = 'readonly'
      localStorage.setItem(MODE_KEY, 'readonly')
    }
  }

  /** 受控修改参数：只读视图下改参数入口已隐藏，这里再兜底拦截程序化越权修改 */
  function updateConfig(patch: Partial<GridConfig>) {
    if (!guardWrite('修改网格参数')) return
    Object.assign(config.value, patch)
  }

  let ws: WebSocket | null = null
  function connectWS() {
    // 实时连接与视图模式无关，进入/退出观察模式都不重连，避免连接状态提示抖动
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

  async function runBacktest() {
    if (!guardWrite('发起回测计算')) return
    loading.value = true
    try {
      const { data } = await axios.post('/api/backtest', config.value, {
        // 把受控视图身份带给后端做服务端鉴权，防止绕过 UI 直接调接口
        headers: {
          'X-Account-Role': account.value.role as AccountRole,
          'X-View-Mode': viewMode.value,
        },
      })
      gridResult.value = data
    } catch (err: any) {
      const reason = err?.response?.data?.detail ?? '计算服务暂不可用'
      ElMessage.error(`已拒绝发起计算：${reason}`)
    } finally {
      loading.value = false
    }
  }

  function disconnectWS() { ws?.close(); ws = null; wsConnected.value = false }

  return {
    loading, ticks, orderBook, gridResult, wsConnected, config,
    account, accounts: ACCOUNTS, viewMode, isReadonly, isObserver,
    guardWrite, enterReadonly, exitReadonly, switchAccount, updateConfig,
    connectWS, runBacktest, disconnectWS,
  }
})
