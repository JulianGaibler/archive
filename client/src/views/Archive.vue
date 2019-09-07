<template>
    <div class="frame framed">
        <header>
                <h1>{{ $t('views.archive') }}</h1>
        </header>

        <nav class="actionBar">
            <Search v-model="search" />
        </nav>

        <MediaList :search="search" />
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
