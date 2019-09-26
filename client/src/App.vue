<template>
    <div id="app">
        <main>
            <keep-alive :max="10" :exclude="['Login', 'Post', 'Collection', 'User']">
                <router-view />
            </keep-alive>
        </main>
        <SideBar v-if="$router.currentRoute.name !== 'Login'" />
    </div>
</template>

<script>

import SideBar from './components/SideBar'

export default {
    name: 'app',
    components: {
        SideBar,
    },
    created() {
        // Taking control of global error handler
        this.$apolloProvider.errorHandler = error => {
            if (this.$router.currentRoute.name !== 'Login') {
                for (let i = 0; i < error.graphQLErrors.length; i++) {
                    if (error.graphQLErrors[i].code === 'AuthenticationError') {
                        this.$router.replace('/login')
                        break
                    }
                }
            }
        }
    },
}
</script>
