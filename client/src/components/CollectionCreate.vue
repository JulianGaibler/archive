<template>
    <div>
        <div v-if="error" class="errorBox">{{ error }}</div>
        <InputField
            :label="$t('attributes.title')"
            :type="'text'"
            :errors="errors.title"
            :disabled="working"
            v-model="title" />
        <InputField
            :label="$t('attributes.description')"
            :type="'textarea'"
            :errors="errors.description"
            :disabled="working"
            v-model="description" />
        <InputKeywords
            :label="$t('attributes.keywords')"
            :errors="errors.keywords"
            :disabled="working"
            v-model="keywords" />
        <div class="actionsRow">
            <button @click="$emit('cancel')" class="button button-slim button-light" :disabled="working">{{ $t('action.cancel') }}</button>
            <button @click="create" class="button button-slim button-primary" :disabled="working">{{ $t('action.create') }}</button>
        </div>
    </div>
</template>

<script>
import { parseError } from '@/utils'
import { removeFromCache } from '@/vue-apollo'

import InputField from '@/components/Input/InputField.vue'
import InputKeywords from '@/components/Input/InputKeywords.vue'

import CREATE_COLLECTION from '@/graphql/createCollectionMutation.gql'
import COLLECTION_QUERY from '@/graphql/collectionsQuery.gql'

export default {
    name: 'CollectionCreate',
    components: {
        InputField,
        InputKeywords,
    },
    data() {
        return {
            title: '',
            description: '',
            keywords: [],
            working: false,
            error: null,
            errors: {
                title: [],
                description: [],
                keywords: [],
            },
        }
    },
    methods: {
        create() {
            this.working = true
            this.error = null
            this.$apollo.mutate({
                mutation: CREATE_COLLECTION,
                variables: {
                    title: this.title,
                    description: this.description.length > 0 ? this.description : null,
                    keywords: this.keywords.length > 0 ? this.keywords : null,
                },
                refetchQueries: [{ query: COLLECTION_QUERY }],
            }).then(({ data }) => {
                this.working = false
                removeFromCache('collections')
                this.$router.push({ name: 'Collection', params: { id: data.createCollection.id } })
            }).catch((error) => {
                const parsedError = parseError(error)
                if (parsedError.additionalInfo) {
                    Object.keys(parsedError.additionalInfo).forEach(key => {
                        this.errors[key] = parsedError.additionalInfo[key]
                    })
                } else {
                    this.error = parsedError.message
                }
                this.working = false
            })
        },
    },
}
</script>
