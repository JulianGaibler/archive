<template>
    <div id="app">
        <img alt="Vue logo" src="./assets/logo.png">
        {{me}}
        <Login />
  </div>
</template>

<script>
import Login from './components/Login.vue'
import ME from './graphql/user.gql'

export default {
    name: 'app',
    components: {
        Login
    },
    apollo: {
        me: ME
    },
    methods: {
        fetchUser() {

        }
    }
}
</script>