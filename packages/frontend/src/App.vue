<script setup lang="ts">
</script>

<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="logo">🍬 Lucia</div>
      <div class="nav">
        <router-link to="/services">Services</router-link>
        <router-link to="/traces">Traces</router-link>
        <router-link to="/errors">Errors</router-link>
        <router-link to="/slow">Slow Calls</router-link>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.app-container {
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
}

.logo {
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
}

.nav {
  margin-left: 40px;
  display: flex;
  gap: 20px;
}

.nav a {
  color: #606266;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 4px;
}

.nav a:hover {
  background: #f5f7fa;
}

.nav a.router-link-active {
  color: #409eff;
  background: #ecf5ff;
}

.app-main {
  background: #f5f7fa;
  padding: 20px;
}
</style>
