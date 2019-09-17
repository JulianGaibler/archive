<template>
    <div id="app">
        <main>
            <keep-alive :max="10">
                <router-view />
            </keep-alive>
        </main>
        <SideBar v-if="this.$router.currentRoute !== 'Login'" />
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
            console.error(error)
            for (let i = 0; i < error.graphQLErrors.length; i++) {
                if (error.graphQLErrors[i].code === 'AuthenticationError') {
                    this.$router.replace('/login')
                    break
                }
            }
        }
    },
}
</script>
