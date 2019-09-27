<template>
    <div class="login">
        <div class="headerWrapper">
            <header>
                <h1><img alt="Archive Box-Logo" src="@/assets/archive-box.svg">Archive</h1>
                <p>Where memes <del>go to die</del> get indexed.</p>
            </header>
            <RedTriangle />
        </div>
        <div class="mainWrapper">
            <div class="content indicatorWrapper" v-if="checkLogin">
                <div class="indicator">
                    <Lottie :options="animOptions" />
                </div>
            </div>
            <form
                v-else
                class="content form"
                @submit.prevent="login()"
            >
                <Modal
                    v-if="errorMessage"
                    @cancel="() => { errorMessage = null }"
                    :messageA="$t('prompts.no_right')"
                    :messageB="errorMessage"
                    :optionA="$t('action.okay')"
                />
                <InputField
                    v-model="username"
                    :type="'text'"
                    :disabled="formLoading"
                    :autocomplete="'username'"
                    :label="'Username'"
                />
                <InputField
                    v-model="password"
                    :type="'password'"
                    :disabled="formLoading"
                    :autocomplete="'current-password'"
                    :label="'Password'"
                />
                <button
                    type="submit"
                    :disabled="formLoading"
                    class="button"
                    data-id="login"
                >Login</button>
            </form>
            <div class="logoWrapper">
                <img alt="Archive Box-Logo" src="@/assets/wels-logo.svg">
            </div>
            <YellowPolygon />
        </div>
    </div>
</template>

<script>
import { resetStore } from '@/vue-apollo.js'
import { parseError } from '@/utils'
import InputField from '@/components/Input/InputField.vue'
import Modal from '@/components/Modal'
import Lottie from '@/components/Lottie'

import * as uploadingAnimation from '@/assets/animations/loading.json'

import RedTriangle from '@/assets/shapes/red-triangle.svg?inline'
import YellowPolygon from '@/assets/shapes/yellow-polygon.svg?inline'

import ME_QUERY from '@/graphql/meQuery.gql'
import LOGIN_MUTATION from '@/graphql/loginMutation.gql'

export default {
    name: 'Login',
    props: {
        msg: String,
    },
    components: { InputField, RedTriangle, YellowPolygon, Lottie, Modal },
    data() {
        return {
            checkLogin: true,
            formLoading: false,
            errorMessage: null,
            username: '',
            password: '',
            animOptions: {
                animationData: uploadingAnimation,
            },
        }
    },
    mounted() {
        this.$apollo.query({
            query: ME_QUERY,
        }).then(() => {
            this.$router.replace('/')
        }).catch(() => {
            this.checkLogin = false
        })
    },
    methods: {
        login() {
            this.formLoading = true

            this.$apollo.mutate({
                mutation: LOGIN_MUTATION,
                variables: {
                    username: this.username,
                    password: this.password,
                },
            }).then(async () => {
                await resetStore()
                this.$router.replace('/')
            }).catch((error) => {
                this.formLoading = false
                const e = parseError(error)
                this.errorMessage = e.message
            })
        },
    },
}
</script>


<style scoped lang="stylus">
@import "~@/assets/styles/palette.styl"

.login
    min-height 100%
    display flex
    flex-direction column
.headerWrapper
    position relative
    z-index 2
    header
        padding 3rem
        color white
        img
            margin-right .5rem
        h1
            font-size 3.25rem
            font-weight 700
            margin-bottom .5rem
        p
            font-size 1.5rem
            font-weight 500
        background $archive-primary1
    > svg
        position absolute
        z-index 1
        width 100%
        height 15rem
        max-height 20vh
.mainWrapper
    position relative
    flex 1
    display flex
    flex-direction column
    > .content
        position relative
        z-index 3
        padding 3rem
        padding-top 5rem
        flex 1
    .logoWrapper
        align-self flex-end
        margin 0 .5rem .5rem 0
    > svg
        z-index -1
        position absolute
        top 0
        left 0
        right 0
        bottom 0
        width 100%
        height 100%
</style>
