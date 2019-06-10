<template>
    <div class="frame upload" ref="frame">
        <header>
            <div class="col1">
                <h1>Upload</h1>
                <button class="button-big" @click="startUpload">Send</button>
            </div>
        </header>

        <div class="content items">
            <Item v-for="(upload, index) in uploads" :key="upload.id" :upload="upload" @delete="deleteItem(index)" />

            <input class="uploadclick" name="selectfile" id="selectfile" @change="handleX" type="file" multiple>
            <div class="uploadclick item">
                <div>
                    <label class="preview" for="selectfile">
                        <IconUp />
                        <div v-if="uploads.length === 0 ">Select files or drop them here</div>
                        <div v-else >Upload even more</div>
                    </label>
                </div>
            </div>
        </div>

        <div class="dropzone" :class="{showDropzone: showDropzone}" ref="dropzone"></div>
    </div>
</template>

<script>
import Item from './Upload/Item.vue'
import UPLOAD_FILE from '../graphql/UploadFile.gql'

import IconUp from "@/assets/icon_up.svg?inline";

export default {
    name: 'Upload',
    data() {
        return {
            uploads: [],
            showDropzone: false,
            counter: 0,
        }
    },
    components: {
        Item,
        IconUp
    },
    methods: {
        handleX(e) {
            Array.from(e.target.files).forEach(this.addFiles);
        },
        addFiles(file) {
            this.uploads.push({
                id: ++this.counter,
                errors: [],
                payload: {
                    file,
                    keywords: [],
                    title: '',
                    caption: '',
                    type: '',
                    language: '',
                }
            })
        },
        allowDrag(e) {
            //if (true) {
                e.dataTransfer.dropEffect = 'copy';
            //}
            e.preventDefault();
        },
        deleteItem(index) {
            this.uploads.splice(index, 1);
        },
        async startUpload() {
            // 1. Reset all errors
            this.uploads.forEach(item => {
                item.errors = []
            })
            // 2. Collect data
            const data = this.uploads.map(({payload}) => {
                return {
                    file: payload.file,
                    keywords: payload.keywords,
                    title: payload.title,
                    language: payload.language.toUpperCase(),
                    type: payload.type.length > 0 ? payload.type : undefined,
                    caption: payload.caption.length > 0 ? payload.caption : undefined,
                }
            })
            // Check for basic mistakes


            let hasLocalErrors = false
            data.forEach((item, index) => {
                if (item.title.length < 1) {
                    this.uploads[index].errors.title = [{ message: this.$t('error.required_field') }]
                    hasLocalErrors = true
                }
                if (item.language === '') {
                    this.uploads[index].errors.language = [{ message: this.$t('error.required_field') }]
                    hasLocalErrors = true
                }
            })

            if (hasLocalErrors) return;

            await this.$apollo.mutate({
                mutation: UPLOAD_FILE,
                variables: {
                    posts: data,
                },
            }).then((a)=>{
                console.log('Upload Good: ', a)
            }).catch((e)=>{
                if (!e.networkError.result.errors) return;
                for (let i = 0; i < e.networkError.result.errors.length; i++) {
                    const err = e.networkError.result.errors[i]
                    if (err.code === 'InputError') {
                        this.handleInputErrors(err.errors)
                        return
                    }
                }
            })
        },
        handleInputErrors(errors) {
            console.log('test', errors)
            Object.keys(errors).forEach(key => {
                this.uploads[errors[key].index].errors = errors[key].error.data
            })
        },
    },
    mounted() {
        const frame = this.$refs.frame
        const dropzone = this.$refs.dropzone
        frame.addEventListener('dragenter', () => {
            this.showDropzone = true;
        });

        // 2
        dropzone.addEventListener('dragenter', this.allowDrag);
        dropzone.addEventListener('dragover', this.allowDrag);

        // 3
        dropzone.addEventListener('dragleave', () => {
            this.showDropzone = false;
        });

        // 4
        dropzone.addEventListener('drop', (e)=>{
            e.preventDefault();
            Array.from(e.dataTransfer.files).forEach(this.addFiles);
            this.showDropzone = false;
        });
    }
}
</script>
