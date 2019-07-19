import Vue from 'vue'
import { apolloClient } from '../../vue-apollo'

import UPLOAD_FILE from '../../graphql/UploadFile.gql'

let counter = 0

const state = {
	locked: false,
    working: false,
    current: 0,
    errors: [],
    items: []
}

const mutations = {
    addItem(state, file) {
        resetErrors(state)
        if (state.items.length >= 30) return
        const type = file.type.split('/')[0]
        if (type !== 'image' && type !== 'video') return
        state.items.push({
            id: ++counter,
            upload: {
                status: 0, // 0:queued - 1:uploading - 2:done - 3:failed
                progress_current: 0,
                progress_total: 1,
                abortCallback: undefined,
            },
            errors: [],
            payload: {
                file,
                keywords: [],
                title: '',
                caption: '',
                type: '',
                language: '',
            },
            processedPayload: null,
        })
    },
    updateItemProp(state, {index, prop, value}) {
        resetErrors(state)
        if (state.locked) return;
        Vue.set(state.items[index].payload, prop, value)
    },
    resetErrors(state) {
        resetErrors(state)
    },
    updateItemUpload(state, {index, prop, value}) {
        Vue.set(state.items[index].upload, prop, value)
    },
    increaseCurrent(state) {
        if (state.current+1 >= state.items.length)
            state.working = false
        else state.current++
    },
    processPayload(state) {
        state.items.forEach(item => {
            const payload = item.payload
            item.processedPayload = {
                file: payload.file,
                keywords: payload.keywords,
                title: payload.title,
                language: payload.language.toUpperCase(),
                type: payload.type.length > 0 ? payload.type.toUpperCase() : undefined,
                caption: payload.caption.length > 0 ? payload.caption : undefined,
            }
        })
    },
    deleteItem(state, index) {
        if (state.locked) return;
        state.items.splice(index, 1)
    },
    clearAllItems(state) {
        if (state.locked) return;
        state.items = []
    },
    lockUpload(state) {
        state.locked = true
        state.working = false
        state.current = 0
    },
    setWorking(state, bool) {
        state.working = bool
    },
    addErrors(state, {local, global, fromServer}) {
        if (fromServer) {
            Object.keys(fromServer.errors).forEach(key => {
                state.items[fromServer.index].errors[key] = fromServer.errors[key]
            })
        }
        if (local) {
            state.items[local.index].errors[local.prop] = local.errors
        }
        if (global) {
            state.errors.push(global)
        }
    },
    releaseUpload(state) {
        for (let i = state.items.length - 1; i >= 0; i--) {
            const upload = state.items[i].upload
            if (upload.status === 1) {
                if (upload.abortCallback)
                    upload.abortCallback()
                upload.status = 0
                upload.progress = 0
            }
            else if (upload.status === 2) state.items.splice(i, 1)
        }
        state.locked = false
        state.working = false
    }
}

const getters = {

}

const actions = {
    lockUpload(context) {
        if (checkForErrors(state, context.commit)) return false;
        context.commit('lockUpload')
        return true
    },
    async startUpload(context) {
        if (!context.state.locked) return false

        const index = context.state.current

        context.commit('setWorking', true)
        context.commit('updateItemUpload', { index, prop: 'status', value: 1 })
        await apolloClient.mutate({
            mutation: UPLOAD_FILE,
            variables: {
                posts: [ context.state.items[index].processedPayload ],
            },
            context: {
                fetchOptions: {
                    useUpload: true,
                    onProgress: (ev) => {
                        context.commit('updateItemUpload', { index, prop: 'progress_current', value: ev.loaded })
                        context.commit('updateItemUpload', { index, prop: 'progress_total', value: ev.total })
                    },
                    onAbortPossible: abort => {
                        context.commit('updateItemUpload', { index, prop: 'abortCallback', value: abort })
                    }
                },
            },
        }).then((a)=>{
            console.log('Upload Good: ', a)
            context.commit('updateItemUpload', { index, prop: 'status', value: 2 })
        }).catch((e) => {
            context.commit('updateItemUpload', { index, prop: 'status', value: 3 })
            if (!e.networkError.result.errors) return;
            for (let i = 0; i < e.networkError.result.errors.length; i++) {
                const err = e.networkError.result.errors[i]
                if (err.code === 'InputError') {
                    console.log(err.errors[0].error.data)
                    context.commit('addErrors', {fromServer: { index, errors: err.errors[0].error.data }})
                } else {
                    context.commit('addErrors', {global: {code: err.code, message: err.message}})
                }
            }
        })

        context.commit('increaseCurrent')

        if (index+1 >= context.state.items.length) {
            return
        }
        context.dispatch('startUpload')
    }
}

const _modules = {
	namespaced: true,
	state,
	mutations,
	getters,
	actions,
}

export { _modules }


function resetErrors(state) {
    state.errors = []
    state.items.forEach(item => {
        item.errors = []
    })
}

function checkForErrors(state, commit) {
    // 1. Reset all errors
    commit('resetErrors')

    // 2. Are there any files?
    if (state.items.length < 1) {
        commit('addErrors', {global: {code: 'NoItems', messageT: 'error.at_least_one_file'}})
        return true
    }

    // 3. Convert Input Data in sendable format
    commit('processPayload')

    // Check for basic mistakes
    let hasLocalErrors = false

    state.items.forEach((item, index) => {
        if (item.processedPayload.title.length < 1) {
            commit('addErrors', {local: {
                index,
                prop: 'title',
                errors: [{ messageT: 'error.required_field' }],
            }})


            hasLocalErrors = true
        }
        if (item.processedPayload.language === '') {
            commit('addErrors', {local: {
                index,
                prop: 'language',
                errors: [{ messageT: 'error.required_field' }],
            }})

            hasLocalErrors = true
        }
    })

    if (hasLocalErrors) return true
    return false
}
