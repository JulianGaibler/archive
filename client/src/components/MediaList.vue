<template>
    <div>
        <template v-if="posts">
            <div v-if="this.posts.edges < 1" class="content notice">
                <img src="@/assets/pictograms/empty.svg">
                <h2>Nothing here</h2>
            </div>
            <div v-else class="content mediaList">
                <div v-for="(column, i) in sortedPosts" :key="i" class="column">
                    <router-link tag="a" :to="{ name: 'Post', params: { id: post.node.id }}" class="item" v-for="post in column" :key="post.node.id">
                        <Preview :item="post.node" />
                    </router-link>
                </div>
            </div>
            <div class="itemRow itemRow-center">
                <div class="indicator" v-if="$apollo.queries.posts.loading">
                    <Lottie :options="animOptions" />
                </div>
                <button v-else-if="posts.pageInfo.hasNextPage" @click="showMore" class="button">Show More</button>
            </div>
        </template>
        <div v-else-if="$apollo.queries.posts.loading" class="content notice">
            <div class="indicator">
                <Lottie :options="animOptions" />
            </div>
        </div>
    </div>
</template>

<script>
import gql from 'graphql-tag'
import Preview from '@/components/Preview'
import Lottie from '@/components/Lottie'

import * as uploadingAnimation from '@/assets/animations/loading.json'

const POSTS_QUERY = gql`query posts($after: String, $byUser: [ID!], $byKeyword: [ID!], $byType: [Format!], $byLanguage: Language, $byContent: String) {
    posts(first: 20, after: $after, byUser: $byUser, byKeyword: $byKeyword, byType: $byType, byLanguage: $byLanguage, byContent: $byContent) {
        edges {
            node {
                id
                title
                type
                relHeight
                keywords {
                    name
                }
                thumbnailPath
                uploader {
                    name
                    username
                }
                caption
                updatedAt
                createdAt
            }
        }
        pageInfo {
            hasNextPage
            endCursor
        }
    }
}`

export default {
    name: 'MediaList',
    props: ['search'],
    components: { Preview, Lottie },
    data() {
        return {
            loading: true,
            columns: 4,
            animOptions: {
                animationData: uploadingAnimation,
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
            if (this.$el.clientWidth < 300) { this.columns = 1 }
            else if (this.$el.clientWidth < 500) { this.columns = 2 }
            else if (this.$el.clientWidth < 700) { this.columns = 3 }
            else if (this.$el.clientWidth < 900) { this.columns = 4 }
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
