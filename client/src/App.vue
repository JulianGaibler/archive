<template>
    <div id="app">
        <Login v-if="!user" />
  </div>
</template>

<script>
import Login from './components/Login.vue'
import ME from './graphql/user.gql'

export default {
    name: 'app',
    data() {
        return {
            user: null,
        }
    },
    components: {
        Login
    },
    created() {
        this.$apollo.query({
            query: ME,
       })
        .then((a)=>{
            this.user = a;
        })
        .catch((a)=>{
            this.user = null;
        })
    },
    methods: {
        fetchUser() {

        }
    }
}
</script>