import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersist from 'pinia-plugin-persistedstate';

import App from './App.vue';
import router from './router';

import 'element-plus/dist/index.css';
import './assets/base.css';

const app = createApp(App);

const pinia = createPinia();
pinia.use(piniaPluginPersist);

app.use(pinia);
app.use(router);

app.mount('#app');
