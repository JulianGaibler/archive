<template>
    <div class="collection">
        <header class="framed extended">
            <h1>{{ $t('views.collection') }}</h1>

            <section v-if="node" class="headerRow">
                <CollectionPreview :items="node.posts.edges" />
                <CollectionInfo :node="node" class="infoBox" />
            </section>

            <nav class="actionBar">
                <Search class="actionBar-component" v-model="search" />
            </nav>
        </header>

        <MediaList class="frame framed" v-if="node" :search="fullSearch" />

    </div>
</template>

<script>
import Search from '@/components/Search'
import MediaList from '@/components/MediaList'
import CollectionPreview from '@/components/CollectionPreview'
import CollectionInfo from '@/components/CollectionInfo'

import COLLECTION_QUERY from '@/graphql/collectionQuery.gql'
import RESOURCES_QUERY from '@/graphql/resourcesQuery.gql'

export default {
    name: 'Collection',
    components: {
        Search,
        MediaList,
        CollectionPreview,
        CollectionInfo,
    },
    data() {
        return {
            editMode: false,
            search: {
                text: '',
                postType: [],
                language: '',
                keywords: [],
            },
        }
    },
    props: {
        id: {
            type: String,
            required: true,
        },
    },
    apollo: {
        node: {
            query: COLLECTION_QUERY,
            variables() {
                return {
                    input: this.id,
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
