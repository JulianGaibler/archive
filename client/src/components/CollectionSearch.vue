<template>
    <div>
        <Search class="search-slim" :autofocus="true" v-model="search" />

        <ul class="optionList">
            <template v-if="collections">
                <li class="option options-moreMargin" v-for="{ node } in collections.edges" :key="node.id">
                    <button @click="$emit('collection', node.id)" class="collectionItem option-noPadding">
                        <CollectionPreview class="collectionPreview-mini" :onlyColor="true" :items="node.posts.edges" />
                        <div class="desc">
                            <p class="top">{{node.title}}</p>
                            <p class="btm">{{ $t('attributes.by') }} {{node.creator.username}}</p>
                        </div>
                    </button>
                </li>
            </template>
            <li class="option" v-if="$apollo.queries.collections.loading">
                <Lottie class="animationIcon" :options="animOptions" />
            </li>
            <li class="option" v-else-if="collections && collections.pageInfo.hasNextPage">
                <button @click="showMore" >{{ $t('action.show_more') }}</button>
            </li>
        </ul>
    </div>
</template>

<script>
import CollectionPreview from '@/components/CollectionPreview'
import Search from '@/components/Search'
import Lottie from '@/components/Lottie'

import * as loadingAnimation from '@/assets/animations/loading.json'

import COLLECTIONS_SEARCH from '@/graphql/collectionsQuery.gql'

export default {
    name: 'CollectionSearch',
    components: {
        Lottie,
        Search,
        CollectionPreview,
    },
    data() {
        return {
            search: {
                text: '',
                keywords: [],
                users: [],
            },
            animOptions: {
                animationData: loadingAnimation,
            },
        }
    },
    apollo: {
        collections: {
            query: COLLECTIONS_SEARCH,
            variables() {
                return {
                    byContent: this.search.text.length > 0 ? this.search.text : null,
                    byKeyword: this.search.keywords.length > 0 ? this.search.keywords : null,
                    byUser: this.search.users.length > 0 ? this.search.users : null,
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
