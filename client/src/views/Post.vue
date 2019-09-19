<template>
    <div v-if="resources && node" class="frame framed post" ref="frame">
        <header>
            <h1>{{ $t('views.post') }}</h1>
        </header>

        <nav class="actionBar">
            <a :href="filePaths.download" download="true" class="actionBar-component button button-withIcon"><IconDownload />Compressed</a>
            <a :href="filePaths.original" download="true" class="actionBar-component button button-withIcon"><IconDownload />Original</a>
            <button class="actionBar-component button button-withIcon"><IconLink />Copy link to Post</button>
            <span class="actionBar-spacer"></span>
            <button class="actionBar-component button button-primary button-withIcon"><IconCollectionAdd />Add to Collection</button>
        </nav>

        <section class="media content content-dense">
            <picture v-if="node.type === 'IMAGE'">
                <source :srcset="filePaths.format1" type="image/webp">
                <img :src="filePaths.format2">
            </picture>
            <video
                controls
                muted
                loop
                v-else>
                <source :src="filePaths.format1" type="video/webm">
                <source :src="filePaths.format2" type="video/mp4">
            </video>
        </section>

        <PostInfo :post="node" class="content content-dense content-box" />

    </div>
</template>

<script>
import PostInfo from '@/components/PostInfo'

import IconDownload from '@/assets/jw_icons/download.svg?inline'
import IconLink from '@/assets/jw_icons/link.svg?inline'
import IconCollectionAdd from '@/assets/jw_icons/collection_add.svg?inline'

const formats = {
    IMAGE: ['webp', 'jpeg', 'jpeg'],
    VIDEO: ['webm', 'mp4', 'mp4'],
    GIF: ['webm', 'mp4', 'gif'],
}

import POST_QUERY from '@/graphql/postQuery.gql'
import RESOURCES_QUERY from '@/graphql/resourcesQuery.gql'

export default {
    name: 'Post',
    components: {
        PostInfo,
        IconDownload,
        IconLink,
        IconCollectionAdd,
    },
    apollo: {
        node: {
            query: POST_QUERY,
            variables() {
                return {
                    input: this.$route.params.id,
                }
            },
        },
        resources: {
            query: RESOURCES_QUERY,
        },
    },
    computed: {
        filePaths() {
            const types = formats[this.node.type]
            const rootPath = `//${this.resources.resourceDomain}/${this.resources.resourcePath}`
            return {
                format1: `${rootPath}${this.node.compressedPath}.${types[0]}`,
                format2: `${rootPath}${this.node.compressedPath}.${types[1]}`,
                download: `${rootPath}${this.node.compressedPath}.${types[2]}`,
                original: `${rootPath}${this.node.originalPath}`,
            }
        },
    },
}
</script>
