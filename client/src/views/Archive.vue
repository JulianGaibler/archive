<template>
    <div>
        <header class="framed extended">
            <h1>{{ $t('views.archive') }}</h1>
            <nav class="actionBar">
                <Search class="actionBar-component" v-model="search" />
            </nav>
        </header>

        <MediaList class="frame framed" :search="search" />
    </div>
</template>

<script>
import Search from '@/components/Search'
import MediaList from '@/components/MediaList'

export default {
    name: 'Archive',
    components: {
        Search, MediaList,
    },
    data() {
        return {
            columns: 4,
            search: {
                text: '',
                postType: [],
                language: '',
                keywords: [],
                users: [],
            },
        }
    },
}
</script>
