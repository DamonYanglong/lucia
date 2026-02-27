<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getTraceById, formatDuration, formatDate, buildSpanTree, flattenSpanTree, type SpanNode } from '../api';

const route = useRoute();
const router = useRouter();

const traceId = route.params.traceId as string;
const trace = ref<any>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedSpan = ref<SpanNode | null>(null);
const expandedSpans = ref<Set<string>>(new Set());

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

const spanTree = computed(() => {
  if (!trace.value?.spans) return [];
  return buildSpanTree(trace.value.spans);
});

const flatSpans = computed(() => {
  return flattenSpanTree(spanTree.value);
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

function getStatusCodeColor(statusCode: string): string {
  switch (statusCode) {
    case 'Error': return 'danger';
    case 'Ok': return 'success';
    default: return 'info';
  }
}

function getIndent(depth: number): number {
  return depth * 24;
}
</script>

<template>
  <div class="trace-detail-page">
    <div v-if="loading" class="loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>Loading trace...</span>
    </div>

    <div v-else-if="error" class="error">
      <el-alert type="error" :title="error" show-icon />
    </div>

    <div v-else-if="trace" class="trace-content">
      <!-- Trace Header -->
      <div class="trace-header">
        <el-page-header @back="router.back()">
          <template #content>
            <div class="trace-title">
              <span>Trace: {{ traceId.slice(0, 8) }}</span>
              <el-tag :type="getStatusCodeColor(trace.statusCode)" size="small">
                {{ trace.statusCode }}
              </el-tag>
            </div>
          </template>
        </el-page-header>

        <div class="trace-meta">
          <div class="meta-item">
            <span class="label">Service:</span>
            <span class="value">{{ trace.rootSpan.serviceName }}</span>
          </div>
          <div class="meta-item">
            <span class="label">Operation:</span>
            <span class="value">{{ trace.rootSpan.spanName }}</span>
          </div>
          <div class="meta-item">
            <span class="label">Duration:</span>
            <span class="value">{{ formatDuration(trace.duration) }}</span>
          </div>
          <div class="meta-item">
            <span class="label">Spans:</span>
            <span class="value">{{ trace.spanCount }}</span>
          </div>
          <div class="meta-item">
            <span class="label">Time:</span>
            <span class="value">{{ formatDate(trace.rootSpan.timestamp) }}</span>
          </div>
        </div>
      </div>

      <!-- Spans Table -->
      <div class="spans-section">
        <h3>Spans ({{ trace.spans.length }})</h3>

        <el-table
          :data="flatSpans"
          stripe
          highlight-current-row
          @row-click="(row: SpanNode) => selectSpan(row)"
          class="spans-table"
        >
          <el-table-column label="Name" min-width="300">
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
                <el-tag size="small" class="service-tag">{{ row.serviceName }}</el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="Duration" width="120">
            <template #default="{ row }">
              {{ formatDuration(row.duration) }}
            </template>
          </el-table-column>

          <el-table-column label="Status" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusCodeColor(row.statusCode)" size="small">
                {{ row.statusCode }}
              </el-tag>
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
                  :class="`status-${row.statusCode.toLowerCase()}`"
                />
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Span Details -->
      <div v-if="selectedSpan" class="span-details">
        <h3>Span Details</h3>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="Span Name">{{ selectedSpan.spanName }}</el-descriptions-item>
          <el-descriptions-item label="Service">{{ selectedSpan.serviceName }}</el-descriptions-item>
          <el-descriptions-item label="Span ID">{{ selectedSpan.spanId }}</el-descriptions-item>
          <el-descriptions-item label="Parent Span ID">
            {{ selectedSpan.parentSpanId || '(root)' }}
          </el-descriptions-item>
          <el-descriptions-item label="Duration">{{ formatDuration(selectedSpan.duration) }}</el-descriptions-item>
          <el-descriptions-item label="Status">
            <el-tag :type="getStatusCodeColor(selectedSpan.statusCode)" size="small">
              {{ selectedSpan.statusCode }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Status Message" :span="2">
            {{ selectedSpan.statusMessage || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="Timestamp" :span="2">
            {{ formatDate(selectedSpan.timestamp) }}
          </el-descriptions-item>
        </el-descriptions>

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
          <el-timeline>
            <el-timeline-item
              v-for="(event, idx) in selectedSpan.events"
              :key="idx"
              :timestamp="formatDate(event.timestamp)"
            >
              <strong>{{ event.name }}</strong>
              <div v-if="Object.keys(event.attributes).length > 0" class="event-attributes">
                <span v-for="(v, k) in event.attributes" :key="k" class="event-attr">
                  {{ k }}: {{ v }}
                </span>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Loading, ArrowDown, ArrowRight } from '@element-plus/icons-vue';

export default {
  components: {
    Loading,
    ArrowDown,
    ArrowRight,
  },
};
</script>

<style scoped>
.trace-detail-page {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #909399;
}

.error {
  padding: 20px 0;
}

.trace-header {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.trace-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 500;
}

.trace-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 16px;
}

.meta-item {
  display: flex;
  gap: 8px;
}

.meta-item .label {
  color: #909399;
  font-size: 14px;
}

.meta-item .value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.spans-section {
  margin-bottom: 24px;
}

.spans-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
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
  color: #909399;
  width: 16px;
}

.expand-icon:hover {
  color: #409eff;
}

.expand-placeholder {
  width: 16px;
  display: inline-block;
}

.span-name {
  flex: 1;
}

.service-tag {
  margin-left: 8px;
  font-size: 12px;
}

.waterfall-container {
  position: relative;
  height: 20px;
  background: #f5f7fa;
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
  background: #67c23a;
}

.waterfall-bar.status-error {
  background: #f56c6c;
}

.waterfall-bar.status-unset {
  background: #909399;
}

.span-details {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #ebeef5;
}

.span-details h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
}

.attributes-section,
.events-section {
  margin-top: 20px;
}

.attributes-section h4,
.events-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.event-attributes {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.event-attr {
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
