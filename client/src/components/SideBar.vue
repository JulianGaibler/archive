<template>
    <div class="sidebar">
        <div class="sidebar-header">
            <div class="sidebar-button"></div>
            <div class="nameCombo">
                <div class="name">{{me ? me.name : ''}}</div>
                <div class="username">{{me ? me.username : ''}}</div>
            </div>
        </div>
        <hr>
        <nav>
            <ul>
                <li>
                    <router-link :to="{ name: 'Archive'}" exact><IconArchive/>Archive</router-link>
                </li>
                <li>
                    <a><IconCollection/>Collections</a>
                </li>
                <li>
                    <a><IconUser/>Users</a>
                </li>
            </ul>
            <ul>
                <li>
                    <router-link :to="{ name: 'Upload'}"><IconUpload />Upload</router-link>
                </li>
                <li>
                    <router-link :to="{ name: 'Queue'}"><IconQueue />Queue</router-link>
                </li>
            </ul>
            <ul>
                <li>
                    <a><IconSettings/>Settings</a>
                </li>
                <li>
                    <a><IconLogout/>Logout</a>
                </li>
            </ul>
        </nav>
        <transition-group name="notification" tag="div" class="notification">
            <UploadBox :key="1" v-if="uploadManager.working" />
        </transition-group>
    </div>
</template>

<script>
import uploadManager from '../utils/UploadManager'

import UploadBox from './SideBar/UploadBox'

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
    }
}`

export default {
    name: 'SideBar',
    data() {
        return {
            uploadManager,
        }
    },
    components: {
        UploadBox,

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
    },
}
</script>
