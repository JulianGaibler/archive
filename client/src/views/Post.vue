<template>
    <div v-if="resources && node" class="post" ref="frame">
        <header class="framed extended">
            <h1>{{ $t('views.post') }}</h1>

            <nav class="actionBar">
                <a :href="filePaths.download" download="true" class="actionBar-component button button-withIcon"><IconDownload />Compressed</a>
                <a :href="filePaths.original" download="true" class="actionBar-component button button-withIcon"><IconDownload />Original</a>
                <button class="actionBar-component button button-withIcon"><IconLink />Copy link to Post</button>
                <span class="actionBar-spacer"></span>
                <button class="actionBar-component button button-primary button-icon hoverParent">
                    <IconCollectionAdd @click="toggleCollections(true)" />
                    <div v-if="collectionAdd" v-click-outside="() => toggleCollections(false)" class="hoverBox hoverBox-right">
                        <h2>Add to Collection</h2>
                    </div>
                </button>
            </nav>
        </header>

        <div class="frame framed">
            <section class="media">
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

            <PostInfo :post="node" />

        </div>
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
    data() {
        return {
            currentID: this.$route.params.id,
            collectionAdd: false,
        }
    },
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
                    input: this.currentID,
                }
            },
        },
        resources: {
            query: RESOURCES_QUERY,
        },
    },
    methods: {
        toggleCollections(bool) {
            this.collectionAdd = bool
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

<style scoped lang="stylus">
@import "~@/assets/styles/palette.styl"

.post
    .media
        width 100%
        border-radius $archive-radius2
        overflow hidden
        -webkit-mask-image -webkit-radial-gradient(white, black)
        line-height 0
        img, video
            width 100%
    h2
        margin-bottom .25rem
</style>
