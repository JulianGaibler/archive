<template>
    <div class="item">
        <div>
            <div class="preview">
                <video v-if="fileType==='video'" autoplay muted loop v-bind:src="imagePreview"/>
                <img v-else-if="fileType==='image'" v-bind:src="imagePreview"/>
                <div class="indicatorWrapper" v-if="locked">
                    <div class="indicator">
                        <IconQueue v-if="status.queued" />
                        <IconUpload v-else-if="status.uploading" />
                        <IconDone v-else-if="status.done" />
                        <IconClose v-else-if="status.failed" />
                    </div>
                </div>
            </div>
        </div>
        <template v-if="!locked">
            <Form :uploadIndex="uploadIndex" :fileType="fileType" />
            <div class="interaction">
                <button class="button button-icon" @click="deleteItem(uploadIndex)"><IconTrash /></button>
            </div>
        </template>
        <div v-else class="info">
            <div class="top">
                <h3>{{ items[uploadIndex].payload.title }}</h3>
                <p v-if="status.queued">{{ $t('state.queued') }}</p>
                <p v-else-if="status.uploading && progress.total === 1">{{ $t('state.uploading') }}</p>
                <p v-else-if="status.uploading">{{ $t('state.upload.x_of_y', {x:progress.current, y: progress.total}) }}</p>
                <p v-else-if="status.done">{{ $t('state.done') }}</p>
                <p v-else-if="status.failed">
                    {{ $t('state.failed') }} <span v-if="items[uploadIndex].errors.general"> - {{items[uploadIndex].errors.general}}</span></p>
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
import { mapMutations, mapState } from 'vuex'
import { formatBytes } from '../../utils'

import Form from './Form.vue'

import IconTrash from '@/assets/jw_icons/trash.svg?inline'
import IconClose from '@/assets/jw_icons/close.svg?inline'
import IconDone from '@/assets/jw_icons/done.svg?inline'
import IconQueue from '@/assets/jw_icons/queue.svg?inline'
import IconUpload from '@/assets/jw_icons/upload.svg?inline'

export default {
    name: 'Item',
    props: {
        uploadIndex: Number,
    },
    components: {
        Form,
        IconTrash,
        IconClose,
        IconDone,
        IconQueue,
        IconUpload,
    },
    computed: {
        status() {
            const status = this.items[this.uploadIndex].upload.status
            return {
                queued: status === 0,
                uploading: status === 1,
                done: status === 2,
                failed: status === 3,
            }
        },
        progress() {
            const current = this.items[this.uploadIndex].upload.progress_current
            const total = this.items[this.uploadIndex].upload.progress_total
            return {
                current: formatBytes(current, 0),
                total: formatBytes(total, 0),
                percent: (current / total) * 100,
            }
        },
        ...mapState('upload', [
            'items',
            'locked',
        ]),
    },
    data() {
        return {
            imagePreview: '',
            fileType: '',
        }
    },
    mounted() {
        let reader  = new FileReader()
        reader.addEventListener('load', function () {
            this.imagePreview = reader.result
            this.fileType = this.items[this.uploadIndex].payload.file.type.split('/')[0]
        }.bind(this), false)
        reader.readAsDataURL( this.items[this.uploadIndex].payload.file )
    },
    methods: {
        ...mapMutations('upload', [
            'deleteItem',
        ]),
    },
}
</script>
