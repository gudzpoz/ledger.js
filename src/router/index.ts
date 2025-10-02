import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

declare module 'vue-router' {
  interface RouteMeta {
    title: string;
    icon: string;
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      meta: { title: 'Home', icon: 'mdi-home' },
      component: HomeView,
    },
    {
      path: '/files',
      name: 'files',
      meta: { title: 'Files', icon: 'mdi-folder-multiple' },
      component: () => import('../views/FilesView.vue'),
    },
    {
      path: '/add',
      name: 'add',
      meta: { title: 'Add', icon: 'mdi-plus' },
      component: () => import('../views/AddXactView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      meta: { title: 'About', icon: 'mdi-cog' },
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
});

export default router;
