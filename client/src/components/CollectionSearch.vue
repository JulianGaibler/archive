<template>
    <div>
        <div class="search-slim">
            <IconSearch />
            <input v-model="search" type="text" placeholder="Search..." />
        </div>

        <ul class="optionList" v-if="collections">
            <li class="option" v-for="{ node } in collections.edges" :key="node.id">
                <button @click="$emit('collection', node.id)" class="collectionItem option-noPadding">
                    <CollectionPreview class="collectionPreview-mini" :onlyColor="true" :items="node.posts.edges" />
                    <div class="desc">
                        <p class="top">{{node.title}}</p>
                        <p class="btm">by {{node.creator.username}}</p>
                    </div>
                </button>
            </li>
        </ul>
    </div>
</template>

<script>
import CollectionPreview from '@/components/CollectionPreview'
import IconSearch from '@/assets/jw_icons/search.svg?inline'

import COLLECTIONS_SEARCH from '@/graphql/collectionSearchQuery.gql'

export default {
    name: 'CollectionSearch',
    components: {
        IconSearch,
        CollectionPreview,
    },
    data() {
        return {
            search: '',
        }
    },
    apollo: {
        collections: {
            query: COLLECTIONS_SEARCH,
            variables() {
                return {

                }
            },
            debounce: 500,
        },
    },
}
</script>
