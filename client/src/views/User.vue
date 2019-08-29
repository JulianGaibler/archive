<template>
    <div class="frame framed user">
        <header>
                <h1>{{ $t('views.user') }}</h1>
        </header>

        <section v-if="user" class="content content-dense content-box itemRow">
            <div class="itemRow-grow">
                <div class="nameCombo">
                    <div class="name">{{user.name}}</div>
                    <div class="username">{{user.username}}</div>
                </div>
            </div>
            <picture class="profilePic" v-if="resources">
                <source type="image/webp" :srcset="`//${resources.resourceDomain}/${resources.resourcePath}upic/${user.profilePicture}-256.webp`">
                <img :src="`//${resources.resourceDomain}/${resources.resourcePath}upic/${user.profilePicture}-256.jpeg`">
            </picture>
        </section>

        <nav class="actionBar content content-dense">
            <Search v-model="search" />
        </nav>

        <MediaList v-if="user" :search="search" />

    </div>
</template>

<script>
import gql from 'graphql-tag'

import Search from '@/components/Search'
import MediaList from '@/components/MediaList'


const NODE_QUERY = gql`
  query getUser($input: String!) {
    user(username: $input) {
      id
      name
      username
      profilePicture
    }
  }
`
const RESOURCES_QUERY = gql`{
    resources {
        resourceDomain
        resourcePath
    }
}`

export default {
    name: 'Users',
    components: {
        Search,
        MediaList,
    },
    data() {
        return {
            columns: 4,
            search: {
                text: '',
                postType: [],
                language: '',
                keywords: [],
            },
        }
    },
    apollo: {
        user: {
            query: NODE_QUERY,
            variables() {
                return {
                    input: this.$route.params.username,
                }
            },
            result({ data }) {
                if (this.$route.params.username !== data.user.username) {
                    this.$router.replace({ name: 'User', params: { username: data.user.username } })
                }
            },
        },
        resources: RESOURCES_QUERY,
    },
    methods: {
        showMore() {
            this.$apollo.queries.users.fetchMore({
                variables: {
                    after: this.users.pageInfo.endCursor,
                },
                updateQuery: (previousResult, { fetchMoreResult }) => {
                    const newEdges = fetchMoreResult.users.edges
                    const pageInfo = fetchMoreResult.users.pageInfo
                    return newEdges.length? {
                        users: {
                            __typename: previousResult.users.__typename,
                            edges: [...previousResult.users.edges, ...newEdges],
                            pageInfo,
                        },
                    } : previousResult
                },
            })
        },
    },
    computed: {
        fullSearch() {
            return {
                ...this.search,
                users: [this.user.id],
            }
        },
    },
}
</script>
