import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import { createPinia } from 'pinia';

import VuetifyUseDialog from 'vuetify-use-dialog';
import piniaPluginPersist from 'pinia-plugin-persistedstate';

import App from './App.vue';
import router from './router';

import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import 'unfonts.css';
import './assets/base.css';

const app = createApp(App);

const vuetify = createVuetify({ ssr: true });

const pinia = createPinia();
pinia.use(piniaPluginPersist);

app.use(vuetify);
app.use(VuetifyUseDialog);
app.use(pinia);
app.use(router);

app.mount('#app');
