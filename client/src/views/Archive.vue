<template>
    <div class="frame framed">
        <header>
                <h1>Archive</h1>
        </header>

        <nav class="actionBar">
            <div class="actionBar-component actionBar-component-search">
                <IconSearch />
                <input type="text" placeholder="Search...">
            </div>
            <button class="actionBar-component button button-icon"><IconEdit /></button>
            <button class="actionBar-component button button-primary">Create New</button>
        </nav>

        <div class="content" v-if="posts">
            <div v-for="post in posts" :key="post.id">
                <h2>{{post.id}}</h2>
            </div>
        </div>
    </div>
</template>

<script>
import PostsQuery from '../graphql/Posts.gql'

import IconSearch from "@/assets/jw_icons/search.svg?inline";
import IconEdit from "@/assets/jw_icons/edit.svg?inline";

export default {
    name: 'Archive',
    components: {
        IconSearch, IconEdit
    },
    apollo: {
        posts: {
            query: PostsQuery,
        }
    },
}
</script>
