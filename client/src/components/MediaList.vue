<template>
    <div>
        <div class="content mediaList" v-if="posts">
            <div v-for="(column, i) in sortedPosts" :key="i" class="column">
                <router-link tag="a" :to="{ name: 'Post', params: { id: post.node.id }}" class="item" v-for="post in column" :key="post.node.id">
                    <Preview :item="post.node" />
                </router-link>
            </div>
        </div>
        <button v-if="posts && posts.pageInfo.hasNextPage" @click="showMore" class="button">Show More</button>
    </div>
</template>

<script>
import gql from 'graphql-tag'
import Preview from '@/components/Preview'

const POSTS_QUERY = gql`query posts($after: String, $byUser: [ID!], $byKeyword: [ID!], $byType: [Format!], $byLanguage: Language, $byContent: String) {
    posts(first: 10, after: $after, byUser: $byUser, byKeyword: $byKeyword, byType: $byType, byLanguage: $byLanguage, byContent: $byContent) {
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
    components: { Preview },
    data() {
        return {
            columns: 4,
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
