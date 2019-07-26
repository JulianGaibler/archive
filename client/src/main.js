import Vue from 'vue'
import App from './App.vue'
import { createProvider } from './vue-apollo'

import './assets/styles/main.styl'
import router from './router'
import i18n from './i18n'
import store from './store'

Vue.config.productionTip = false

new Vue({
    apolloProvider: createProvider(),
    router,
    i18n,
    store,
    render: h => h(App),
}).$mount('#app')
