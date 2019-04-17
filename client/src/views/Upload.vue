<template>
    <div class="frame upload" ref="frame">
        <header>
            <h1>Upload</h1>
            <button @click="startUpload">Upload</button>
        </header>

        <div class="items">
            <Item v-for="(upload, index) in uploads" :key="upload.id" :upload="upload.payload" @delete="deleteItem(index)" />
        </div>

        <input class="uploadclick" name="selectfile" id="selectfile" @change="handleX" type="file" multiple>
        <label class="uploadclick" for="selectfile"><IconUp /><div>Upload even more</div></label>

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

            const data = this.uploads.map(item => item.payload)

            await this.$apollo.mutate({
                mutation: UPLOAD_FILE,
                variables: {
                    posts: data,
                },
            }).then((a)=>{
                console.log(a)
            }).catch((e)=>{
                console.log('hmm')
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