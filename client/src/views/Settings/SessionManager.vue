<template>
    <div v-if="userSessions" class="sessionManager itemList itemList-progress">
        <div v-if="errors" class="errorBox">
            <p v-for="(error, i) in errors" :key="i">{{error.message}}</p>
        </div>
        <div v-if="loading" class="indicatorWrapper indicatorWrapper-absolute indicatorWrapper-center">
            <div class="indicator indicator-shadow">
                <Lottie :options="animOptions" />
            </div>
        </div>
        <div v-for="s in sessions" :key="s.id" class="item">
            <div class="indicatorWrapper">
                <div class="indicator">
                    <IconSession />
                </div>
            </div>
            <div class="info">
                <h4>{{s.latestIP}}</h4>
                <p>{{ $t('sessions.last_seen') }}: {{s.updatedAt}}</p>
                <h4>{{ $t('sessions.device') }}</h4>
                <p>{{ $t('sessions.browser_on_os', { b: s.browser.name, o: s.os.name }) }}</p>
                <h4>{{ $t('sessions.signed_in') }}</h4>
                <p>{{ $t('sessions.ip_at_datetime', { i: s.firstIP, t: s.createdAt }) }}</p>
            </div>
            <div class="interaction">
                <button @click="revokeSession(s.id)" class="button">{{ $t('action.revoke_session') }}</button>
            </div>
        </div>
    </div>
</template>

<script>
import UAParser from 'ua-parser-js'
import { parseDate } from '@/utils'

import Lottie from '@/components/Lottie'
import * as uploadingAnimation from '@/assets/animations/loading.json'
import IconSession from '@/assets/jw_icons/session.svg?inline'

import SESSION_QUERY from '@/graphql/userSessionsQuery.gql'
import REVOKE_SESSION from '@/graphql/revokeSessionMutatioon.gql'

export default {
    name: 'SessionManager',
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
    components: { Lottie, IconSession },
    apollo: {
        userSessions: SESSION_QUERY,
    },
    methods: {
        revokeSession(sessionId) {
            if (this.loading) return
            this.errors = null
            this.loading = true
            this.$apollo.mutate({
                mutation: REVOKE_SESSION,
                variables: {
                    id: sessionId,
                },
                refetchQueries: [{ query: SESSION_QUERY }],
            }).then(() => {
                this.loading = false
            }).catch((error) => {
                this.errors = error.networkError.result.errors
                this.loading = false
            })
        },
    },
    computed: {
        sessions() {
            if (!this.userSessions) return []
            return this.userSessions.map(session => {
                const obj = {
                    ...session,
                    ...UAParser(session.userAgent),
                }
                obj.createdAt = parseDate(obj.createdAt)
                obj.updatedAt = parseDate(obj.updatedAt)
                delete obj.userAgent
                return obj
            })
        },
    },
}
</script>

<style scoped lang="stylus">
@import "~@/assets/styles/palette.styl"

.sessionManager
    position relative
    > .indicatorWrapper
        background rgba($archive-std, 0.5)
    .item .info
        h4
            font-weight 500
            margin-bottom .25rem
        p
            margin-bottom .75rem
        h4, p
            font-size 1rem
    @media screen and (max-width: $archive-screen-large)
        .item
            display grid
            padding-top 1rem
            padding-left 1rem
            padding-right 1rem
            padding-bottom .5rem
            grid-gap 1rem
            grid-template-columns auto 1fr
            grid-template-rows 1fr auto
            .previewWrapper
                grid-row 1
                grid-column 1 / 3
                .preview
                    margin 0
            .data
                grid-row 2
                grid-column 1
            .interaction
                grid-row 2
                grid-column 2
</style>
