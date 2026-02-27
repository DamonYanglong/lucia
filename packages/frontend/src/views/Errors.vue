<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFilterStore } from '../stores/filter';
import type { ErrorItem, ErrorGroup } from '../api';
import { formatDate } from '../api';

const router = useRouter();
const filterStore = useFilterStore();

const errors = ref<ErrorItem[]>([]);
const errorGroups = ref<ErrorGroup[]>([]);
const services = ref<string[]>([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const activeTab = ref('list');

onMounted(async () => {
  await loadServices();
  await loadData();
});

watch([() => filterStore.service, () => filterStore.startTime, () => filterStore.endTime], () => {
  page.value = 1;
  loadData();
});

watch(activeTab, () => {
  page.value = 1;
  loadData();
});

async function loadServices() {
  try {
    const res = await fetch(`/api/services?startTime=${filterStore.startTime}&endTime=${filterStore.endTime}`);
    const data = await res.json();
    services.value = (data.data || []).map((s: any) => s.name);
  } catch (e) {
    console.error('Failed to load services', e);
  }
}

async function loadData() {
  loading.value = true;
  try {
    if (activeTab.value === 'list') {
      await loadErrors();
    } else {
      await loadErrorGroups();
    }
  } finally {
    loading.value = false;
  }
}

async function loadErrors() {
  const params = new URLSearchParams({
    startTime: filterStore.startTime,
    endTime: filterStore.endTime,
    page: String(page.value),
    pageSize: String(pageSize.value),
  });
  if (filterStore.service) {
    params.set('service', filterStore.service);
  }

  const res = await fetch(`/api/errors?${params}`);
  const data = await res.json();
  errors.value = data.data?.list || [];
  total.value = data.data?.total || 0;
}

async function loadErrorGroups() {
  const params = new URLSearchParams({
    startTime: filterStore.startTime,
    endTime: filterStore.endTime,
  });
  if (filterStore.service) {
    params.set('service', filterStore.service);
  }

  const res = await fetch(`/api/errors/groups?${params}`);
  const data = await res.json();
  errorGroups.value = data.data || [];
  total.value = errorGroups.value.length;
}

function goToTrace(traceId: string) {
  router.push(`/traces/${traceId}`);
}

function groupedErrors(errors: ErrorItem[]): Map<string, ErrorItem[]> {
  const groups = new Map<string, ErrorItem[]>();
  for (const error of errors) {
    const key = error.statusMessage || 'Unknown Error';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(error);
  }
  return groups;
}

const aggregatedErrors = computed(() => {
  return Array.from(groupedErrors(errors.value).entries()).map(([message, items]) => ({
    message,
    count: items.length,
    lastOccurrence: items[0].timestamp,
    serviceName: items[0].serviceName,
    items,
  }));
});
</script>

<template>
  <div class="errors-page">
    <div class="header">
      <h2>Errors</h2>
      <div class="filters">
        <TimeSelector />
        <ServiceFilter :services="services" />
      </div>
    </div>

    <el-tabs v-model="activeTab" @tab-change="loadData">
      <el-tab-pane label="Error List" name="list">
        <div class="tab-content">
          <el-table :data="errors" v-loading="loading" stripe>
            <el-table-column prop="serviceName" label="Service" width="150" />
            <el-table-column prop="spanName" label="Operation" width="200" />
            <el-table-column prop="statusMessage" label="Error Message" min-width="300" show-overflow-tooltip />
            <el-table-column label="Time" width="180">
              <template #default="{ row }">
                {{ formatDate(row.timestamp) }}
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" link @click="goToTrace(row.traceId)">
                  View Trace
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="total, prev, pager, next"
            @current-change="loadErrors"
            class="pagination"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="Aggregated" name="aggregated">
        <div class="tab-content">
          <el-table :data="aggregatedErrors" v-loading="loading" stripe>
            <el-table-column prop="serviceName" label="Service" width="150" />
            <el-table-column prop="message" label="Error Message" min-width="300" show-overflow-tooltip />
            <el-table-column prop="count" label="Count" width="100" sortable>
              <template #default="{ row }">
                <el-tag type="danger" size="small">{{ row.count }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Last Occurrence" width="180">
              <template #default="{ row }">
                {{ formatDate(row.lastOccurrence) }}
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="120" fixed="right">
              <template #default="{ row }">
                <el-dropdown @command="(cmd: string) => cmd === 'view' && goToTrace(row.items[0].traceId)">
                  <el-button size="small">
                    Actions <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="view">View Sample Trace</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Error Groups" name="groups">
        <div class="tab-content">
          <el-table :data="errorGroups" v-loading="loading" stripe>
            <el-table-column prop="serviceName" label="Service" width="150" />
            <el-table-column prop="message" label="Error Message" min-width="300" show-overflow-tooltip />
            <el-table-column prop="count" label="Count" width="100" sortable>
              <template #default="{ row }">
                <el-tag type="danger" size="small">{{ row.count }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Last Occurrence" width="180">
              <template #default="{ row }">
                {{ formatDate(row.lastOccurrence) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts">
import { ArrowDown } from '@element-plus/icons-vue';
import TimeSelector from '../components/TimeSelector.vue';
import ServiceFilter from '../components/ServiceFilter.vue';

export default {
  components: {
    ArrowDown,
    TimeSelector,
    ServiceFilter,
  },
};
</script>

<style scoped>
.errors-page {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters {
  display: flex;
  gap: 16px;
}

h2 {
  margin: 0;
}

.tab-content {
  min-height: 400px;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
