<template>
    <div class="upload" ref="frame">
        <header class="framed">
            <h1>{{ $t('views.upload') }}</h1>

            <nav class="actionBar">
                <div class="actionBar-component actionBar-component-text actionBar-grower">
                    <span class="error" v-if="upload.anyErrors">{{ $t('error.generic_upload') }}</span>
                    <span v-else>{{ $t('state.upload.files_count', { count: upload.items.length, max: 30 }) }}</span>
                </div>
                <button v-if="upload.locked" class="actionBar-component button button-primary" @click="upload.stopUpload()">{{$t(upload.working ? 'action.upload.cancel_upload' : 'action.upload.new_upload')}}</button>
                <template v-else>
                    <button class="actionBar-component button button-icon" @click="clearAllItems()"><IconTrash /></button>
                    <button class="actionBar-component button button-primary" @click="upload.startUpload()">{{$t('action.upload.upload_files')}}</button>
                </template>
            </nav>
        </header>
        <div class="frame framed">
            <div class="itemList" :class="{ 'itemList-progress': upload.locked }">
                <div v-if="upload.errors.length > 0" class="errorBox">
                    <div v-for="error in upload.errors" :key="error.code">{{ error.messageT ? $t(error.messageT) : error.message }}</div>
                </div>

                <Item v-for="item in upload.items" :key="item.id" :uploadItem="item" />

                <template v-if="!upload.locked">
                    <input
                        class="uploadclick"
                        name="selectfile"
                        id="selectfile"
                        @change="handleFileEvent"
                        type="file"
                        multiple>
                    <label class="uploadclick" for="selectfile">
                        <IconUp />
                        <div v-if="upload.items.length === 0 ">{{ $t('action.upload.select_files') }}</div>
                        <div v-else >{{ $t('action.upload.select_more_files') }}</div>
                    </label>
                </template>
            </div>

            <div class="dropzone" :class="{showDropzone}" ref="dropzone"></div>
        </div>
    </div>
</template>

<script>
import EventBus from '@/EventBus'
import uploadManager from '../utils/UploadManager'

import Item from './Upload/Item.vue'

import IconUp from '@/assets/jw_icons/up.svg?inline'
import IconTrash from '@/assets/jw_icons/trash.svg?inline'

export default {
    name: 'Upload',
    data() {
        return {
            upload: uploadManager,
            showDropzone: false,
        }
    },
    components: {
        IconTrash,
        IconUp,
        Item,
    },
    mounted() {
        const frame = this.$refs.frame
        const dropzone = this.$refs.dropzone
        const allowDrag = e => {
            e.dataTransfer.dropEffect = 'copy'
            e.preventDefault()
        }
        // 1
        frame.addEventListener('dragenter', () => {
            if (!this.upload.locked) this.showDropzone = true
        })
        // 2
        dropzone.addEventListener('dragenter', allowDrag)
        dropzone.addEventListener('dragover', allowDrag)
        // 3
        dropzone.addEventListener('dragleave', () => {
            this.showDropzone = false
        })
        // 4
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault()
            Array.from(e.dataTransfer.files).forEach(f => this.addFileHandler(f))
            this.showDropzone = false
        })
    },
    methods: {
        handleFileEvent(e) {
            Array.from(e.target.files).forEach(f => this.addFileHandler(f))
        },
        addFileHandler(f) {
            const rv = this.upload.addItem(f)
            if (rv === 0) return

            const messageT = rv === 2 ? 'error.reached_upload_limit' : (rv === 3 ? 'error.file_type_not_supported' : 'prompts.not_right')
            EventBus.$emit('pushPrompt', {
                messageAT: messageT,
                actionAT: 'action.okay',
                confirm: () => { this.upload.clearAllItems() },
            })
        },
        clearAllItems() {
            EventBus.$emit('pushPrompt', {
                important: true,
                messageAT: 'prompts.sure_remove_from_list',
                messageBT: 'prompts.cannot_undo',
                actionAT: 'action.cancel',
                actionBT: 'action.delete',
                confirm: () => { this.upload.clearAllItems() },
            })
        },
    },
}
</script>

<style scoped lang="stylus">
@import "~@/assets/styles/palette.styl"

span.error
    color $archive-primary1

.upload
    display flex
    box-sizing border-box
    min-height 100%
    flex-direction column
    position relative
    input.uploadclick
        width 0.1px
        height 0.1px
        opacity 0
        overflow hidden
        position absolute
        z-index -1
    label.uploadclick
        line-height 1rem
        display block
        padding 4.25rem 1.5rem 5rem 1.5rem
        text-align center
        border-radius $archive-radius2
        border-width 2px
        border-color $archive-grey1
        border-style solid
        font-weight 500
        box-sizing border-box
        svg
            height 2rem
            width auto
    input.uploadclick:focus.focus-visible + label.uploadclick
        border-color $archive-primary1
</style>
