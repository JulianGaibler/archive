<template>
    <div class="notification-box">
        <div class="top">
            <IconUpload />
            <div>
                <h3>Uploading Files...</h3>
                <p>{{current+1}} of {{items.length}}</p>
            </div>
        </div>
        <div class="btm">
            <div class="progress" v-for="item in items" :key="item.id" :style="{flex: distributionCalc(item)}">
                <div class="progress-bar" :style="{width: `${ percentageCalc(item) }%`}" /></div>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import IconUpload from '@/assets/jw_icons/upload.svg?inline'

export default {
    name: 'UploadBox',
    components: {
        IconUpload,
    },
    computed: {
        ...mapState('upload', [
            'current',
            'items',
        ]),
        distribution() {
            return {
                main: Math.min(this.items.length, 4),
                other: 1,
            }
        },
    },
    methods: {
        distributionCalc(item) {
            return item.upload.status === 1 ? this.distribution.main : this.distribution.other
        },
        percentageCalc(item) {
            if (item.upload.status === 1)
                return (item.upload.progress_current/item.upload.progress_total)*100
            if (item.upload.status < 1)
                return 0
            return 100
        },
    },
}
</script>
