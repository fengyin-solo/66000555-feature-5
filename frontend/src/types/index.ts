export interface Tick { time: string; price: number; bid: number; ask: number; volume: number }
export interface OrderBook { bids: [number,number][]; asks: [number,number][]; midPrice: number; spread: number }
export interface GridConfig { lowerPrice: number; upperPrice: number; gridCount: number; capitalPerGrid: number; initialCapital: number }
export interface GridOrder { id: number; price: number; side: string; quantity: number; status: string; profit: number }
export interface GridResult { orders: GridOrder[]; totalProfit: number; returnRate: number; sharpeRatio: number; maxDrawdown: number; winRate: number; equityCurve: number[] }

// 视图模式：live = 可操作（受账号角色约束）；observe = 只读观察（任何账号均受控）
export type ViewMode = 'live' | 'observe'
export type AccountRole = 'trader' | 'viewer'
export interface Account { id: string; name: string; role: AccountRole }
