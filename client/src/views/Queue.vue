<template>
    <div class="queue">
        <header class="framed">
            <h1>{{ $t('views.queue') }}</h1>

            <nav class="actionBar">
                <Search v-model="search" />
                <button class="actionBar-component button button-icon"><IconReload /></button>
            </nav>
        </header>

        <div class="frame framed">
            <div v-if="tasks" class="itemList itemList-progress">
                <div v-for="{ node: { id, title, status, uploader, progress, ext, createdPost, notes } } in tasks.edges" :key="id" class="item">
                    <div class="indicatorWrapper">
                        <div class="indicator">
                            <IconQueue v-if="status === 'QUEUED'" />
                            <Lottie v-else-if="status === 'PROCESSING'" :options="processingAnimationOptions" />
                            <IconDone v-else-if="status === 'DONE'" />
                            <IconClose v-else-if="status === 'FAILED'" />
                        </div>
                    </div>
                    <div class="info">
                        <div class="top">
                            <h3>{{ title }}</h3>
                            <div class="nameCombo nameCombo-small">
                                <div class="name">{{uploader.name}}</div>
                                <div class="username">{{uploader.username}}</div>
                            </div>
                        </div>
                        <div v-if="status === 'PROCESSING'" class="btm">
                            <div class="progress">
                                <div class="progress-bar" :style="{width: `${progress}%`}"> </div>
                            </div>
                        </div>
                        <div v-if="status === 'FAILED'" class="btm">
                            <code>{{notes}}</code>
                        </div>
                    </div>
                    <div class="interaction">
                        <div class="label">{{ext}}</div>
                        <router-link
                            v-if="createdPost"
                            tag="button"
                            :to="{ name: 'Post', params: { id: createdPost.id }}"
                            class="button">{{ $t('action.show_post') }}</router-link>
                    </div>
                </div>
            </div>
            <div v-if="tasks" class="itemRow itemRow-center">
                <div class="indicator" v-if="$apollo.queries.tasks.loading">
                    <Lottie :options="loadingAnimationOptions" />
                </div>
                <button v-else-if="tasks.pageInfo.hasNextPage" @click="showMore" class="button">Show More</button>
            </div>
        </div>
    </div>
</template>

<script>
import Lottie from '../components/Lottie'
import Search from '@/components/Search'
import * as processingAnimation from '@/assets/animations/processing.json'
import * as loadingAnimation from '@/assets/animations/loading.json'

import IconClose from '@/assets/jw_icons/close.svg?inline'
import IconDone from '@/assets/jw_icons/done.svg?inline'
import IconQueue from '@/assets/jw_icons/queue.svg?inline'
import IconReload from '@/assets/jw_icons/reload.svg?inline'

import TASKS_QUERY from '@/graphql/tasksQuery.gql'
import TASKS_SUBSCRIPTION from '@/graphql/taskUpdatesSubscription.gql'

export default {
    name: 'Queue',
    components: { Search, IconClose, IconDone, IconQueue, Lottie, IconReload },
    data() {
        return {
            search: {
                text: '',
                taskType: [],
                users: [],
            },
            processingAnimationOptions: {
                animationData: processingAnimation,
            },
            loadingAnimationOptions: {
                animationData: loadingAnimation,
            },
        }
    },
    apollo: {
        tasks: {
            query: TASKS_QUERY,
            variables() {
                return {
                    byTitle: this.search.text.length > 0 ? this.search.text : undefined,
                    byStatus: this.search.taskType.length > 0 ? this.search.taskType : undefined,
                    byUser: this.search.users.length > 0 ? this.search.users : undefined,
                }
            },
            debounce: 500,
            subscribeToMore: {
                document: TASKS_SUBSCRIPTION,
                updateQuery: (currentData, { subscriptionData }) => {
                    if (!subscriptionData.data) return
                    const taskUpdate = subscriptionData.data.taskUpdates

                    if (taskUpdate.kind === 'CREATED') {
                        currentData.tasks.edges.unshift({
                            node: taskUpdate.task,
                        })
                        return currentData
                    }
                    let index = -1
                    for (let i = currentData.tasks.edges.length - 1; i >= 0; i--) {
                        if (currentData.tasks.edges[i].node.id === taskUpdate.id) {
                            index = i
                            return
                        }
                    }
                    if (index < 0) return

                    if (taskUpdate.kind === 'CHANGED') {
                        currentData.tasks.edges[index].node = {
                            ...currentData.tasks.edges[index].node,
                            ...taskUpdate.task,
                        }
                        return currentData
                    }
                    if (taskUpdate.kind === 'DELETED') {
                        currentData.tasks.edges.splice(index, 1)
                        return currentData
                    }
                },
            },
        },
    },
    methods: {
        showMore() {
            this.$apollo.queries.tasks.fetchMore({
                variables: {
                    after: this.tasks.pageInfo.endCursor,
                },
                updateQuery: (previousResult, { fetchMoreResult }) => {
                    const newEdges = fetchMoreResult.tasks.edges
                    const pageInfo = fetchMoreResult.tasks.pageInfo
                    return newEdges.length? {
                        tasks: {
                            __typename: previousResult.tasks.__typename,
                            edges: [...previousResult.tasks.edges, ...newEdges],
                            pageInfo,
                        },
                    } : previousResult
                },
            })
        },
    },
}
</script>

<style scoped lang="stylus">
.queue
    @media screen and (max-width: $archive-screen-small)
        .itemList > .item
            display grid
            grid-template-columns: auto 1fr
            grid-template-rows: 1fr
            .indicatorWrapper
                grid-row 1
                grid-column 1
            .info
                grid-row 1
                grid-column 2
            .interaction
                grid-row 2
                grid-column 1 / 3
</style>
