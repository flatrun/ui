<template>
  <div id="app">
    <ToastNotifications />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import ToastNotifications from "@/components/ToastNotifications.vue";
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
    sans-serif;
  background-color: #f8fafc;
  color: #1e293b;
}
</style>
