import gql from 'graphql-tag'
import { apolloClient } from '../vue-apollo'

const UPLOAD_FILE = gql`
    mutation uploadPosts($posts: [NewPost!]!) {
        uploadPosts(items: $posts) {
            title
            uploader {
                username
            }
            status
        }
    }
`

class UploadManager {

    constructor() {
        this.locked = false
        this.working = false
        this.current = 0
        this.counter = 0
        this.errors = []
        this.items = []
    }

    updateItemUpload(index, prop, value) {
        // Vue.set(this.items[index].upload, prop, value)

        this.items[index].upload[prop] = value
    }

    addErrors({ local, global, fromServer }) {
        if (fromServer) {
            Object.keys(fromServer.errors).forEach(key => {
                this.items[fromServer.index].errors[key] = fromServer.errors[key]
            })
        }
        if (local) {
            this.items[local.index].errors[local.prop] = local.errors
        }
        if (global) {
            this.errors.push(global)
        }
    }

    stopUpload() {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const upload = this.items[i].upload
            if (upload.status === 1) {
                if (upload.abortCallback) {
                    upload.abortCallback()
                }
                upload.status = 0
                upload.progress = 0
            }
            else if (upload.status === 2) this.items.splice(i, 1)
        }
        this.locked = false
        this.working = false
    }

    deleteItem(id) {
        if (this.locked) return
        for (let i = this.items.length - 1; i >= 0; i--) {
            if (this.items[i].id === id) {
                this.items.splice(i, 1)
                return
            }
        }
    }

    addItem(file) {
        if (this.locked) return
        this.resetErrors()
        if (this.items.length >= 30) return
        const type = file.type.split('/')[0]
        if (type !== 'image' && type !== 'video') return
        this.items.push({
            id: ++this.counter,
            errors: [],
            upload: {},
            payload: {
                file,
                keywords: [],
                title: '',
                caption: '',
                type: '',
                language: '',
            },
        })
    }
    clearAllItems() {
        if (this.locked) return
        this.items = []
    }

    resetErrors() {
        this.errors = []
        this.items.forEach(item => {
            item.errors = []
        })
    }

    startUpload() {
        // 1. Reset all errors
        this.resetErrors()
        // 2. Are there any files?
        if (this.items.length < 1) {
            this.addErrors({ global: { code: 'NoItems', messageT: 'error.at_least_one_file' } })
            return
        }
        // 3. Transform Payload into sendable format
        let processedPayload = this.items.map(item => {
            const payload = item.payload
            return {
                file: payload.file,
                keywords: payload.keywords,
                title: payload.title,
                language: payload.language.toUpperCase(),
                type: payload.type.length > 0 ? payload.type.toUpperCase() : undefined,
                caption: payload.caption.length > 0 ? payload.caption : undefined,
            }
        })
        // 4. Check for basic mistakes
        let hasLocalErrors = false
        processedPayload.forEach((item, index) => {
            if (item.title.length < 1) {
                this.addErrors({ local: {
                    index,
                    prop: 'title',
                    errors: [{ messageT: 'error.required_field' }],
                } })
                hasLocalErrors = true
            }
            if (item.language === '') {
                this.addErrors({ local: {
                    index,
                    prop: 'language',
                    errors: [{ messageT: 'error.required_field' }],
                } })
                hasLocalErrors = true
            }
        })
        if (hasLocalErrors) return

        // 2. Check if there is already locked data
        if (this.locked) return
        // 3.1 Reset all values
        this.locked = true
        this.working = true
        this.current = 0
        this.errors = []
        this.items.forEach(item => {
            item.upload = {
                ...item.upload,
                status: 0, // 0:queued - 1:uploading - 2:done - 3:failed
                progress_current: 0,
                progress_total: 1,
                abortCallback: null,
            }
        })

        ;(async () => {

            while ( this.current < this.items.length && this.working ) {
                const index = this.current

                let actualUpload = processedPayload[index]
                delete actualUpload.__typename

                this.updateItemUpload(index, 'status', 1)

                await apolloClient.mutate({
                    mutation: UPLOAD_FILE,
                    variables: {
                        posts: [ actualUpload ],
                    },
                    context: {
                        fetchOptions: {
                            useUpload: true,
                            onProgress: (ev) => {
                                this.updateItemUpload(index, 'progress_current', ev.loaded)
                                this.updateItemUpload(index, 'progress_total', ev.total)
                            },
                            onAbortPossible: abort => {
                                this.updateItemUpload(index, 'abortCallback', abort)
                            },
                        },
                    },
                }).then((a) => {
                    console.log('Upload Good: ', a)
                    this.updateItemUpload(index, 'status', 2)
                }).catch((e) => {
                    this.updateItemUpload(index, 'status', 3)
                    if (!e.networkError.result.errors) return
                    for (let i = 0; i < e.networkError.result.errors.length; i++) {
                        const err = e.networkError.result.errors[i]
                        if (err.code === 'InputError') {
                            this.addErrors({ fromServer: { index, errors: err.errors[0].error.data } })
                        } else {
                            this.addErrors({ global: { code: err.code, message: err.message } })
                        }
                    }
                })
                this.current++
            }
            this.working = false
        })()
    }
}

export default new UploadManager()
