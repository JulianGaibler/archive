<template>
    <div class="inputChangeName">
        <div v-if="errors" class="errorBox">
            <p v-for="(error, i) in errors" :key="i">{{error.message}}</p>
        </div>
        <form class="inputs itemRow itemRow-smallCol">
            <InputField class="itemRow-grow" v-model="name" :label="$t('input.settings.name')" :disabled="loading" :type="'text'" :errors="fieldError" />
            <div class="itemRow">
                <div class="indicator" v-if="loading">
                    <Lottie :options="animOptions" />
                </div>
                <button @click="changeName" class="button">{{ $t('action.changeName') }}</button>
            </div>
        </form>
    </div>
</template>

<script>
import gql from 'graphql-tag'

const CHANGE_NAME = gql`mutation changeName($newName: String!){
    changeName(newName: $newName)
}`

import InputField from '@/components/InputField'

import Lottie from '@/components/Lottie'
import * as uploadingAnimation from '@/assets/animations/loading.json'

const USER_QUERY = gql`{
    me {
        name
    }
}`

export default {
    name: 'InputChangeName',
    data() {
        return {
            errors: null,
            fieldError: [],
            loading: false,
            name: '',
            animOptions: {
                animationData: uploadingAnimation,
            },
        }
    },
    components: { Lottie, InputField },
    mounted() {
        this.$apollo.query({
            query: USER_QUERY,
        }).then(({ data }) => {
            this.name = data.me.name
        })
    },
    methods: {
        changeName(e) {
            e.preventDefault()
            if (this.loading) return
            this.errors = null
            this.fieldError = []
            let good = true
            if (this.name.length < 1) {
                good = false
                this.fieldError.push({ messageT: 'error.required_field' })
            }
            if (!good) return
            this.loading = true
            this.$apollo.mutate({
                mutation: CHANGE_NAME,
                variables: {
                    newName: this.name,
                },
                refetchQueries: [{ query: USER_QUERY }],
            }).then(() => {
                this.loading = false
            }).catch((error) => {
                this.errors = error.networkError.result.errors
                this.loading = false
            })
        },
    },
}
</script>
