<template>
    <div class="inputToggleDarkmode">
        <div v-if="errors" class="errorBox">
            <p v-for="(error, i) in errors" :key="i">{{error.message}}</p>
        </div>
        <form class="inputs itemRow itemRow-smallCol">
            <InputRadio
                class="itemRow-grow"
                v-model="darkmode"
                @input="setDarkmode"
                :label="$t('settings.darkmode')"
                :disabled="loading"
                :options="[
                    { value:'true', name:$t('state.enabled') },
                    { value:'false', name:$t('state.disabled') },
                ]" />
            <div class="itemRow">
                <div class="indicator" v-if="loading">
                    <Lottie :options="animOptions" />
                </div>
            </div>
        </form>
    </div>
</template>

<script>
import InputRadio from '@/components/Input/InputRadio'

import Lottie from '@/components/Lottie'
import * as uploadingAnimation from '@/assets/animations/loading.json'

import ME_QUERY from '@/graphql/meQuery.gql'
import SET_DARKMODE from '@/graphql/setDarkModeMutation.gql'

export default {
    name: 'ToggleDarkmode',
    data() {
        return {
            errors: null,
            loading: true,
            darkmode: '',
            animOptions: {
                animationData: uploadingAnimation,
            },
        }
    },
    components: { Lottie, InputRadio },
    mounted() {
        this.$apollo.query({
            query: ME_QUERY,
        }).then(({ data }) => {
            this.darkmode = data.me.darkmode.toString()
            this.loading = false
        })
    },
    methods: {
        setDarkmode(valueString) {
            if (this.loading) return
            let newDarkmode = valueString === 'true'
            this.loading = true
            this.$apollo.mutate({
                mutation: SET_DARKMODE,
                variables: {
                    enabled: newDarkmode,
                },
                refetchQueries: [{ query: ME_QUERY }],
            }).then(() => {
                this.loading = false
                localStorage.user_theme = newDarkmode ? 'dark' : 'light'
                window.__setTheme()
            }).catch((error) => {
                this.errors = error.networkError.result.errors
                this.loading = false
            })
        },
    },
}
</script>
