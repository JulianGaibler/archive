<template>
    <div>
        <template v-if="posts">
            <div v-if="this.posts.edges < 1" class="pictogram">
                <img src="@/assets/pictograms/empty.svg">
                <h2>{{ $t('result.nothing_here') }}</h2>
            </div>
            <div v-else class="mediaList">
                <div v-for="(column, i) in sortedPosts" :key="i" class="column">
                    <router-link
                        tag="a"
                        :to="{ name: 'Post', params: { id: post.node.id }}"
                        class="item"
                        v-for="post in column"
                        :aria-label="post.node.title"
                        :key="post.node.id">
                        <Preview :item="post.node" />
                    </router-link>
                </div>
            </div>
            <div class="itemRow itemRow-center">
                <div class="indicator" v-if="$apollo.queries.posts.loading">
                    <Lottie :options="animOptions" />
                </div>
                <button v-else-if="posts.pageInfo.hasNextPage" @click="showMore" class="button">{{ $t('action.show_more') }}</button>
            </div>
        </template>
        <div v-else-if="$apollo.queries.posts.loading" class="itemRow itemRow-center">
            <div class="indicator">
                <Lottie :options="animOptions" />
            </div>
        </div>
    </div>
</template>

<script>
import Preview from '@/components/Preview'
import Lottie from '@/components/Lottie'

import * as loadingAnimation from '@/assets/animations/loading.json'

import POSTS_QUERY from '@/graphql/postsQuery.gql'

export default {
    name: 'MediaList',
    props: ['search'],
    components: { Preview, Lottie },
    data() {
        return {
            loading: true,
            columns: 4,
            animOptions: {
                animationData: loadingAnimation,
            },
        }
    },
    apollo: {
        posts: {
            query: POSTS_QUERY,
            variables() {
                return {
                    byContent: this.search.text && this.search.text.length > 0 ? this.search.text : null,
                    byType: this.search.postType,
                    byLanguage: this.search.language && this.search.language.length > 0 ? this.search.language : null,
                    byKeyword: this.search.keywords,
                    byCollection: this.search.collections,
                    byUser: this.search.users,
                }
            },
            debounce: 500,
        },
    },
    mounted() {
        this.windowResized()
        window.addEventListener('resize', this.windowResized)
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.windowResized)
    },
    methods: {
        showMore() {
            this.$apollo.queries.posts.fetchMore({
                variables: {
                    after: this.posts.pageInfo.endCursor,
                },
                updateQuery: (previousResult, { fetchMoreResult }) => {
                    const newEdges = fetchMoreResult.posts.edges
                    const pageInfo = fetchMoreResult.posts.pageInfo
                    return newEdges.length? {
                        posts: {
                            __typename: previousResult.posts.__typename,
                            edges: [...previousResult.posts.edges, ...newEdges],
                            pageInfo,
                        },
                    } : previousResult
                },
            })
        },
        windowResized() {
            if (this.$el.clientWidth === 0) return
            if (this.$el.clientWidth < 400) { this.columns = 1 }
            else if (this.$el.clientWidth < 600) { this.columns = 2 }
            else if (this.$el.clientWidth < 800) { this.columns = 3 }
            else if (this.$el.clientWidth < 1000) { this.columns = 4 }
            else { this.columns = 5 }
        },
    },
    computed: {
        sortedPosts() {
            if (!this.posts) return [[]]
            let distribution = new Array(this.columns)
            distribution.fill(0)
            let items = distribution.map(() => [])


            this.posts.edges.forEach((post) => {
                let smallestIndex = distribution.reduce((iMin, x, i, arr) => x < arr[iMin] ? i : iMin, 0)
                items[smallestIndex].push(post)
                distribution[smallestIndex] += post.node.relHeight
            })
            return items
        },
    },
}
</script>

<style scoped lang="stylus">
@import "~@/assets/styles/palette.styl"

.mediaList
    display flex
    margin-bottom 1rem
    > .column
        flex 1
        &:not(:last-child)
            margin-right 1rem
        > .item
            display block
            overflow hidden
            -webkit-mask-image -webkit-radial-gradient(white, black)
            text-align center
            border-radius $archive-radius2
            background $archive-grey1
            position relative
            &:focus.focus-visible::after
                content ''
                position absolute
                border-radius $archive-radius2
                c box-shadow archive-primary1 inset 0 0 0 0.2rem
                top 0
                left 0
                right 0
                bottom 0
            &:not(:last-child)
                margin-bottom 1rem

.pictogram
    padding 1rem
    text-align center
    h2
        margin-top 1rem
</style>
