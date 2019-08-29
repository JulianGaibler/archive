<template>
    <div class="profileInput">
        <div v-if="errors" class="errorBox">
            <p v-for="(error, i) in errors" :key="i">{{error.message}}</p>
        </div>
        <div class="profilePic" ref="profilePic">
            <div class="dropzone" :class="{showDropzone}" ref="dropzone"></div>
            <div v-if="uploading" class="indicatorWrapper indicatorWrapper-absolute indicatorWrapper-center">
                <div class="indicator indicator-shadow">
                    <Lottie :options="animOptions" />
                </div>
            </div>
            <picture v-if="me && me.profilePicture && resources">
                <source type="image/webp" :srcset="`//${resources.resourceDomain}/${resources.resourcePath}upic/${me.profilePicture}-256.webp`">
                <img :src="`//${resources.resourceDomain}/${resources.resourcePath}upic/${me.profilePicture}-256.jpeg`">
            </picture>
        </div>

        <div class="itemRow itemRow-center">
            <input v-if="uploadReady" name="selectfile" id="selectfile" @change="uploadPicture" type="file">
            <label class="button button-icon" for="selectfile"><UploadEdit /></label>
            <button class="button button-icon" @click="deletePicture"><TrashEdit /></button>
        </div>
    </div>
</template>

<script>
import gql from 'graphql-tag'

import UploadEdit from '@/assets/jw_icons/upload.svg?inline'
import TrashEdit from '@/assets/jw_icons/trash.svg?inline'

import Lottie from '@/components/Lottie'
import * as uploadingAnimation from '@/assets/animations/loading.json'

const USER_QUERY = gql`{
    me {
        profilePicture
    }
}`
const RESOURCES_QUERY = gql`{

    resources {
        resourceDomain
        resourcePath
    }
}`

const UPLOAD_PICTURE = gql`mutation uploadPicture($file: Upload!){
    uploadProfilePicture(file: $file)
}`

const DELETE_PICTURE = gql`mutation {
    clearProfilePicture
}`

export default {
    name: 'Settings',
    data() {
        return {
            uploading: false,
            uploadReady: true,
            showDropzone: false,
            errors: null,
            animOptions: {
                animationData: uploadingAnimation,
            },
        }
    },
    components: { UploadEdit, TrashEdit, Lottie },
    apollo: {
        me: USER_QUERY,
        resources: RESOURCES_QUERY,
    },
    mounted() {
        const frame = this.$refs.profilePic
        const dropzone = this.$refs.dropzone
        const allowDrag = e => {
            e.dataTransfer.dropEffect = 'copy'
            e.preventDefault()
        }
        // 1
        frame.addEventListener('dragenter', () => {
            this.showDropzone = true
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
            this.uploadPicture({ target: { files: e.dataTransfer.files } })
            this.showDropzone = false
        })
    },
    methods: {
        uploadPicture(e) {
            if (this.uploading) return
            this.errors = null
            const file = e.target.files[0]
            this.uploading = true
            this.$apollo.mutate({
                mutation: UPLOAD_PICTURE,
                variables: {
                    file,
                },
                refetchQueries: [{ query: USER_QUERY }],
            }).then((data) => {
                console.log(data)
                this.uploading = false
            }).catch((error) => {
                this.errors = error.networkError.result.errors
                this.uploading = false
            })
            this.uploadReady = false
            this.$nextTick(() => {
                this.uploadReady = true
            })
        },
        deletePicture() {
            this.uploading = true
            this.errors = null
            this.$apollo.mutate({
                mutation: DELETE_PICTURE,
                refetchQueries: [{ query: USER_QUERY }],
            }).then((data) => {
                console.log(data)
                this.uploading = false
            }).catch((error) => {
                console.log(error)
                this.uploading = false
            })
        },
    },
}
</script>
