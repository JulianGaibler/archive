<template>
    <router-link tag="a" :to="{ name: 'User', params: { username: username }}" class="nameCombo nameCombo-inline" >
        <picture v-if="resources">
            <source type="image/webp" :srcset="`//${resources.resourceDomain}/${resources.resourcePath}upic/${profilePicture}-32.webp`">
            <img :src="`//${resources.resourceDomain}/${resources.resourcePath}upic/${profilePicture}-32.jpeg`">
        </picture>
        <span class="username">{{username}}</span>
    </router-link>
</template>

<script>
import RESOURCES_QUERY from '@/graphql/resourcesQuery.gql'

export default {
    name: 'UserLink',
    props: {
        username: String,
        profilePicture: String,
    },
    apollo: {
        resources: {
            query: RESOURCES_QUERY,
        },
    },
}
</script>
