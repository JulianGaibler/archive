<template>
    <div class="users">
        <header class="framed">
            <h1>{{ $t('views.users') }}</h1>

            <nav class="actionBar">
                <Search class="actionBar-component" v-model="search" />
            </nav>
        </header>

        <div class="frame framed">
            <div class="content itemList" v-if="users">
                <router-link
                    tag="a"
                    v-for="({ node }) in users.edges"
                    :key="node.id"
                    :to="{ name: 'User', params: { username: node.username }}"
                    class="item">
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
                        <div class="btm">{{ $tc('items.post', node.posts.totalCount) }} <span class="spacerPipe">|</span> {{ $tc('items.collection', node.collections.totalCount) }}</div>
                    </div>
                </router-link>
            </div>
            <button v-if="users && users.pageInfo.hasNextPage" @click="showMore" class="button">Show More</button>
        </div>
    </div>
</template>

<script>
import Search from '../components/Search'

import USERS_QUERY from '@/graphql/usersQuery.gql'
import RESOURCES_QUERY from '@/graphql/resourcesQuery.gql'

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
    beforeMount() {
        if (window.history.state.search) {
            this.search = window.history.state.search
        }
    },
    beforeRouteLeave(to, from, next) {
        history.replaceState({
            ...window.history.state,
            search: this.search,
        }, '')
        next()
    },
}
</script>

<style scoped lang="stylus">
@import "~@/assets/styles/palette.styl"

.users
    .itemList .item
        > picture
            background $archive-grey1
            border-radius $archive-radius-profile
            overflow hidden
            width 10rem
            height 10rem
            margin-right 2rem
            @media screen and (max-width: $archive-screen-small)
                width 5rem
                height 5rem
                margin-right 1rem
        > .info > .top
            font-size 1.6rem
</style>
