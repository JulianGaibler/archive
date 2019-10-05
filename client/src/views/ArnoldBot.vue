<template>
    <div>
        <header class="framed">
            <h1><img alt="Archive Box-Logo" src="@/assets/arnoldbot.svg">{{ $t('views.arnoldbot') }}</h1>
        </header>
        <div class="frame framed" v-if="me && resources">

            <div v-if="me.linkedTelegram">
                <h2>{{ $t('state.account_linked') }}</h2>
                <p>{{ $t('state.account_linked_long') }}</p>
                <button @click="unlinkAccount" class="button button-primary">{{ $t('action.unlink_accounts') }}</button>
            </div>
            <template v-else>
                <h2>{{ $t('input.link_accounts') }}</h2>
                <p>{{ $t('input.link_accounts_explain') }}</p>
                <div v-if="error" class="errorBox">{{error}}</div>
                <div v-if="receivedData">
                    <div class="linkContainer">
                        <div class="user">
                            <div class="image telegram">
                                <div class="indicatorWrapper indicatorWrapper-absolute indicatorWrapper-center">
                                    <div class="indicator indicator-shadow">
                                        <img alt="Archive Box-Logo" src="@/assets/service_icons/telegram.svg">
                                    </div>
                                </div>
                                <img :src="telegramData.photo_url">
                            </div>
                            <div class="name">
                                <p>{{ telegramData.first_name }} {{ telegramData.last_name }}</p>
                                <p>{{ telegramData.username }}</p>
                            </div>
                        </div>
                        <div class="connector"></div>
                        <div class="user">
                            <div class="image archive">
                                <div class="indicatorWrapper indicatorWrapper-absolute indicatorWrapper-center">
                                    <div class="indicator indicator-shadow">
                                        <img alt="Archive Box-Logo" src="@/assets/service_icons/archive.svg">
                                    </div>
                                </div>
                                <img :src="`//${resources.resourceDomain}/${resources.resourcePath}upic/${me.profilePicture}-256.jpeg`">
                            </div>
                            <div class="name">
                                <p>{{ me.name }}</p>
                                <p>{{ me.username }}</p>
                            </div>
                        </div>
                    </div>
                    <button v-if="error" @click="reset" class="button">{{ $t('action.tryagain') }}</button>
                    <button v-else @click="linkAccount" class="button button-confirm">{{ $t('action.link_accounts') }}</button>
                </div>
                <div v-else>
                    <TelegramLogin @callback="accountData" :telegramLogin="'ArnoldBot'" />
                </div>
            </template>
        </div>
    </div>
</template>

<script>
import { parseError } from '@/utils'

import LINK_MUTATION from '@/graphql/linkTelegramMutation.gql'
import UNLINK_MUTATION from '@/graphql/unlinkTelegramMutation.gql'
import ME_QUERY from '@/graphql/meTelegramQuery.gql'
import RESOURCES_QUERY from '@/graphql/resourcesQuery.gql'

import TelegramLogin from '@/components/TelegramLogin'

export default {
    name: 'ArnoldBot',
    data() {
        return {
            error: null,
            uploading: false,
            receivedData: false,
            telegramData: {
                id: '',
                first_name: '',
                last_name: '',
                username: '',
                photo_url: '',
                auth_date: '',
                hash: '',
            },
        }
    },
    components: {
        TelegramLogin,
    },
    apollo: {
        me: ME_QUERY,
        resources: RESOURCES_QUERY,
    },
    mounted() {
        if (this.$route.query.auth_date) {
            this.accountData(this.$route.query)
        }
    },
    methods: {
        accountData(user) {
            const keys = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date', 'hash']
            keys.forEach(key => {
                this.telegramData[key] = user[key]
            })
            this.receivedData = true
        },
        reset() {
            this.receivedData = false
            this.error = null
        },
        linkAccount() {
            this.error = null
            this.uploading = true
            this.$apollo.mutate({
                mutation: LINK_MUTATION,
                variables: this.telegramData,
                refetchQueries: [{ query: ME_QUERY }],
            }).then(() => {
                this.uploading = false
            }).catch((unparsedError) => {
                this.uploading = false
                const error = parseError(unparsedError)
                this.error = error.message
            })
        },
        unlinkAccount() {
            this.error = null
            this.uploading = true
            this.$apollo.mutate({
                mutation: UNLINK_MUTATION,
                refetchQueries: [{ query: ME_QUERY }],
            }).then(() => {
                this.uploading = false
            }).catch((unparsedError) => {
                this.uploading = false
                const error = parseError(unparsedError)
                this.error = error.message
            })
        },
    },
}
</script>

<style scoped lang="stylus">
@import "~@/assets/styles/palette.styl"
    header
        color $archive-white
        background $archive-primary1

    .frame
        text-align center
        h2, p
            margin 0 auto
            max-width 30rem
            margin-bottom 1rem

    .linkContainer
        display grid
        grid-template-columns 1fr auto 1fr
        margin-bottom 1rem
        .connector
            height .4rem
            border-radius 1rem
            background $archive-grey2
            min-width 5rem
            margin 0 1rem
            margin-top (9/2)rem
        .user
            display flex
            align-items center
            flex-direction column
            .name
                text-align center
                :first-child
                    font-size 1.3rem
                    font-weight 700
                    margin-bottom .5rem
                :last-child
                    font-size 1rem
                    color $archive-grey3
            .image
                position relative
                margin-bottom 1rem
                width 9rem
                height 9rem
                overflow hidden
                &.telegram
                    border-radius 50%
                &.archive
                    border-radius $archive-radius-profile
                img
                    width 100%
                    height auto
        @media screen and (max-width: $archive-screen-small)
            .user
                .image
                    width 5rem
                    height 5rem
                    .indicator img
                        height 1rem
                        width 1rem
            .connector
                min-width 2.5rem

</style>
