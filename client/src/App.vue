<template>
    <div id="app">
        <div v-if="$apollo.loading">Loading...</div>
        <Login v-else-if="!user" />
        <template v-else>
            <Upload />
            <!-- <UserFooter :user="user" /> -->
        </template>
  </div>
</template>

<script>
import UserFooter from './components/UserFooter.vue'
import Login from './views/Login.vue'
import Upload from './views/Upload.vue'

import ME from './graphql/user.gql'

export default {
    name: 'app',
    components: {
        Login, UserFooter, Upload
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