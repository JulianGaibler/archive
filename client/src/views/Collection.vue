<template>
    <div class="frame framed collection">
        <header>
            <h1>{{ $t('views.collection') }}</h1>
        </header>

        <section v-if="node" class="content content-dense content-box itemRow">
            <div class="itemRow-grow">
                <h2>{{node.title}}</h2>
                <p>{{node.description}}</p>
            </div>
            <CollectionPreview :items="node.posts.edges" />
        </section>

        <nav class="actionBar content content-dense">
            <Search v-model="search" />
        </nav>

        <MediaList v-if="node" :search="search" />

    </div>
</template>

<script>
import Search from '@/components/Search'
import MediaList from '@/components/MediaList'
import CollectionPreview from '@/components/CollectionPreview'

import COLLECTION_QUERY from '@/graphql/collectionQuery.gql'
import RESOURCES_QUERY from '@/graphql/resourcesQuery.gql'

export default {
    name: 'Collection',
    components: {
        Search,
        MediaList,
        CollectionPreview,
    },
    data() {
        return {
            columns: 4,
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
                    input: this.$route.params.id,
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
