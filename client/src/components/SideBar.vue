<template>
    <div class="sidebar">
        <div class="sidebar-header">
            <div class="sidebar-button"></div>
            <div class="name-combo">
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
                    <router-link :to="{ name: 'Upload'}"><IconUp/>Upload</router-link>
                </li>
                <li>
                    <a><IconQueue/>Queue</a>
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
    </div>
</template>

<script>
import IconArchive from "@/assets/jw_icons/archive.svg?inline";
import IconCollection from "@/assets/jw_icons/collection.svg?inline";
import IconLogout from "@/assets/jw_icons/logout.svg?inline";
import IconQueue from "@/assets/jw_icons/queue.svg?inline";
import IconSettings from "@/assets/jw_icons/settings.svg?inline";
import IconUp from "@/assets/jw_icons/up.svg?inline";
import IconUser from "@/assets/jw_icons/user.svg?inline";



import UserQuery from "../graphql/user.gql";

export default {
    name: 'SideBar',
    components: {
        IconArchive,
        IconCollection,
        IconLogout,
        IconQueue,
        IconSettings,
        IconUp,
        IconUser
    },
    apollo: {
      // Simple query that will update the 'hello' vue property
      me: UserQuery,
    },
}
</script>
