<template>
    <div class="collection">
        <header class="framed extended">
            <h1>{{ $t('views.collection') }}</h1>

            <section v-if="node" class="headerRow">
                <CollectionPreview :items="node.posts.edges" />
                <div class="infoBox">
                    <h2>{{node.title}}</h2>
                    <div class="info">created by <UserLink :username="node.creator.username" :profilePicture="node.creator.profilePicture" /> <span class="spacerPipe">|</span> {{ $tc('items.item', node.posts.totalCount) }}</div>

                    <div class="text">
                        <template v-if="node.description">
                            <h3>Caption</h3>
                            <div class="caption indent">{{node.description}}</div>
                        </template>

                        <h3>Keywords</h3>
                        <div v-if="node.keywords.length > 0" class="keywords indent">
                            <div v-for="keyword in node.keywords" :key="keyword.id" class="chip chip-keyword">
                                <IconCollection /><span>{{keyword.name}}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <nav class="actionBar">
                <Search v-model="search" />
            </nav>
        </header>

        <MediaList class="frame framed" v-if="node" :search="fullSearch" />

    </div>
</template>

<script>
import Search from '@/components/Search'
import MediaList from '@/components/MediaList'
import CollectionPreview from '@/components/CollectionPreview'
import UserLink from '@/components/UserLink'

import IconCollection from '@/assets/jw_icons/collection.svg?inline'

import COLLECTION_QUERY from '@/graphql/collectionQuery.gql'
import RESOURCES_QUERY from '@/graphql/resourcesQuery.gql'

export default {
    name: 'Collection',
    components: {
        Search,
        MediaList,
        CollectionPreview,
        UserLink,
        IconCollection,
    },
    data() {
        return {
            columns: 4,
            currentID: this.$route.params.id,
            search: {
                text: '',
                postType: [],
                language: '',
                keywords: [],
            },
        }
    },
    apollo: {
        node: {
            query: COLLECTION_QUERY,
            variables() {
                return {
                    input: this.currentID,
                }
            },
        },
        resources: RESOURCES_QUERY,
    },
    computed: {
        fullSearch() {
            return {
                ...this.search,
                collections: [this.node.id],
            }
        },
    },
}
</script>
