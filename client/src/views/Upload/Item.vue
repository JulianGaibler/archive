<template>
    <div class="item">
        <div class="previewWrapper">
            <div class="preview">
                <video
                    v-if="fileType==='video'"
                    autoplay
                    muted
                    loop
                    v-bind:src="imagePreview"/>
                <img v-else-if="fileType==='image'" v-bind:src="imagePreview"/>
                <div class="indicatorWrapper indicatorWrapper-absolute indicatorWrapper-center" v-if="uploadManager.locked">
                    <div class="indicator indicator-shadow">
                        <IconQueue v-if="status.queued" />
                        <Lottie v-else-if="status.uploading" :options="animOptions" />
                        <IconDone v-else-if="status.done" />
                        <IconClose v-else-if="status.failed" />
                    </div>
                </div>
            </div>
        </div>
        <template v-if="!uploadManager.locked">
            <Form :uploadItem="uploadItem" :fileType="fileType" />
            <div class="interaction">
                <button class="button button-icon" @click="uploadManager.deleteItem(uploadItem.id)"><IconTrash /></button>
            </div>
        </template>
        <div v-else class="info">
            <div class="top">
                <h3>{{ uploadItem.payload.title }}</h3>
                <p v-if="status.queued">{{ $t('state.queued') }}</p>
                <p v-else-if="status.uploading && progress.total === 1">{{ $t('state.uploading') }}</p>
                <p v-else-if="status.uploading">{{ $t('state.upload.x_of_y', {x:progress.current, y: progress.total}) }}</p>
                <p v-else-if="status.done">{{ $t('state.done') }}</p>
                <p v-else-if="status.failed">
                    {{ $t('state.failed') }} <span v-if="uploadItem.errors.general"> - {{uploadItem.errors.general}}</span></p>
            </div>
            <div v-if="status.uploading" class="btm">
                <div class="progress">
                    <div class="progress-bar" :style="{width: `${progress.percent}%`}" />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import uploadManager from '../../utils/UploadManager'
import { formatBytes } from '../../utils'

import Lottie from '../../components/Lottie'
import * as uploadingAnimation from '@/assets/animations/uploading.json'

import Form from './Form'

import IconTrash from '@/assets/jw_icons/trash.svg?inline'
import IconClose from '@/assets/jw_icons/close.svg?inline'
import IconDone from '@/assets/jw_icons/done.svg?inline'
import IconQueue from '@/assets/jw_icons/queue.svg?inline'

export default {
    name: 'Item',
    props: {
        uploadItem: Object,
    },
    data() {
        return {
            uploadManager,
            imagePreview: '',
            fileType: '',
            animOptions: {
                animationData: uploadingAnimation,
            },
        }
    },
    components: {
        Form,
        IconTrash,
        IconClose,
        IconDone,
        IconQueue,
        Lottie,
    },
    computed: {
        status() {
            const status = this.uploadItem.upload.status
            return {
                queued: status === 0,
                uploading: status === 1,
                done: status === 2,
                failed: status === 3,
            }
        },
        progress() {
            const current = this.uploadItem.upload.progress_current
            const total = this.uploadItem.upload.progress_total
            return {
                current: formatBytes(current, 0),
                total: formatBytes(total, 0),
                percent: (current / total) * 100,
            }
        },
    },
    mounted() {
        let reader  = new FileReader()
        reader.addEventListener('load', function () {
            this.imagePreview = reader.result
            this.fileType = this.uploadItem.payload.file.type.split('/')[0]
        }.bind(this), false)
        reader.readAsDataURL( this.uploadItem.payload.file )
    },
}
</script>

<style scoped lang="stylus">
@import "~@/assets/styles/palette.styl"

.item
    transition .25s background, .25s margin
    > :not(:last-child)
        margin-right 2rem
        @media screen and (max-width: $archive-screen-large)
            margin-right 0
    .previewWrapper
        width 30%
        @media screen and (max-width: $archive-screen-large)
            width auto
    .preview
        border-radius $archive-radius2
        position relative
        overflow hidden
        -webkit-mask-image -webkit-radial-gradient(white, black)
        transition .25s width
        line-height 0
        img, video
            width 100%
            object-fit cover
    label.preview
        min-width 20rem
    @media screen and (max-width: $archive-screen-large)
        display grid
        padding-top 1rem
        padding-left 1rem
        padding-bottom .5rem
        grid-gap 1rem
        grid-template-columns 1fr
        grid-template-rows 1fr auto
        .previewWrapper
            grid-row 1
            grid-column 1 / 3
            .preview
                margin 0
        .data
            grid-row 2
            grid-column 1
        .interaction
            grid-row 2
            grid-column 2
        label.preview
            min-width auto
        .preview
            margin 0 auto 0 auto
    &.uploadclick
        .preview
            line-height 1rem
            display block
            padding 4.25rem 1.5rem 5rem 1.5rem
            text-align center
            border 2px solid $archive-grey1
            color $archive-primary
            font-weight 500
            box-sizing border-box
            svg
                height 2rem
                width auto
                fill $archive-primary
    &.itemList-progress .item
        background $archive-grey1
        margin-bottom 1rem
        .preview
            width 6.5rem
            height 6.5rem
            > *
                height 100%
                width auto
                object-fit cover
</style>
