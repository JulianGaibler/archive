<template>
    <div>
        <div v-if="error" class="errorBox">{{ error }}</div>
        <form class="inputs itemRow itemRow-smallCol">
            <p v-if="me" class="itemRow-grow">{{ $t( me.linkedTelegram ? 'state.account_linked_long' : 'state.account_unlinked_long' )}}</p>
            <div class="indicator" v-if="loading || !me">
                <Lottie :options="animOptions" />
            </div>
            <button v-if="me && me.linkedTelegram" @click="unlinkAccount" class="button">{{ $t('action.unlink_accounts') }}</button>
            <router-link
                v-else-if="me"
                tag="button"
                :to="{ name: 'ArnoldBot'}"
                class="button" >{{ $t('action.link_accounts') }}</router-link>
        </form>
    </div>
</template>

<script>
import Lottie from '@/components/Lottie'
import * as uploadingAnimation from '@/assets/animations/loading.json'

import { parseError } from '@/utils'

import UNLINK_MUTATION from '@/graphql/unlinkTelegramMutation.gql'
import ME_QUERY from '@/graphql/meTelegramQuery.gql'

export default {
    name: 'InputArnoldBot',
    data() {
        return {
            error: null,
            loading: false,
            animOptions: {
                animationData: uploadingAnimation,
            },
        }
    },
    components: { Lottie },
    apollo: {
        me: ME_QUERY,
    },
    methods: {
        unlinkAccount() {
            this.error = null
            this.loading = true
            this.$apollo.mutate({
                mutation: UNLINK_MUTATION,
                refetchQueries: [{ query: ME_QUERY }],
            }).then(() => {
                this.loading = false
            }).catch((unparsedError) => {
                this.loading = false
                const error = parseError(unparsedError)
                this.error = error.message
            })
        },
    },
}
</script>
