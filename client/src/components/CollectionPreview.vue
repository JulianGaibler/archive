<template>
    <div class="collectionPreview">
        <template v-if="!onlyColor && resources">
            <picture v-for="item in items" :key="item.node.thumbnailPath" :style="{'background-color': item.node.color}">
                <source type="image/webp" :srcset="`//${resources.resourceDomain}/${resources.resourcePath}${item.node.thumbnailPath}.webp`">
                <img :src="`//${resources.resourceDomain}/${resources.resourcePath}${item.node.thumbnailPath}.jpeg`">
            </picture>
        </template>
        <template v-else>
            <div v-for="item in items" :key="item.node.thumbnailPath" :style="{'background-color': item.node.color}"></div>
        </template>
    </div>
</template>

<script>
import RESOURCES_QUERY from '@/graphql/resourcesQuery.gql'

export default {
    name: 'CollectionPreview',
    props: {
        items: Array,
        onlyColor: Boolean,
    },
    apollo: {
        resources: {
            query: RESOURCES_QUERY,
        },
    },
}
</script>
