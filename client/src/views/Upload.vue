<template>
    <div class="frame framed upload" ref="frame">
        <header>
                <h1>{{ $t('views.upload') }}</h1>
        </header>

        <nav class="actionBar">
            <div class="actionBar-component actionBar-component-text actionBar-grower">
                {{ $t('state.upload.files_count', { count: items.length, max: 30 }) }}
            </div>
            <button v-if="locked" class="actionBar-component button button-primary" @click="releaseUpload">{{$t(working ? 'action.upload.cancel_upload' : 'action.upload.new_upload')}}</button>
            <template v-else>
                <button class="actionBar-component button button-icon" @click="clearAllItems"><IconTrash /></button>
                <button class="actionBar-component button button-primary" @click="initiateUpload">{{$t('action.upload.upload_files')}}</button>
            </template>
        </nav>

        <div class="content items" :class="{ noEdit: locked }">
            <div v-if="errors.length > 0" class="content errorBox">
                <div v-for="error in errors" :key="error.code">{{ error.messageT ? $t(error.messageT) : error.message }}</div>
            </div>

            <Item v-for="(upload, index) in items" :key="upload.id" :uploadIndex="index" />

            <template v-if="!locked">
                <input class="uploadclick" name="selectfile" id="selectfile" @change="handleFileEvent" type="file" multiple>
                <div class="uploadclick item">
                    <div>
                        <label class="preview" for="selectfile">
                            <IconUp />
                            <div v-if="items.length === 0 ">{{ $t('action.upload.select_files') }}</div>
                            <div v-else >{{ $t('action.upload.select_more_files') }}</div>
                        </label>
                    </div>
                </div>
            </template>
        </div>

        <div class="dropzone" :class="{showDropzone}" ref="dropzone"></div>
    </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex'

import Item from './Upload/Item.vue'

import IconUp from "@/assets/jw_icons/up.svg?inline";
import IconTrash from "@/assets/jw_icons/trash.svg?inline";

export default {
    name: 'Upload',
    data() {
        return {
            showDropzone: false,
            counter: 0,
        }
    },
    components: {
        Item,
        IconUp,
        IconTrash,
    },
    computed: {
        ...mapState('upload', [
            'items',
            'errors',
            'locked',
            'working',
        ])
    },
    mounted() {
        const frame = this.$refs.frame
        const dropzone = this.$refs.dropzone
        const allowDrag = e => {
            e.dataTransfer.dropEffect = 'copy'
            e.preventDefault()
        }

        frame.addEventListener('dragenter', () => {
            this.showDropzone = true;
        });

        // 2
        dropzone.addEventListener('dragenter', allowDrag);
        dropzone.addEventListener('dragover', allowDrag);

        // 3
        dropzone.addEventListener('dragleave', () => {
            this.showDropzone = false;
        });

        // 4
        dropzone.addEventListener('drop', (e)=>{
            e.preventDefault();
            Array.from(e.dataTransfer.files).forEach(f => this.$store.commit('upload/addItem', f));
            this.showDropzone = false;
        });
    },
    methods: {
        handleFileEvent(e) {
            Array.from(e.target.files).forEach(f => this.$store.commit('upload/addItem', f));
        },
        async initiateUpload() {
            if (await this.$store.dispatch('upload/lockUpload')) {
                this.$store.dispatch('upload/startUpload')
            }
        },
        ...mapMutations('upload', [
            'clearAllItems',
            'releaseUpload',
        ])
    },
}
</script>
