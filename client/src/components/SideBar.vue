<template>
    <div>
        <div @click="toggle()" class="menu-button button button-icon">
            <IconMenu />
        </div>
        <div v-if="open" @click="toggle(false)" class="blocker"></div>
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
                        <router-link @click.native="toggle(false)" :to="{ name: 'Archive'}" exact><IconArchive/>Archive</router-link>
                    </li>
                    <li>
                        <a><IconCollection/>Collections</a>
                    </li>
                    <li>
                        <router-link @click.native="toggle(false)" :to="{ name: 'Users'}"><IconUser />Users</router-link>
                    </li>
                </ul>
                <ul>
                    <li>
                        <router-link @click.native="toggle(false)" :to="{ name: 'Upload'}"><IconUpload />Upload</router-link>
                    </li>
                    <li>
                        <router-link @click.native="toggle(false)" :to="{ name: 'Queue'}"><IconQueue />Queue</router-link>
                    </li>
                </ul>
                <ul>
                    <li>
                        <router-link @click.native="toggle(false)" :to="{ name: 'Settings'}"><IconSettings />Settings</router-link>
                    </li>
                    <li>
                        <a @click.native="toggle(false)" @click="logout"><IconLogout/>Logout</a>
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

import IconMenu from '@/assets/jw_icons/menu.svg?inline'
import IconArchive from '@/assets/jw_icons/archive.svg?inline'
import IconCollection from '@/assets/jw_icons/collection.svg?inline'
import IconLogout from '@/assets/jw_icons/logout.svg?inline'
import IconQueue from '@/assets/jw_icons/queue.svg?inline'
import IconSettings from '@/assets/jw_icons/settings.svg?inline'
import IconUpload from '@/assets/jw_icons/upload.svg?inline'
import IconUser from '@/assets/jw_icons/user.svg?inline'

import gql from 'graphql-tag'

const USER_QUERY = gql`{
    me {
        name
        username
        profilePicture
    }
}`
const RESOURCES_QUERY = gql`{
    resources {
        resourceDomain
        resourcePath
    }
}`
const LOGOUT_MUTATION = gql`
    mutation logout {
        logout
    }
`

export default {
    name: 'SideBar',
    data() {
        return {
            open: false,
            uploadManager,
        }
    },
    components: {
        UploadBox,

        IconMenu,
        IconArchive,
        IconCollection,
        IconLogout,
        IconQueue,
        IconSettings,
        IconUpload,
        IconUser,
    },
    apollo: {
        // Simple query that will update the 'hello' vue property
        me: USER_QUERY,
        resources: RESOURCES_QUERY,
    },
    methods: {
        toggle(bool) {
            if (bool !== undefined) { this.open = bool }
            else { this.open = !this.open }
        },
        async logout() {
            await this.$apollo.mutate({
                mutation: LOGOUT_MUTATION,
            })
            await resetStore()
        },
    },
}
</script>
