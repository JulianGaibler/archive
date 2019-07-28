<template>
    <div class="notification-box">
        <div class="top">
            <IconUpload />
            <div>
                <h3>Uploading Files...</h3>
                <p>{{uploadManager.current+1}} of {{uploadManager.items.length}}</p>
            </div>
        </div>
        <div class="btm">
            <div class="progress" v-for="item in uploadManager.items" :key="item.id" :style="{flex: distributionCalc(item)}">
                <div class="progress-bar" :style="{width: `${ percentageCalc(item) }%`}" />{{percentageCalc(item)}}</div>
        </div>
    </div>
</template>

<script>
import uploadManager from '../../utils/UploadManager'

import IconUpload from '@/assets/jw_icons/upload.svg?inline'

export default {
    name: 'UploadBox',
    data() {
        return {
            uploadManager,
        }
    },
    components: {
        IconUpload,
    },
    computed: {
        distribution() {
            return {
                main: Math.min(this.uploadManager.items.length, 4),
                other: 1,
            }
        },
    },
    methods: {
        distributionCalc(item) {
            console.log(item)
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
