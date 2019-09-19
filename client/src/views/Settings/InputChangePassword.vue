<template>
    <div>
        <div v-if="errors" class="errorBox">
            <p v-for="(error, i) in errors" :key="i">{{error.message}}</p>
        </div>
        <form v-if="me" class="inputs">
            <input
                class="hiddenInput"
                disabled
                type="text"
                autocomplete="username"
                :value="me.username">
            <InputField
                v-model="oldPassword"
                :label="$t('input.settings.oldPassword')"
                :disabled="loading"
                :type="'password'"
                :autocomplete="'current-password'"
                :errors="fieldErrors[0]" />
            <InputField
                v-model="newPassword1"
                :label="$t('input.settings.newPassword')"
                :disabled="loading"
                :type="'password'"
                :autocomplete="'new-password'"
                :errors="fieldErrors[1]" />
            <InputField
                v-model="newPassword2"
                :label="$t('input.settings.newPassword_repeat')"
                :disabled="loading"
                :type="'password'"
                :autocomplete="'new-password'"
                :errors="fieldErrors[2]" />
            <div class="itemRow dist">
                <button @click="changePassword" class="button">{{ $t('action.changePassword') }}</button>
                <div class="indicator" v-if="loading">
                    <Lottie :options="animOptions" />
                </div>
            </div>
        </form>
    </div>
</template>

<script>
import InputField from '@/components/InputField'

import Lottie from '@/components/Lottie'
import * as uploadingAnimation from '@/assets/animations/loading.json'

import ME_QUERY from '@/graphql/meQuery.gql'
import CHANAGE_PASSWORD from '@/graphql/changePasswordMutation.gql'

export default {
    name: 'InputChangePassword',
    data() {
        return {
            errors: null,
            fieldErrors: [[], [], []],
            loading: false,
            oldPassword: '',
            newPassword1: '',
            newPassword2: '',
            animOptions: {
                animationData: uploadingAnimation,
            },
        }
    },
    components: { Lottie, InputField },
    apollo: {
        me: ME_QUERY,
    },
    methods: {
        changePassword(e) {
            e.preventDefault()
            this.fieldErrors = [[], [], []]
            let good = true
            if (this.oldPassword.length < 1) {
                good = false
                this.fieldErrors[0].push({ messageT: 'error.required_field' })
            }
            if (this.newPassword1.length < 1) {
                good = false
                this.fieldErrors[1].push({ messageT: 'error.required_field' })
            }
            if (this.newPassword2.length < 1) {
                good = false
                this.fieldErrors[2].push({ messageT: 'error.required_field' })
            }
            if (!good) return
            if (this.newPassword2 !== this.newPassword1) {
                good = false
                this.fieldErrors[2].push({ messageT: 'error.haveToMatch' })
            }
            if (!good) return
            this.loading = true
            this.$apollo.mutate({
                mutation: CHANAGE_PASSWORD,
                variables: {
                    oldPassword: this.oldPassword,
                    newPassword: this.newPassword1,
                },
                refetchQueries: [{ query: ME_QUERY }],
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
