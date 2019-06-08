<template>
    <div class="sidebar">
        <div class="sidebar-header">
            <div class="name-combo">
                <div class="name">{{me ? me.name : ''}}</div>
                <div class="username">{{me ? me.username : ''}}</div>
            </div>
            <div class="sidebar-button"><IconMenu /></div>
        </div>
        <nav>
            <ul>
                <li>Archive</li>
                <li>Collections</li>
                <li>Users</li>
            </ul>
            <ul>
                <li>Queue</li>
                <li>Sessions</li>
                <li>Settings</li>
            </ul>
            <ul>
                <li>Logout</li>
            </ul>
        </nav>
    </div>
</template>

<script>
import IconMenu from "@/assets/jw_icons/menu.svg?inline";
import UserQuery from "../graphql/user.gql";

export default {
    name: 'SideBar',
    components: {
        IconMenu
    },
    apollo: {
      // Simple query that will update the 'hello' vue property
      me: UserQuery,
    },
}
</script>
