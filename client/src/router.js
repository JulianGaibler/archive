import Vue from 'vue'
import Router from 'vue-router'

import Login from './views/Login.vue'
import Archive from './views/Archive.vue'

Vue.use(Router)

export default new Router({
    mode: 'history',
    routes: [
        {
            path: '/',
            name: 'Archive',
            component: Archive,
        },
        {
            path: '/login',
            name: 'Login',
            component: Login,
        },
        {
            path: '/upload',
            name: 'Upload',
            // route level code-splitting
            // this generates a separate chunk (about.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import(/* webpackChunkName: "upload" */ './views/Upload.vue'),
        },
        {
            path: '/collections',
            name: 'Collections',
            component: () => import(/* webpackChunkName: "collections" */ './views/Collections.vue'),
        },
        {
            path: '/c/:id',
            name: 'Collection',
            props: true,
            component: () => import(/* webpackChunkName: "collection" */ './views/Collection.vue'),
        },
        {
            path: '/users',
            name: 'Users',
            component: () => import(/* webpackChunkName: "users" */ './views/Users.vue'),
        },
        {
            path: '/u/:username',
            name: 'User',
            props: true,
            component: () => import(/* webpackChunkName: "user" */ './views/User.vue'),
        },
        {
            path: '/queue',
            name: 'Queue',
            component: () => import(/* webpackChunkName: "queue" */ './views/Queue.vue'),
        },
        {
            path: '/settings',
            name: 'Settings',
            component: () => import(/* webpackChunkName: "settings" */ './views/Settings.vue'),
        },
        {
            path: '/:id',
            name: 'Post',
            props: true,
            component: () => import(/* webpackChunkName: "post" */ './views/Post.vue'),
        },
    ],
})
