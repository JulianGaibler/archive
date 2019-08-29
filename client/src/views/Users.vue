<template>
    <div class="frame framed users">
        <header>
                <h1>{{ $t('views.users') }}</h1>
        </header>

        <nav class="actionBar">
            <Search v-model="search" />
        </nav>

        <div class="content itemList" v-if="users">
            <router-link tag="a" v-for="({ node }) in users.edges" :key="node.id" :to="{ name: 'User', params: { username: node.username }}" class="item">
                <picture v-if="resources">
                    <source type="image/webp" :srcset="`//${resources.resourceDomain}/${resources.resourcePath}upic/${node.profilePicture}-256.webp`">
                    <img :src="`//${resources.resourceDomain}/${resources.resourcePath}upic/${node.profilePicture}-256.jpeg`">
                </picture>
                <div class="info">
                    <div class="top">
                        <div class="nameCombo">
                            <div class="name">{{node.name}}</div>
                            <div class="username">{{node.username}}</div>
                        </div>
                    </div>
                </div>
            </router-link>
        </div>
        <button v-if="users && users.pageInfo.hasNextPage" @click="showMore" class="button">Show More</button>
    </div>
</template>

<script>
import gql from 'graphql-tag'

import Search from '../components/Search'

const USERS_QUERY = gql`query users($after: String, $byUsername: String) {
    users(first: 10, after: $after, byUsername: $byUsername) {
        edges {
            node {
                id
                name
                username
                profilePicture
            }
        }
        pageInfo {
            hasNextPage
            endCursor
        }
    }
}`
const RESOURCES_QUERY = gql`{
    resources {
        resourceDomain
        resourcePath
    }
}`

export default {
    name: 'Users',
    components: {
        Search,
    },
    data() {
        return {
            columns: 4,
            search: {
                text: '',
            },
        }
    },
    apollo: {
        resources: RESOURCES_QUERY,
        users: {
            query: USERS_QUERY,
            variables() {
                return {
                    byUsername: this.search.text.length > 0 ? this.search.text : null,
                }
            },
            debounce: 500,
        },
    },
    methods: {
        showMore() {
            this.$apollo.queries.users.fetchMore({
                variables: {
                    after: this.users.pageInfo.endCursor,
                },
                updateQuery: (previousResult, { fetchMoreResult }) => {
                    const newEdges = fetchMoreResult.users.edges
                    const pageInfo = fetchMoreResult.users.pageInfo
                    return newEdges.length? {
                        users: {
                            __typename: previousResult.users.__typename,
                            edges: [...previousResult.users.edges, ...newEdges],
                            pageInfo,
                        },
                    } : previousResult
                },
            })
        },
    },
}
</script>
