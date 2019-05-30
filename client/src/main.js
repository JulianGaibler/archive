import Vue from 'vue'
import App from './App.vue'
import { createProvider } from './vue-apollo'

import './assets/styles/main.styl'
import router from './router'

Vue.config.productionTip = false

new Vue({
  apolloProvider: createProvider(),
  router,
  render: h => h(App)
}).$mount('#app')
