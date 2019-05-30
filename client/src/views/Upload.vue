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

            this.uploads.forEach(item => {
                item.errors = []
            })

            const data = this.uploads.map(({payload}) => {
                return {
                    file: payload.file,
                    keywords: payload.keywords,
                    title: payload.title,
                    caption: payload.caption.length > 0 ? payload.caption : undefined,
                }
            })

            
            await this.$apollo.mutate({
                mutation: UPLOAD_FILE,
                variables: {
                    posts: data,
                },
            }).then((a)=>{
                console.log('Upload Good: ', a)
            }).catch((e)=>{
                if (e.graphQLErrors) {
                    for (var i = e.graphQLErrors.length - 1; i >= 0; i--) {
                        if (e.graphQLErrors[i].extensions.code !== 'BAD_USER_INPUT') continue
                        this.handleInputErrors(e.graphQLErrors[i].extensions.exception)
                        break
                    }
                }
            })
        },
        handleInputErrors(errors) {
            Object.keys(errors).forEach(key => {
                if (key === 'stacktrace') return;
                console.log(errors)
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