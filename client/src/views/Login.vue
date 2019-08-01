<template>
    <div class="login">
        <div class="card">
            <ApolloMutation
                :mutation="LOGIN_MUTATION"
                :variables="{
                        username,
                        password,
                    }"
                class="wrapper"
                @done="onDone"
            >
                <form
                    slot-scope="{ mutate, loading, gqlError: error }"
                    class="form"
                    @submit.prevent="mutate()"
                >
                    <InputField
                        v-model="username"
                        :type="'username'"
                        :label="'Username'"
                    />
                    <InputField
                        v-model="password"
                        :type="'password'"
                        :label="'Password'"
                    />
                    <div v-if="error" class="error">{{ error.message }}</div>
                    <template>
                        <button
                            type="submit"
                            :disabled="loading"
                            class="inputButton"
                            data-id="login"
                        >Login</button>
                    </template>
                </form>
            </ApolloMutation>
        </div>
    </div>
</template>

<script>
import { onLogin } from '../vue-apollo.js'
import InputField from '../components/InputField.vue'

import gql from 'graphql-tag'

const LOGIN_MUTATION = gql`{
    me {
        name
        username
    }
}`

export default {
    name: 'Login',
    props: {
        msg: String,
    },
    components: { InputField },
    data() {
        return {
            LOGIN_MUTATION,
            username: '',
            password: '',
        }
    },
    methods: {
        async onDone(data) {
            if (!data) return
            const apolloClient = this.$apollo.provider.defaultClient
            await onLogin(apolloClient)
            this.$router.replace('/')
        },
    },
}
</script>
