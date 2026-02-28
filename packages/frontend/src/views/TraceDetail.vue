<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTimezoneStore } from '../stores/timezone';
import { getTraceById, formatDuration, buildSpanTree, flattenSpanTree, type SpanNode } from '../api';
import { Loading, ArrowDown, ArrowRight } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const timezoneStore = useTimezoneStore();

const traceId = route.params.traceId as string;
const trace = ref<any>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedSpan = ref<SpanNode | null>(null);
const expandedSpans = ref<Set<string>>(new Set());

// 大 trace 处理
const MAX_DISPLAY_SPANS = 500;
const showAllSpans = ref(false);

onMounted(async () => {
  await loadTrace();
});

async function loadTrace() {
  loading.value = true;
  error.value = null;
  try {
    const data = await getTraceById(traceId);
    if (!data) {
      error.value = 'Trace not found';
      return;
    }
    trace.value = data;
    // Auto-expand root spans
    const tree = buildSpanTree(data.spans);
    if (tree.length > 0) {
      expandedSpans.value.add(tree[0].spanId);
    }
  } catch (e) {
    error.value = 'Failed to load trace';
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function toggleSpan(spanId: string) {
  if (expandedSpans.value.has(spanId)) {
    expandedSpans.value.delete(spanId);
  } else {
    expandedSpans.value.add(spanId);
  }
}

function selectSpan(span: SpanNode) {
  selectedSpan.value = span;
}

const isLargeTrace = computed(() => {
  return (trace.value?.spans?.length || 0) > MAX_DISPLAY_SPANS;
});

const spanTree = computed(() => {
  if (!trace.value?.spans) return [];
  return buildSpanTree(trace.value.spans);
});

const flatSpans = computed(() => {
  const all = flattenSpanTree(spanTree.value);
  if (showAllSpans.value || all.length <= MAX_DISPLAY_SPANS) {
    return all;
  }
  return all.slice(0, MAX_DISPLAY_SPANS);
});

const maxDuration = computed(() => {
  return trace.value?.duration || 1;
});

function getWaterfallWidth(span: SpanNode): number {
  return (span.duration / maxDuration.value) * 100;
}

function getWaterfallLeft(span: SpanNode): number {
  return (span.startTime / maxDuration.value) * 100;
}

function getIndent(depth: number): number {
  return depth * 24;
}

// 计算统计数据
const stats = computed(() => {
  const spans = trace.value?.spans || [];
  const errorCount = spans.filter((s: any) => s.statusCode === 'Error' || s.statusCode === 'STATUS_CODE_ERROR').length;

  return {
    spanCount: spans.length,
    errorCount,
    errorRate: spans.length > 0 ? ((errorCount / spans.length) * 100).toFixed(1) : '0',
  };
});
</script>

<template>
  <div class="trace-detail-page">
    <div v-if="loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>Loading trace...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <el-alert type="error" :title="error" show-icon />
    </div>

    <div v-else-if="trace" class="trace-content">
      <!-- Trace Header -->
      <div class="trace-header card">
        <div class="header-top">
          <el-button @click="router.back()" text>
            <el-icon><ArrowRight /></el-icon>
            Back
          </el-button>
          <div class="trace-title">
            <span class="trace-id">Trace: {{ traceId.slice(0, 16) }}...</span>
            <span
              class="status-badge"
              :class="trace.statusCode === 'Error' || trace.statusCode === 'STATUS_CODE_ERROR' ? 'error' : 'success'"
            >
              {{ trace.statusCode === 'Error' || trace.statusCode === 'STATUS_CODE_ERROR' ? 'Error' : 'OK' }}
            </span>
          </div>
        </div>

        <div class="trace-meta">
          <div class="meta-item">
            <span class="label">Service</span>
            <span class="value">{{ trace.rootSpan?.serviceName || '-' }}</span>
          </div>
          <div class="meta-item">
            <span class="label">Operation</span>
            <span class="value operation-name">{{ trace.rootSpan?.spanName || '-' }}</span>
          </div>
          <div class="meta-item">
            <span class="label">Duration</span>
            <span class="value duration">{{ formatDuration(trace.duration) }}</span>
          </div>
          <div class="meta-item">
            <span class="label">Spans</span>
            <span class="value">{{ stats.spanCount }}</span>
          </div>
          <div class="meta-item">
            <span class="label">Errors</span>
            <span class="value" :class="{ 'text-error': stats.errorCount > 0 }">{{ stats.errorCount }}</span>
          </div>
          <div class="meta-item">
            <span class="label">Time</span>
            <span class="value time-text">{{ trace.rootSpan?.timestamp ? timezoneStore.formatTime(trace.rootSpan.timestamp) : '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ formatDuration(trace.duration) }}</div>
          <div class="stat-label">Total Duration</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.spanCount }}</div>
          <div class="stat-label">Total Spans</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" :class="{ 'text-error': stats.errorCount > 0 }">{{ stats.errorCount }}</div>
          <div class="stat-label">Error Spans</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.errorRate }}%</div>
          <div class="stat-label">Error Rate</div>
        </div>
      </div>

      <!-- Large trace warning -->
      <el-alert
        v-if="isLargeTrace && !showAllSpans"
        type="warning"
        :closable="false"
        class="warning-alert"
      >
        <template #title>
          此 Trace 包含 {{ trace.spanCount?.toLocaleString() }} 个 spans，为避免页面卡顿，当前只显示前 {{ MAX_DISPLAY_SPANS }} 条。
        </template>
        <el-button size="small" type="primary" @click="showAllSpans = true" style="margin-left: 12px">
          加载全部
        </el-button>
      </el-alert>

      <!-- Spans Table -->
      <div class="spans-section card">
        <h3>Spans ({{ showAllSpans || !isLargeTrace ? trace.spans?.length : flatSpans.length }})</h3>

        <el-table
          :data="flatSpans"
          highlight-current-row
          @row-click="(row: SpanNode) => selectSpan(row)"
          class="spans-table"
          max-height="500"
        >
          <el-table-column label="Name" min-width="320">
            <template #default="{ row }">
              <div
                class="span-name-cell"
                :style="{ paddingLeft: `${getIndent(row.depth)}px` }"
              >
                <span
                  v-if="row.children.length > 0"
                  class="expand-icon"
                  @click.stop="toggleSpan(row.spanId)"
                >
                  <el-icon v-if="expandedSpans.has(row.spanId)">
                    <ArrowDown />
                  </el-icon>
                  <el-icon v-else>
                    <ArrowRight />
                  </el-icon>
                </span>
                <span v-else class="expand-placeholder"></span>
                <span class="span-name">{{ row.spanName }}</span>
                <el-tag size="small" class="service-tag" effect="dark" type="info">{{ row.serviceName }}</el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="Duration" width="120">
            <template #default="{ row }">
              <span class="duration">{{ formatDuration(row.duration) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="Status" width="100">
            <template #default="{ row }">
              <span
                class="status-badge"
                :class="row.statusCode === 'Error' || row.statusCode === 'STATUS_CODE_ERROR' ? 'error' : 'success'"
              >
                {{ row.statusCode === 'Error' || row.statusCode === 'STATUS_CODE_ERROR' ? 'Error' : 'OK' }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="Timeline" min-width="200">
            <template #default="{ row }">
              <div class="waterfall-container">
                <div
                  class="waterfall-bar"
                  :style="{
                    width: `${getWaterfallWidth(row)}%`,
                    marginLeft: `${getWaterfallLeft(row)}%`,
                  }"
                  :class="row.statusCode === 'Error' || row.statusCode === 'STATUS_CODE_ERROR' ? 'status-error' : 'status-ok'"
                />
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Span Details -->
      <div v-if="selectedSpan" class="span-details card">
        <h3>Span Details</h3>

        <div class="details-grid">
          <div class="detail-item">
            <span class="label">Span Name</span>
            <span class="value">{{ selectedSpan.spanName }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Service</span>
            <span class="value">{{ selectedSpan.serviceName }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Span ID</span>
            <span class="value mono">{{ selectedSpan.spanId }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Parent Span ID</span>
            <span class="value mono">{{ selectedSpan.parentSpanId || '(root)' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Duration</span>
            <span class="value">{{ formatDuration(selectedSpan.duration) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Status</span>
            <span
              class="status-badge"
              :class="selectedSpan.statusCode === 'Error' || selectedSpan.statusCode === 'STATUS_CODE_ERROR' ? 'error' : 'success'"
            >
              {{ selectedSpan.statusCode }}
            </span>
          </div>
          <div class="detail-item full-width">
            <span class="label">Status Message</span>
            <span class="value">{{ selectedSpan.statusMessage || '-' }}</span>
          </div>
          <div class="detail-item full-width">
            <span class="label">Timestamp</span>
            <span class="value">{{ timezoneStore.formatTime(selectedSpan.timestamp) }}</span>
          </div>
        </div>

        <!-- Attributes -->
        <div v-if="selectedSpan.spanAttributes && Object.keys(selectedSpan.spanAttributes).length > 0" class="attributes-section">
          <h4>Span Attributes</h4>
          <el-table :data="Object.entries(selectedSpan.spanAttributes)" size="small" max-height="200">
            <el-table-column prop="0" label="Key" width="300" />
            <el-table-column prop="1" label="Value" />
          </el-table>
        </div>

        <!-- Resource Attributes -->
        <div v-if="selectedSpan.resourceAttributes && Object.keys(selectedSpan.resourceAttributes).length > 0" class="attributes-section">
          <h4>Resource Attributes</h4>
          <el-table :data="Object.entries(selectedSpan.resourceAttributes)" size="small" max-height="200">
            <el-table-column prop="0" label="Key" width="300" />
            <el-table-column prop="1" label="Value" />
          </el-table>
        </div>

        <!-- Events -->
        <div v-if="selectedSpan.events && selectedSpan.events.length > 0" class="events-section">
          <h4>Events ({{ selectedSpan.events.length }})</h4>
          <div class="events-list">
            <div v-for="(event, idx) in selectedSpan.events" :key="idx" class="event-item">
              <div class="event-time">{{ timezoneStore.formatTime(event.timestamp) }}</div>
              <div class="event-name">{{ event.name }}</div>
              <div v-if="Object.keys(event.attributes).length > 0" class="event-attributes">
                <span v-for="(v, k) in event.attributes" :key="k" class="event-attr">
                  {{ k }}: {{ v }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trace-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
  color: var(--text-secondary);
}

.error-state {
  padding: 20px;
}

.trace-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 16px;
}

.trace-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.trace-id {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  font-family: 'SF Mono', Monaco, monospace;
}

.trace-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item .label {
  color: var(--text-muted);
  font-size: 12px;
}

.meta-item .value {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.text-error {
  color: var(--error);
}

.warning-alert {
  margin-bottom: 0;
}

.spans-section h3,
.span-details h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.spans-table {
  cursor: pointer;
}

.span-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  color: var(--text-muted);
  width: 16px;
}

.expand-icon:hover {
  color: var(--accent);
}

.expand-placeholder {
  width: 16px;
  display: inline-block;
}

.span-name {
  flex: 1;
  color: var(--text-primary);
}

.service-tag {
  margin-left: 8px;
  font-size: 11px;
}

.waterfall-container {
  position: relative;
  height: 20px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.waterfall-bar {
  position: absolute;
  height: 100%;
  min-width: 2px;
  border-radius: 2px;
}

.waterfall-bar.status-ok {
  background: var(--success);
}

.waterfall-bar.status-error {
  background: var(--error);
}

.span-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  grid-column: span 2;
}

.detail-item .label {
  font-size: 12px;
  color: var(--text-muted);
}

.detail-item .value {
  font-size: 14px;
  color: var(--text-primary);
}

.detail-item .value.mono {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
}

.attributes-section,
.events-section {
  margin-top: 8px;
}

.attributes-section h4,
.events-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-item {
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.event-time {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.event-name {
  font-weight: 500;
  color: var(--text-primary);
}

.event-attributes {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.event-attr {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: 4px;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover > td) {
  background: var(--bg-tertiary) !important;
}
</style>
