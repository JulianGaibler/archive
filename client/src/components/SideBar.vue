<template>
    <div>
        <div @click="toggle()" class="menu-button button button-icon">
            <IconMenu />
        </div>
        <div v-if="open" @click="toggle(false)" class="sidebar-blocker"></div>
        <div class="sidebar" :class="{ 'sidebar-open': open }">
            <div class="sidebar-header">
                <div class="sidebar-pic">
                    <picture v-if="me && me.profilePicture && resources">
                        <source type="image/webp" :srcset="`//${resources.resourceDomain}/${resources.resourcePath}upic/${me.profilePicture}-80.webp`">
                        <img :src="`//${resources.resourceDomain}/${resources.resourcePath}upic/${me.profilePicture}-80.jpeg`">
                    </picture>
                </div>
                <div class="nameCombo">
                    <div class="name">{{me ? me.name : ''}}</div>
                    <div class="username">{{me ? me.username : ''}}</div>
                </div>
            </div>
            <hr>
            <nav>
                <ul>
                    <li>
                        <router-link
                            @click="toggle(false)"
                            v-focus="open"
                            :to="{ name: 'Archive'}"
                            exact><IconArchive/>{{ $t('views.archive') }}</router-link>
                    </li>
                    <li>
                        <router-link @click="toggle(false)" :to="{ name: 'Collections'}"><IconCollection/>{{ $t('views.collections') }}</router-link>
                    </li>
                    <li>
                        <router-link @click="toggle(false)" :to="{ name: 'Users'}"><IconUser />{{ $t('views.users') }}</router-link>
                    </li>
                </ul>
                <ul>
                    <li>
                        <router-link @click="toggle(false)" :to="{ name: 'Upload'}"><IconUpload />{{ $t('views.upload') }}</router-link>
                    </li>
                    <li>
                        <router-link @click="toggle(false)" :to="{ name: 'Queue'}"><IconQueue />{{ $t('views.queue') }}</router-link>
                    </li>
                </ul>
                <ul>
                    <li>
                        <router-link @click="toggle(false)" :to="{ name: 'Settings'}"><IconSettings />{{ $t('views.settings') }}</router-link>
                    </li>
                    <li>
                        <button @click="logout" ><IconLogout/>{{ $t('action.logout') }}</button>
                    </li>
                </ul>
                <ul>
                    <li>
                        <router-link class="flex-link" @click="toggle(false)" :to="{ name: 'Release Notes'}"><IconChangelog /><span>{{ $t('views.releasenotes') }}</span><span v-if="showVersionLabel" class="tag">1.0.0</span></router-link>
                    </li>
                </ul>
            </nav>
            <transition-group name="notification" tag="div" class="notification">
                <UploadBox :key="1" v-if="uploadManager.working" />
            </transition-group>
        </div>
    </div>
</template>

<script>
import uploadManager from '../utils/UploadManager'
import { resetStore } from '@/vue-apollo.js'
import UploadBox from './SideBar/UploadBox'

import IconArchive from '@/assets/jw_icons/archive.svg?inline'
import IconChangelog from '@/assets/jw_icons/new_release.svg?inline'
import IconCollection from '@/assets/jw_icons/collection.svg?inline'
import IconLogout from '@/assets/jw_icons/logout.svg?inline'
import IconMenu from '@/assets/jw_icons/menu.svg?inline'
import IconQueue from '@/assets/jw_icons/queue.svg?inline'
import IconSettings from '@/assets/jw_icons/settings.svg?inline'
import IconUpload from '@/assets/jw_icons/upload.svg?inline'
import IconUser from '@/assets/jw_icons/user.svg?inline'

import ME_QUERY from '@/graphql/meQuery.gql'
import RESOURCES_QUERY from '@/graphql/resourcesQuery.gql'
import LOGOUT_MUTATION from '@/graphql/logoutMutation.gql'

const clientVersion = process.env.VUE_APP_VERSION

export default {
    name: 'SideBar',
    data() {
        return {
            open: false,
            uploadManager,
            showVersionLabel: false,
        }
    },
    components: {
        UploadBox,

        IconArchive,
        IconChangelog,
        IconCollection,
        IconLogout,
        IconMenu,
        IconQueue,
        IconSettings,
        IconUpload,
        IconUser,
    },
    apollo: {
        me: {
            query: ME_QUERY,
            result(result, key) {
                localStorage.user_theme = result.data[key].darkmode ? 'dark' : 'light'
                window.__setTheme()
            },
        },
        resources: RESOURCES_QUERY,
    },
    mounted() {
        const oldClientVersion = localStorage.getItem('client_version')
        localStorage.setItem('client_version', clientVersion)
        if (clientVersion !== oldClientVersion) this.showVersionLabel = true
    },
    methods: {
        toggle(bool) {
            if (bool !== undefined) { this.open = bool }
            else { this.open = !this.open }
        },
        async logout() {
            this.toggle(false)
            await this.$apollo.mutate({
                mutation: LOGOUT_MUTATION,
            })
            await resetStore()
        },
    },
}
</script>

<style scoped lang="stylus">
@import "~@/assets/styles/palette.styl"

.sidebar
    border-bottom-left-radius $archive-radius1
    min-width 18rem
    height 100%
    box-sizing border-box
    display flex
    flex-direction column
    padding .75rem 2rem 1.5rem 2rem
    c background archive-std
    hr
        border none
        border-top 1px solid rgba(0, 0, 0, 0.03)
        margin 0
    .sidebar-pic
        border-radius $archive-radius-profile
        overflow hidden
        c background archive-grey2
        picture
            width 100%
        line-height 0
        margin-right 0.75rem
        width 2.75rem
        height 2.75rem
    .sidebar-header
        display flex
        align-items center
        margin 2rem 0
        margin-left 0.625rem
        .nameCombo
            flex 1
            font-size 1.3rem
    nav
        font-weight 500
        flex 1
        ul
            margin 1.5rem 0
            a, button
                cursor pointer
                width 100%
                padding 0
                margin 0
                display flex
                align-items center
                border-radius $archive-radius3
                svg
                    margin 0.625rem
                &:focus.focus-visible
                    c box-shadow archive-primary1 inset 0 0 0 0.15rem
                &.router-link-active
                    c background archive-primary1-a01
                    c color archive-primary1
                    c fill archive-primary1
                &.flex-link
                    display inline-flex
                    span
                        flex 1
                span.tag
                    c background archive-primary1-a01
                    c color archive-primary1
                    padding .25rem .4rem
                    border-radius .4rem
                    flex 0
                    margin 0.625rem

    @media screen and (max-width: $archive-screen-mid)
        position fixed
        background $archive-std
        z-index 300
        top 0
        right 0
        bottom 0
        box-shadow $archive-hoverShadow3
        transform translateX(110%)
        transition transform .3s ease
        &.sidebar-open
            transform translateX(0)
.sidebar-blocker
    position fixed
    left 0
    right 0
    top 0
    bottom 0
    z-index 299
    background transparent

</style>

<style lang="stylus">
.notification-enter, .notification-leave-to {
  opacity 0
  z-index -1
}
.notification-leave-active {
  position absolute
  width 12.5rem
}
</style>
