<template>
    <div class="previewItem" :style="{'padding-bottom': `${item.relHeight}%`}" v-if="resources">
        <picture v-if="item.type === 'IMAGE' || !initiatedPlayback">
            <source type="image/webp" :srcset="`//${resources.resourceDomain}/${resources.resourcePath}thumbnail/${item.id}.webp`">
            <img :src="`//${resources.resourceDomain}/${resources.resourcePath}thumbnail/${item.id}.jpeg`">
        </picture>
        <video ref="player" nofullscreen playsinline autoplay muted loop v-else>
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
            timeout: null,
            initiatedPlayback: false,
            playback: false,
        }
    },
    mounted() {
        if (this.item.type !== 'IMAGE') {
            this.$el.addEventListener('mouseenter', this.startHandler)
            this.$el.addEventListener('mouseleave', this.endHandler)
        }
    },
    beforeDestroy() {
        if (this.item.type !== 'IMAGE') {
            this.$el.removeEventListener('mouseenter', this.startHandler)
            this.$el.removeEventListener('mouseleave', this.endHandler)
        }
    },
    apollo: {
        resources: {
            query: RESOURCES,
        },
    },
    methods: {
        startHandler() {
            if (!this.initiatedPlayback) {
                this.timeout = setTimeout(() => {
                    this.initiatedPlayback = true
                    this.timeout = null
                }, 1000)
            } else {
                if (this.$refs.player) { this.$refs.player.play() }
            }
        },
        endHandler() {
            if (this.timeout) {
                clearTimeout(this.timeout)
                this.timeout = null
            }
            if (this.$refs.player) { this.$refs.player.pause() }
        },
    },
}
</script>
