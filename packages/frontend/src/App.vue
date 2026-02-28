<script setup lang="ts">
import TimezoneSelector from './components/TimezoneSelector.vue';
</script>

<template>
  <el-container class="app-container">
    <!-- 侧边栏 -->
    <el-aside width="220px" class="app-aside">
      <div class="logo">
        <span class="logo-icon">🍬</span>
        <span class="logo-text">Lucia</span>
      </div>
      <el-menu
        :default-active="$route.path"
        router
        class="side-menu"
        background-color="transparent"
        text-color="#94a3b8"
        active-text-color="#3b82f6"
      >
        <el-menu-item index="/services">
          <el-icon><Monitor /></el-icon>
          <span>Services</span>
        </el-menu-item>
        <el-menu-item index="/traces">
          <el-icon><Link /></el-icon>
          <span>Traces</span>
        </el-menu-item>
        <el-menu-item index="/errors">
          <el-icon><WarningFilled /></el-icon>
          <span>Errors</span>
        </el-menu-item>
        <el-menu-item index="/slow">
          <el-icon><Timer /></el-icon>
          <span>Slow Calls</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <!-- 主内容区 -->
    <el-container>
      <el-header class="app-header">
        <div class="page-title">{{ $route.meta.title || 'Dashboard' }}</div>
        <div class="header-actions">
          <TimezoneSelector />
        </div>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style>
/* 全局样式 - 深色主题 */
:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
  --border: #334155;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Element Plus 深色主题覆盖 */
.el-table {
  --el-table-bg-color: var(--bg-secondary) !important;
  --el-table-tr-bg-color: var(--bg-secondary) !important;
  --el-table-header-bg-color: var(--bg-tertiary) !important;
  --el-table-row-hover-bg-color: var(--bg-tertiary) !important;
  --el-table-border-color: var(--border) !important;
  --el-table-text-color: var(--text-primary) !important;
  --el-table-header-text-color: var(--text-secondary) !important;
}

.el-input__wrapper {
  background: var(--bg-tertiary) !important;
  box-shadow: none !important;
  border: 1px solid var(--border) !important;
}

.el-input__inner {
  color: var(--text-primary) !important;
}

.el-select__wrapper {
  background: var(--bg-tertiary) !important;
  box-shadow: none !important;
}

.el-button--primary {
  --el-button-bg-color: var(--accent) !important;
  --el-button-border-color: var(--accent) !important;
}

.el-tag {
  border: none !important;
}

/* 布局 */
.app-container {
  min-height: 100vh;
  background: var(--bg-primary);
}

.app-aside {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
}

.logo-icon {
  font-size: 24px;
  margin-right: 8px;
}

.logo-text {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.side-menu {
  border-right: none !important;
  padding: 8px;
}

.side-menu .el-menu-item {
  border-radius: 8px;
  margin-bottom: 4px;
  height: 44px;
}

.side-menu .el-menu-item:hover {
  background: var(--bg-tertiary) !important;
}

.side-menu .el-menu-item.is-active {
  background: rgba(59, 130, 246, 0.15) !important;
}

.app-header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.app-main {
  background: var(--bg-primary);
  padding: 24px;
  min-height: calc(100vh - 60px);
}

/* 卡片样式 */
.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border);
  padding: 20px;
}

/* 统计卡片 */
.stat-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border);
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.stat-card .stat-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-card .stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 服务卡片 */
.service-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;
}

.service-card:hover {
  border-color: var(--accent);
  background: var(--bg-tertiary);
}

.service-card .service-name {
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.service-card .service-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.service-card .service-status.healthy {
  background: var(--success);
}

.service-card .service-status.warning {
  background: var(--warning);
}

.service-card .service-status.error {
  background: var(--error);
}

.service-card .service-metrics {
  display: flex;
  gap: 32px;
}

.service-card .metric {
  text-align: right;
}

.service-card .metric-value {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.service-card .metric-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 状态标签 */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background: rgba(34, 197, 94, 0.15);
  color: var(--success);
}

.status-badge.error {
  background: rgba(239, 68, 68, 0.15);
  color: var(--error);
}

.status-badge.warning {
  background: rgba(234, 179, 8, 0.15);
  color: var(--warning);
}

/* 耗时显示 */
.duration {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 13px;
}

.duration.slow {
  color: var(--error);
}

.duration.medium {
  color: var(--warning);
}

.duration.fast {
  color: var(--success);
}

/* 操作名称 */
.operation-name {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 13px;
  color: var(--text-primary);
}
</style>
