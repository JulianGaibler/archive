<template>
    <div class="user">
        <header class="framed extended">
            <h1>{{ $t('views.user') }}</h1>

            <section v-if="user" class="headerRow">
                <picture class="profilePic" v-if="resources">
                    <source type="image/webp" :srcset="`//${resources.resourceDomain}/${resources.resourcePath}upic/${user.profilePicture}-256.webp`">
                    <img :src="`//${resources.resourceDomain}/${resources.resourcePath}upic/${user.profilePicture}-256.jpeg`">
                </picture>
                <div class="infoBox">
                    <h2 class="nameCombo">
                        <div class="name">{{user.name}}</div>
                        <div class="username">{{user.username}}</div>
                    </h2>

                    <div class="text">
                        <p>{{ $tc('items.post', user.posts.totalCount) }}</p>
                        <p>{{ $tc('items.collection', user.collections.totalCount) }}</p>
                    </div>
                </div>
            </section>

            <nav class="actionBar">
                <Search class="actionBar-component" v-model="search" />
            </nav>
        </header>
        <MediaList class="frame framed" v-if="user" :search="fullSearch" />

    </div>
</template>

<script>
import Search from '@/components/Search'
import MediaList from '@/components/MediaList'

import USER_QUERY from '@/graphql/userQuery.gql'
import RESOURCES_QUERY from '@/graphql/resourcesQuery.gql'

export default {
    name: 'User',
    components: {
        Search,
        MediaList,
    },
    props: {
        username: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            search: {
                text: '',
                postType: [],
                language: '',
                keywords: [],
            },
        }
    },
    apollo: {
        user: {
            query: USER_QUERY,
            variables() {
                return {
                    input: this.username,
                }
            },
            result({ data }) {
                if (!data) return
                if (this.username !== data.user.username) {
                    this.$router.replace({ name: 'User', params: { username: data.user.username } })
                }
            },
        },
        resources: RESOURCES_QUERY,
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
    computed: {
        fullSearch() {
            return {
                ...this.search,
                users: [this.user.id],
            }
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
