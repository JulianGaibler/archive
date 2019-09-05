<template>
    <div class="notification-box">
        <div class="top">
            <Lottie class="icon" :options="animOptions" />
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
import Lottie from '../../components/Lottie'
import * as uploadingAnimation from '@/assets/animations/uploading.json'

import uploadManager from '../../utils/UploadManager'

export default {
    name: 'UploadBox',
    data() {
        return {
            uploadManager,
            animOptions: {
                animationData: uploadingAnimation,
            },
        }
    },
    components: {
        Lottie,
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
