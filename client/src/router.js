import Vue from 'vue'
import Router from 'vue-router'

import NProgress from 'nprogress'


Vue.use(Router)

const router = new Router({
    mode: 'history',
    scrollBehavior (to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        } else {
            return { x: 0, y: 0 }
        }
    },
    routes: [
        {
            path: '/',
            name: 'Archive',
            component: () => import(/* webpackChunkName: "upload" */ './views/Archive.vue'),
        },
        {
            path: '/login',
            name: 'Login',
            component: () => import(/* webpackChunkName: "upload" */ './views/Login.vue'),
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
            path: '/arnoldbot',
            name: 'ArnoldBot',
            component: () => import(/* webpackChunkName: "arnoldbot" */ './views/ArnoldBot.vue'),
        },
        {
            path: '/:id',
            name: 'Post',
            props: true,
            component: () => import(/* webpackChunkName: "post" */ './views/Post.vue'),
        },
    ],
})

NProgress.configure({ showSpinner: false })

router.beforeEach((to, from, next) => {
    if (to.name) {
        NProgress.start()
    }
    next()
})

router.afterEach(() => {
    NProgress.done()
})

export default router
