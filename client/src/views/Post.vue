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
            <video controls muted loop v-else>
                <source :src="filePaths.format1" type="video/webm">
                <source :src="filePaths.format2" type="video/mp4">
            </video>
        </section>

        <section class="content content-dense content-box">
            <h2>{{node.title}}</h2>
            <p>created by
                <router-link tag="a" :to="{ name: 'User', params: { username: node.uploader.username }}" class="nameCombo nameCombo-inline" >
                    <picture>
                        <source type="image/webp" :srcset="`//${resources.resourceDomain}/${resources.resourcePath}upic/${node.uploader.profilePicture}-32.webp`">
                        <img :src="`//${resources.resourceDomain}/${resources.resourcePath}upic/${node.uploader.profilePicture}-32.jpg`">
                    </picture>
                    <span class="username">{{node.uploader.username}}</span>
                </router-link> | {{parseDate(node.createdAt)}}
            </p>

            <div v-if="node.keywords.length > 0" class="keywords">
                <div v-for="keyword in node.keywords" :key="keyword.id" class="keyword">{{keyword.name}}</div>
            </div>

            <div class="caption">
                {{node.caption ? node.caption : $t('state.noCaption')}}
            </div>
        </section>

    </div>
</template>

<script>
import gql from 'graphql-tag'
import { parseDate } from '@/utils'

import IconDownload from '@/assets/jw_icons/download.svg?inline'
import IconLink from '@/assets/jw_icons/link.svg?inline'
import IconCollectionAdd from '@/assets/jw_icons/collection_add.svg?inline'

const formats = {
    IMAGE: ['webp', 'jpg', 'jpg'],
    VIDEO: ['webm', 'mp4', 'mp4'],
    GIF: ['webm', 'mp4', 'gif'],
}

const NODE_QUERY = gql`
  query getNode($input: ID!) {
    node(id: $input) {
      id
      ... on Post {
        title
        type
        compressedPath
        originalPath
        createdAt
        keywords {
            id
            name
        }
        uploader {
            name
            username
            profilePicture
        }
      }
    }
  }
`
const RESOURCES_QUERY = gql`
  query {
    resources {
      resourceDomain
        resourcePath
    }
  }
`

export default {
    name: 'Post',
    data() {
        return {

        }
    },
    components: {
        IconDownload,
        IconLink,
        IconCollectionAdd,
    },
    apollo: {
        node: {
            query: NODE_QUERY,
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
    methods: {
        parseDate,
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
