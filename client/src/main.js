import Vue from 'vue'
import App from './App.vue'
import { createProvider } from './vue-apollo'

import './assets/styles/main.styl'
import router from './router'
import i18n from './i18n'

Vue.config.productionTip = false

new Vue({
    apolloProvider: createProvider(),
    router,
    i18n,
    render: h => h(App),
}).$mount('#app')
