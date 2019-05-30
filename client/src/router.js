import Vue from 'vue'
import Router from 'vue-router'

import Login from './views/Login.vue'
import Archive from './views/Archive.vue'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Archive',
      component: Archive
    },
    {
      path: '/login',
      name: 'Login',
      component: Login
    },
    {
      path: '/upload',
      name: 'Upload',
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "about" */ './views/Upload.vue')
    }
  ]
})
