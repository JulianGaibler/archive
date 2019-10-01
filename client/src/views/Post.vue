<template>
    <div v-if="resources && node" class="post" ref="frame">
        <header class="framed extended">
            <h1>{{ $t('views.post') }}</h1>

            <nav class="actionBar">
                <a :href="filePaths.download" download="true" class="actionBar-component button button-withIcon"><IconDownload />Compressed</a>
                <a :href="filePaths.original" download="true" class="actionBar-component button button-withIcon"><IconDownload />Original</a>
                <button class="actionBar-component button button-withIcon"><IconLink />Copy link to Post</button>
                <span class="actionBar-spacer"></span>

                <div class="hoverParent">
                    <button @click="collectionAdd = true" class="actionBar-component button button-primary button-icon">
                        <IconCollectionAdd />
                    </button>
                    <div v-if="collectionAdd" class="hoverBox hoverBox-right">
                        <div class="itemRow hoverBox-header">
                            <h2 class="itemRow-grow">Add to Collection</h2>
                            <button @click="collectionAdd = false" class="button button-chip">Close</button>
                        </div>
                        <CollectionSearch @collection="addCollection" />
                    </div>
                </div>
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
import { parseError } from '@/utils'

import PostInfo from '@/components/PostInfo'
import CollectionSearch from '@/components/CollectionSearch'

import IconDownload from '@/assets/jw_icons/download.svg?inline'
import IconLink from '@/assets/jw_icons/link.svg?inline'
import IconCollectionAdd from '@/assets/jw_icons/collection_add.svg?inline'

const formats = {
    IMAGE: ['webp', 'jpeg', 'jpeg'],
    VIDEO: ['webm', 'mp4', 'mp4'],
    GIF: ['webm', 'mp4', 'gif'],
}

import { resetStore } from '@/vue-apollo'

import POST_QUERY from '@/graphql/postQuery.gql'
import RESOURCES_QUERY from '@/graphql/resourcesQuery.gql'

import ADD_TO_COLLECTION from '@/graphql/addToCollectionQuery.gql'

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
        CollectionSearch,
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
    methods: {
        addCollection(id) {
            this.uploading = true
            this.$apollo.mutate({
                mutation: ADD_TO_COLLECTION,
                variables: {
                    id,
                    postIds: [this.$route.params.id],
                },
                refetchQueries: [{
                    query: POST_QUERY,
                    variables: { input: this.currentID },
                }],
            }).then((a) => {
                resetStore(true)
                console.log(a)
            }).catch((rawError) => {
                const error = parseError(rawError)
                console.log(error)
            })
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
</style>
