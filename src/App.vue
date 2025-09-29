<script setup lang="ts">
import { RouterView } from 'vue-router';
import router from './router';

const menu = router.options.routes;
</script>

<template>
  <v-app>
    <v-app-bar>
      <v-app-bar-title>{{ router.currentRoute.value.meta?.title }}</v-app-bar-title>
    </v-app-bar>
    <v-main>
      <v-container><RouterView /></v-container>
    </v-main>
    <v-bottom-navigation :model-value="router.currentRoute.value.path">
      <v-btn v-for="item in menu" :value="item.path" :key="item.path" :to="item.path">
        <v-icon :icon="item.meta?.icon as string" />
        <span>{{ item.meta?.title }}</span>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
