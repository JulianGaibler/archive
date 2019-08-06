<template>
    <div class="frame framed">
        <header>
                <h1>{{ $t('views.archive') }}</h1>
        </header>

        <nav class="actionBar">
            <Search v-model="search" />
            <button class="actionBar-component button button-icon"><IconEdit /></button>
            <button class="actionBar-component button button-primary">Create New</button>
        </nav>

        <MediaList :search="search" />
    </div>
</template>

<script>
import Search from '@/components/Search'
import MediaList from '@/components/MediaList'

import IconEdit from '@/assets/jw_icons/edit.svg?inline'

export default {
    name: 'Archive',
    components: {
        Search, IconEdit, MediaList,
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
