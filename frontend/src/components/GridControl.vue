<template>
  <div class="panel" :class="{ readonly: store.readOnly }">
    <h4>⚙️ 网格策略配置</h4>

    <template v-if="!store.readOnly">
      <el-form :model="store.config" label-width="90px" size="small" label-position="top">
        <el-row :gutter="8">
          <el-col :span="12"><el-form-item label="下限价格"><el-input-number v-model="store.config.lowerPrice" :min="50" :max="200" :step="5" controls-position="right"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="上限价格"><el-input-number v-model="store.config.upperPrice" :min="50" :max="200" :step="5" controls-position="right"/></el-form-item></el-col>
        </el-row>
        <el-row :gutter="8">
          <el-col :span="12"><el-form-item label="网格数量"><el-input-number v-model="store.config.gridCount" :min="5" :max="50" :step="5" controls-position="right"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="每格资金"><el-input-number v-model="store.config.capitalPerGrid" :min="100" :max="50000" :step="500" controls-position="right"/></el-form-item></el-col>
        </el-row>
        <el-form-item label="初始资金"><el-input-number v-model="store.config.initialCapital" :min="10000" :max="1000000" :step="10000" controls-position="right"/></el-form-item>
        <el-button type="primary" @click="store.runBacktest" :loading="store.loading" block>🚀 运行回测</el-button>
      </el-form>
    </template>

    <dl v-else class="readonly-config">
      <div class="ro-row"><dt>下限价格</dt><dd>{{ store.config.lowerPrice }}</dd></div>
      <div class="ro-row"><dt>上限价格</dt><dd>{{ store.config.upperPrice }}</dd></div>
      <div class="ro-row"><dt>网格数量</dt><dd>{{ store.config.gridCount }} 格</dd></div>
      <div class="ro-row"><dt>每格资金</dt><dd>¥{{ store.config.capitalPerGrid.toLocaleString() }}</dd></div>
      <div class="ro-row"><dt>初始资金</dt><dd>¥{{ store.config.initialCapital.toLocaleString() }}</dd></div>
      <div class="ro-note">{{ store.isObserve ? '只读观察模式：参数修改入口已隐藏' : '观察者账号：参数为只读' }}</div>
    </dl>

    <div class="grid-info" v-if="store.config.gridCount">
      <div class="info-row"><span>网格间距</span><span>{{ ((store.config.upperPrice-store.config.lowerPrice)/store.config.gridCount).toFixed(2) }}</span></div>
      <div class="info-row"><span>总网格资金</span><span>¥{{ (store.config.gridCount*store.config.capitalPerGrid).toLocaleString() }}</span></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTradingStore } from '../store/trading'
const store = useTradingStore()
</script>
<style scoped>
.panel{background:#0f1535;border-radius:8px;padding:12px;border:1px solid #1e2a5a}
.panel.readonly{border-color:#fbbf2444}
.panel h4{color:#4fc3f7;font-size:13px;margin-bottom:8px}
.grid-info{margin-top:12px;font-size:12px}
.info-row{display:flex;justify-content:space-between;padding:4px 0;color:#94a3b8;border-bottom:1px solid #1e2a5a33}
.readonly-config{font-size:12px}
.ro-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #1e2a5a33}
.ro-row dt{color:#94a3b8}
.ro-row dd{color:#e2e8f0;font-variant-numeric:tabular-nums}
.ro-note{margin-top:10px;font-size:11px;color:#fbbf24;background:#fbbf2410;border:1px solid #fbbf2433;border-radius:4px;padding:6px 8px}
</style>
