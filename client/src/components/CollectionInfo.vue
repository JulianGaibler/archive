<template>
    <div class="itemRow itemRow-align-start">
        <div class="itemRow-grow infoBox">
            <div v-if="error" class="errorBox">{{ error }}</div>
            <template v-if="!editMode">
                <h2>{{node.title}}</h2>
                <div class="info">created by <UserLink :username="node.creator.username" :profilePicture="node.creator.profilePicture" /> <span class="spacerPipe">|</span> {{ $tc('items.item', node.posts.totalCount) }}</div>

                <div class="text">
                    <template v-if="node.description">
                        <h3>{{ $t('attributes.description') }}</h3>
                        <div class="preText indent">{{node.description}}</div>
                    </template>

                    <h3>{{ $t('attributes.keywords') }}</h3>
                    <div v-if="node.keywords.length > 0" class="keywords indent">
                        <div v-for="keyword in node.keywords" :key="keyword.id" class="chip chip-keyword">
                            <IconTag /><span>{{keyword.name}}</span>
                        </div>
                    </div>
                </div>
            </template>
            <template v-else>
                <InputField
                    class="titleInput"
                    :label="$t('attributes.title')"
                    :type="'text'"
                    v-model="payload.title" />

                <InputField
                    :label="$t('attributes.description')"
                    :type="'textarea'"
                    v-model="payload.description" />

                <InputKeywords
                    :label="$t('attributes.keywords')"
                    v-model="payload.keywords" />

                <div v-if="editMode" class="actionsRow">
                    <button @click="toggleEditMode(false)" class="button button-slim button-light">{{ $t('action.cancel') }}</button>
                    <button @click="editCollection" class="button button-slim button-primary">{{ $t('action.send') }}</button>
                </div>
            </template>
        </div>
        <div v-if="!editMode">
            <div class="hoverParent">
                <button @click="showOptions = true" class="button button-icon"><IconMore /></button>
                <div
                    class="hoverBox hoverBox-thin"
                    v-hoverFix
                    v-if="showOptions"
                    v-click-outside="() => { showOptions = false }">
                    <ul class="optionList">
                        <li class="option itemRow">
                            <button class="option-withIcon" @click="toggleEditMode(true)"><IconEdit /><span class="itemRow-grow">{{ $t('action.edit') }}</span></button>
                        </li>
                        <li class="option itemRow">
                            <button class="option-withIcon" @click="toggleDelete(true)"><IconTrash /><span class="itemRow-grow">{{ $t('action.delete') }}</span></button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import EventBus from '@/EventBus'
import { parseError } from '@/utils'
import { resetStore } from '@/vue-apollo'

import UserLink from '@/components/UserLink'
import InputField from '@/components/Input/InputField'
import InputKeywords from '@/components/Input/InputKeywords'

import IconTag from '@/assets/jw_icons/tag.svg?inline'
import IconMore from '@/assets/jw_icons/more.svg?inline'
import IconEdit from '@/assets/jw_icons/edit.svg?inline'
import IconTrash from '@/assets/jw_icons/trash.svg?inline'

import DELETE_COLLECTION from '@/graphql/deleteCollectionsMutation.gql'
import EDIT_COLLECTION from '@/graphql/editCollectionMutation.gql'

export default {
    name: 'CollectionInfo',
    components: {
        UserLink,
        InputField,
        InputKeywords,
        IconTag,
        IconMore,
        IconEdit,
        IconTrash,
    },
    data() {
        return {
            editMode: false,
            showOptions: false,
            working: false,
            error: null,
            payload: {
                title: '',
                keywords: [],
                description: '',
            },
        }
    },
    props: {
        node: {
            type: Object,
            required: true,
        },
    },
    methods: {
        toggleDelete(bool) {
            EventBus.$emit('pushPrompt', {
                important: true,
                messageAT: 'prompts.sure_delete_collection',
                messageBT: 'prompts.cannot_undo',
                actionAT: 'action.cancel',
                actionBT: 'action.delete',
                confirm: () => this.deleteCollection,
            })
            if (bool) this.showOptions = false
        },
        toggleEditMode(bool) {
            if (bool) {
                this.payload.title = this.node.title
                this.payload.description = this.node.description || ''
                this.payload.keywords = this.node.keywords.map(o => o.id)
            }
            this.error = null
            this.showOptions = false
            this.editMode = bool
        },
        deleteCollection() {
            this.$apollo.mutate({
                mutation: DELETE_COLLECTION,
                variables: {
                    ids: [this.node.id],
                },
            }).then(async () => {
                await resetStore()
                this.working = false
                this.$router.go(-1)
            }).catch((error) => {
                const parsedError = parseError(error)
                this.error = parsedError.message
                this.working = false
            })
        },
        editCollection() {
            this.working = true
            this.error = null
            this.$apollo.mutate({
                mutation: EDIT_COLLECTION,
                variables: {
                    id: this.node.id,
                    title: this.payload.title,
                    keywords: this.payload.keywords,
                    description: this.payload.description.length > 0 ? this.payload.description : null,
                },
            }).then((data) => {
                console.log(data)
                this.editMode = false
                this.working = false
            }).catch((error) => {
                const parsedError = parseError(error)
                this.error = parsedError.message
                this.working = false
            })
        },
    },
}
</script>
