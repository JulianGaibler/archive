<template>
    <div class="post-info itemRow itemRow-align-start">
        <div class="itemRow-grow infoBox">
            <div v-if="error" class="errorBox">
                {{ error }}
            </div>

            <template v-if="!editMode">
                <h2>{{post.title}}</h2>
                <div class="info">{{ $t('attributes.createdBy') }}
                    <UserLink :username="post.uploader.username" :profilePicture="post.uploader.profilePicture" />
                    <span class="spacerPipe">|</span>{{ $t('attributes.createdAt') }} {{ parseDate(post.createdAt) }}
                </div>

                <div class="text">
                    <h3>{{ $t('attributes.description') }}</h3>
                    <div v-if="post.description" class="indent markdown" v-html="compiledMarkdownDescription">{{post.description ? compiledMarkdownDescription : $t('state.none')}}</div>
                    <div v-else class="indent">{{$t('state.none')}}</div>

                    <h3>{{ $t('attributes.caption') }}</h3>
                    <div class="preText indent">{{post.caption ? post.caption : $t('state.none')}}</div>
                    <h3>{{ $t('attributes.keywords') }}</h3>
                    <div v-if="post.keywords.length > 0" class="chips indent">
                        <div v-for="keyword in post.keywords" :key="keyword.id" class="chip chip-keyword">
                            <IconTag/><span>{{keyword.name}}</span>
                        </div>
                    </div>
                    <div v-else class="indent">{{ $t('state.none') }}</div>
                    <h3>{{ $t('attributes.collections') }}</h3>
                    <div v-if="post.collections.length > 0" class="chips indent">
                        <div v-for="collection in post.collections" :key="collection.id" class="chip chip-collection">
                            <IconCollection/><span>{{collection.title}}</span>
                        </div>
                    </div>
                    <div v-else class="indent">{{ $t('state.none') }}</div>
                    <h3>{{ $t('attributes.language') }}</h3>
                    <div class="indent">{{ $t(`languages.${post.language.toLowerCase()}`) }}</div>
                </div>

            </template>

            <template v-else>
                <InputField
                    class="titleInput"
                    :label="$t('attributes.title')"
                    :type="'text'"
                    v-model="payload.title" />

                <InputField
                    class="captionInput"
                    :label="$t('attributes.description')"
                    :type="'textarea'"
                    v-model="payload.description" />

                <InputField
                    class="captionInput"
                    :label="$t('attributes.caption')"
                    :type="'textarea'"
                    v-model="payload.caption" />

                <InputKeywords
                    :label="$t('attributes.keywords')"
                    v-model="payload.keywords" />

                <InputSelect
                    :label="$t('attributes.language')"
                    :options="[
                        { value:'ENGLISH',name:'English' },
                        { value:'GERMAN',name:'German' },
                        { value:'FRENCH',name:'French' },
                        { value:'ITALIAN',name:'Italian' },
                        { value:'NORWEGIAN',name:'Norwegian' },
                        { value:'RUSSIAN',name:'Russian' },
                        { value:'SPANISH',name:'Spanish' },
                        { value:'TURKISH',name:'Turkish' },
                    ]"
                    v-model="payload.language" />


                <div v-if="editMode" class="actionsRow">
                    <button @click="toggleEditMode(false)" class="button button-slim button-light">{{ $t('action.cancel') }}</button>
                    <button @click="editPost" class="button button-slim button-primary">{{ $t('action.send') }}</button>
                </div>
            </template>
        </div>
        <div v-if="!editMode">
            <div class="hoverParent">
                <button @click="toggleOptions(true)" class="button button-icon"><IconMore /></button>
                <div
                    class="hoverBox hoverBox-thin"
                    v-hoverFix
                    v-if="showOptions"
                    v-click-outside="() => toggleOptions(false)">
                    <ul class="optionList">
                        <li class="option itemRow">
                            <button class="option-withIcon" @click="toggleEditMode(true)"><IconEdit /><span class="itemRow-grow">{{ $t('action.edit') }}</span></button>
                        </li>
                        <li class="option itemRow">
                            <button class="option-withIcon" @click="toggleDelete(true)"><IconTrash /><span class="itemRow-grow">{{ $t('action.delete') }}</span></button>
                        </li>
                    </ul>
                </div>

                <Modal
                    v-if="showDelete"
                    @cancel="toggleDelete(false)"
                    @confirm="deletePost"
                    :important="true"
                    :messageA="$t('prompts.sure_delete_post')"
                    :messageB="$t('prompts.cannot_undo')"
                    :optionA="$t('action.cancel')"
                    :optionB="$t('action.delete')"
                />
            </div>
        </div>
    </div>
</template>

<script>
import marked from 'marked'
import { parseDate, parseError } from '@/utils'

import Modal from '@/components/Modal'
import UserLink from '@/components/UserLink'
import { resetStore } from '@/vue-apollo'
import InputField from '@/components/Input/InputField.vue'
import InputKeywords from '@/components/Input/InputKeywords.vue'
import InputSelect from '@/components/Input/InputSelect.vue'

import IconMore from '@/assets/jw_icons/more.svg?inline'
import IconTrash from '@/assets/jw_icons/trash.svg?inline'
import IconEdit from '@/assets/jw_icons/edit.svg?inline'
import IconTag from '@/assets/jw_icons/tag.svg?inline'
import IconCollection from '@/assets/jw_icons/collection.svg?inline'

import EDIT_POST from '@/graphql/editPostMutation.gql'
import DELETE_POST from '@/graphql/deletePostsMutation.gql'

export default {
    name: 'PostInfo',
    props: {
        post: Object,
    },
    data() {
        return {
            editMode: false,
            showOptions: false,
            showDelete: false,
            working: false,
            error: null,
            payload: {
                title: '',
                keywords: [],
                description: '',
                caption: '',
                language: '',
            },
        }
    },
    components: {
        Modal,
        UserLink,
        IconMore,
        IconTrash,
        IconEdit,
        IconCollection,
        IconTag,
        InputField,
        InputKeywords,
        InputSelect,
    },
    methods: {
        parseDate,
        toggleOptions(bool) {
            this.showOptions = bool
        },
        toggleDelete(bool) {
            this.showDelete = bool
            if (bool) this.showOptions = false
        },
        toggleEditMode(bool) {
            if (bool) {
                this.payload.title = this.post.title
                this.payload.keywords = this.post.keywords.map(o => o.id)
                this.payload.description = this.post.description || ''
                this.payload.caption = this.post.caption || ''
                this.payload.language = this.post.language || ''
            }
            this.error = null
            this.showOptions = false
            this.editMode = bool
        },
        deletePost() {
            this.$apollo.mutate({
                mutation: DELETE_POST,
                variables: {
                    ids: [this.post.id],
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
        editPost() {
            this.working = true
            this.error = null
            this.$apollo.mutate({
                mutation: EDIT_POST,
                variables: {
                    id: this.post.id,
                    title: this.payload.title,
                    keywords: this.payload.keywords,
                    language: this.payload.language,
                    description: this.payload.description.length > 0 ? this.payload.description : null,
                    caption: this.payload.caption.length > 0 ? this.payload.caption : null,
                },
            }).then(() => {
                this.editMode = false
                this.working = false
            }).catch((error) => {
                const parsedError = parseError(error)
                this.error = parsedError.message
                this.working = false
            })
        },
    },
    computed: {
        compiledMarkdownDescription() {
            if (!(this.post && this.post.description)) { return '' }
            return marked(this.post.description, { sanitize: true })
        },
    },
}
</script>

<style scoped lang="stylus">
@import "~@/assets/styles/palette.styl"

.post-info
    margin-top 2rem
    .chips > :not(:last-child)
        margin-right .5rem
        margin-bottom .5rem
    .titleInput >>> input
        font-size 1.6rem
    .captionInput >>> textarea
        font-size 1rem
        font-weight 400
        line-height 1.4

</style>
