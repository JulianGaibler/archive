<template>
    <div id="app" v-if="this.$router.currentRoute === 'Login'">
        <main><router-view /></main>
    </div>
    <SideBar v-else>
         <router-view />
    </SideBar>
</template>

<script>

import SideBar from './components/SideBar'

export default {
    name: 'app',
    components: {
        SideBar
    },
    created() {
        // Taking control of global error handler
        this.$apolloProvider.errorHandler = error => {
            if (error.message === 'GraphQL error: Not authorized') {
                this.$router.replace('/login')
            }
        }
    },
}
</script>