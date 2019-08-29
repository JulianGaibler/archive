<template>
    <div class="previewItem" :style="{'padding-bottom': `${item.relHeight}%`}" v-if="resources">
        <picture v-if="item.type === 'IMAGE'">
            <source type="image/webp" :srcset="`//${resources.resourceDomain}/${resources.resourcePath}thumbnail/${item.id}.webp`">
            <img :src="`//${resources.resourceDomain}/${resources.resourcePath}thumbnail/${item.id}.jpeg`">
        </picture>
        <video muted autoplay loop v-else>
            <source :src="`//${resources.resourceDomain}/${resources.resourcePath}${item.thumbnailPath}.webm`" type="video/webm">
            <source :src="`//${resources.resourceDomain}/${resources.resourcePath}${item.thumbnailPath}.mp4`" type="video/mp4">
        </video>
    </div>
</template>

<script>
import gql from 'graphql-tag'

const RESOURCES = gql`query getResources{
    resources {
        resourceDomain
        resourcePath
    }
}`

export default {
    name: 'Preview',
    props: ['item'],
    data() {
        return {

        }
    },
    apollo: {
        resources: {
            query: RESOURCES,
        },
    },
}
</script>
