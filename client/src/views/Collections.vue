<template>
    <div>
        <header class="framed extended">
            <h1>{{ $t('views.collections') }}</h1>

            <nav class="actionBar">
                <Search class="actionBar-component" v-model="search" />
                <div class="hoverParent">
                    <button @click="createCollection = true" class="actionBar-component button button-primary" >{{$t('action.new_collection')}}</button>
                    <div v-if="createCollection" v-click-outside="() => { createCollection = false }" class="hoverBox hoverBox-right">
                        <h2>Create Collection</h2>
                        <CollectionCreate @cancel="createCollection = false" />
                    </div>
                </div>
            </nav>
        </header>

        <div class="frame framed collections">
            <div class="itemList" v-if="collections">
                <router-link
                    tag="a"
                    v-for="({ node }) in collections.edges"
                    :key="node.id"
                    :to="{ name: 'Collection', params: { id: node.id }}"
                    class="item">
                    <CollectionPreview :items="node.posts.edges" />
                    <div class="info">
                        <div class="top">{{node.title}}</div>
                        <div class="btm"><UserLink :username="node.creator.username" :profilePicture="node.creator.profilePicture" /> <span class="spacerPipe">|</span> {{ $tc('items.post', node.posts.totalCount) }}</div>
                    </div>
                </router-link>
            </div>
            <button v-if="collections && collections.pageInfo.hasNextPage" @click="showMore" class="button">Show More</button>
        </div>
    </div>
</template>

<script>
import Search from '@/components/Search'
import UserLink from '@/components/UserLink'
import CollectionPreview from '@/components/CollectionPreview'
import CollectionCreate from '@/components/CollectionCreate'

import COLLECTIONS_QUERY from '@/graphql/collectionsQuery.gql'
import RESOURCES_QUERY from '@/graphql/resourcesQuery.gql'

export default {
    name: 'Collections',
    components: { Search, UserLink, CollectionPreview, CollectionCreate },
    data() {
        return {
            createCollection: false,
            search: {
                text: '',
            },
        }
    },
    apollo: {
        resources: RESOURCES_QUERY,
        collections: {
            query: COLLECTIONS_QUERY,
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
            this.$apollo.queries.collections.fetchMore({
                variables: {
                    after: this.collections.pageInfo.endCursor,
                },
                updateQuery: (previousResult, { fetchMoreResult }) => {
                    const newEdges = fetchMoreResult.collections.edges
                    const pageInfo = fetchMoreResult.collections.pageInfo
                    return newEdges.length? {
                        collections: {
                            __typename: previousResult.collections.__typename,
                            edges: [...previousResult.collections.edges, ...newEdges],
                            pageInfo,
                        },
                    } : previousResult
                },
            })
        },
    },
}
</script>
