<template>
    <div class="login">
        <div class="card">
            <ApolloMutation
                :mutation="require('../graphql/mutation/login.gql')"
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

export default {
    name: 'Login',
    props: {
        msg: String
    },
    components: { InputField },
    data() {
        return {
            username: '',
            password: '',
        }
    },
    methods: {
        async onDone(data) {
            console.log(data);
            const apolloClient = this.$apollo.provider.defaultClient
            await onLogin(apolloClient);
        }
    }
}
</script>