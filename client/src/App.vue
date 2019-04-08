<template>
    <div id="app">
        <img alt="Vue logo" src="./assets/logo.png">
        {{user}}
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
        user: {
            query: ME,
            update(r) {
                if (r) return r.me
                else return null;
            },
            error(e) {
                console.log('errors', e.message)
            }
        }
    },
    methods: {
        fetchUser() {

        }
    }
}
</script>