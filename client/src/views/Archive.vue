<template>
    <div class="frame framed">
        <header>
                <h1>{{ $t('views.archive') }}</h1>
        </header>

        <nav class="actionBar">
            <div class="actionBar-component actionBar-component-search">
                <IconSearch />
                <input type="text" placeholder="Search...">
            </div>
            <button class="actionBar-component button button-icon"><IconEdit /></button>
            <button class="actionBar-component button button-primary">Create New</button>
        </nav>

        <div class="content mediaList" v-if="posts">
            <div v-for="column in columns" :key="column" class="column">
                <div class="item" v-for="post in columnPosts(posts.edges, column)" :key="post.node.id">
                    <Preview :item="post.node" />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import gql from 'graphql-tag'

import Preview from '../components/Preview'

import IconSearch from '@/assets/jw_icons/search.svg?inline'
import IconEdit from '@/assets/jw_icons/edit.svg?inline'

const POSTS_QUERY = gql`query {
    posts(first: 100) {
        edges {
            node {
                id
                title
                type
                keywords {
                    name
                }
                thumbnailPath
                uploader {
                    name
                    username
                }
                caption
                updatedAt
                createdAt
            }
        }
    }
}`

export default {
    name: 'Archive',
    components: {
        IconSearch, IconEdit, Preview,
    },
    data() {
        return {
            columns: 4,
        }
    },
    apollo: {
        posts: {
            query: POSTS_QUERY,
        },
    },
    methods: {
        columnPosts(items, index) {
            return items.filter((item, i) => {
                return (i+1-index) % this.columns === 0
            })
        },
    },
}
</script>
