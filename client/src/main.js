import Vue from 'vue'
import App from './App.vue'
import './assets/styles/main.styl'

import vClickOutside from 'v-click-outside'
import 'focus-visible'
import { createProvider } from './vue-apollo'


import router from './router'
import i18n from './i18n'

Vue.use(vClickOutside)
Vue.directive('focus', {
    inserted: function (el, binding) {
        if (binding.value) {
            el.focus()
        }
    },
})
Vue.directive('hoverFix', {
    inserted: function (el) {
        const bodyRect = document.body.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const diff = bodyRect.width - (elRect.x + elRect.width)

        if (diff < 0) {
            el.style.left = `${diff-20}px`
        }
    },
})

Vue.config.productionTip = false

new Vue({
    apolloProvider: createProvider(),
    router,
    i18n,
    render: h => h(App),
}).$mount('#app')
