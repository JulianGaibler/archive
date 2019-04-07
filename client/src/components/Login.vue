<template>
    <div class="user-login">
        <ApolloMutation
            :mutation="require('../graphql/userLogin.gql')"
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
                <input
                    v-model="username"
                    class="form-input"
                    type="username"
                    name="username"
                    placeholder="Username"
                    required
                >
                <input
                    v-model="password"
                    class="form-input"
                    type="password"
                    name="password"
                    placeholder="Password"
                    required
                >
                <div v-if="error" class="error">{{ error.message }}</div>
                <template>
                    <button
                        type="submit"
                        :disabled="loading"
                        class="button"
                        data-id="login"
                    >Login</button>
                </template>
            </form>
        </ApolloMutation>
    </div>
</template>

<script>
export default {
    name: 'Login',
    props: {
        msg: String
    },
    data() {
        return {
            username: '',
            password: '',
        }
    },
    methods: {
        onDone(data) {
            console.log(data)
        }
    }
}
</script>