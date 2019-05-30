<template>
    <div id="app">
        <main><slot /></main>
        <div class="sidebar">
            <div class="sidebar-header">
                <div class="name-combo">
                    <div class="name">Arnold</div>
                    <div class="username">Arceo</div>
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
                    <li>Settings</li>
                </ul>
                <ul>
                    <li>Logout</li>
                </ul>
            </nav>
        </div>
    </div>
</template>

<script>
import IconMenu from "@/assets/jw_icons/menu.svg?inline";

export default {
    name: 'SideBar',
    components: {
        IconMenu
    }
}
</script>