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

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class Login extends Vue {

    username: String = ''
    password: String = ''
    nickname: String = ''

    async onDone (result) {
        console.log(result)
    }
}
</script>
