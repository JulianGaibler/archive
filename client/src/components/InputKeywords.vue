<template>
    <div class="inputField light">
        <label :class="{ visible: showLabel }">{{label}}</label>
        <div class="autocomplete">
            <div v-for="id in content" :key="id" class="tag">
                <span>{{valueStore[id]}}</span>
                <div class="icon" @click="removeItem(id)"><IconClose /></div>
            </div>
            <input :placeholder="label" ref="tagInput" @input="handleInput" v-model="searchWord" />
            <ul v-if="resultsBox.showBox" class="results">
                <li v-for="keyword in keywords" :key="keyword.id" @click="addItem(keyword)" class="result">{{keyword.name}}</li>
                <li v-if="resultsBox.showLower" @click="createItem()" class="result create">Create Keyword "{{searchWord}}"</li>
                <div v-if="createStatus.loading" class="info">Creating...</div>
                <div v-if="createStatus.error" class="info error">{{createStatus.error}}</div>
            </ul>
        </div>
    </div>
</template>

<script>
import keywordSearch from '../graphql/keywordSearch.gql'
import createKeyword from '../graphql/mutation/createKeyword.gql'

import IconClose from "@/assets/icon_close.svg?inline";

export default {
    name: 'InputKeywords',
    props: {
        value: Array,
        label: String,
    },
    components: {
        IconClose
    },
    data() {
        return {
            content: this.value,
            valueStore: {},
            searchWord: '',

            createStatus: {
                loading: false,
                error: null,
            }
        }
    },
    apollo: {
        keywords: {
            query: keywordSearch,
            variables () {
                return {
                    input: this.searchWord
                }
            },
            debounce: 500,
            fetchPolicy: 'network-only',
            error(e) {
                console.log('errors', e.message)
            }
        }
    },
    methods: {
        addItem(item) {
            if (this.valueStore[item.id]) return;
            this.valueStore[item.id] = item.name
            this.content.push(item.id)
            this.$emit('input', this.content)
            this.$refs.tagInput.focus()
            this.searchWord = ''
        },
        removeItem(id) {
            const index = this.content.indexOf(id);
            if (index !== -1) {
                this.content.splice(index, 1)
                delete this.valueStore[id]
                this.$emit('input', this.content)
            }
        },
        createItem() {
            if (this.createStatus.loading) return
            this.createStatus.loading = true
            this.$apollo.mutate({
                mutation: createKeyword,
                variables: {
                    input: this.searchWord
                },
            }).then(({data}) => {
                this.addItem(data.createKeyword)
                this.createStatus.loading = false
                this.createStatus.error = null
            }).catch(error => {
                this.createStatus.loading = false
                this.createStatus.error = error
            })
        },
        handleInput() {
            this.createStatus.error = null
        },
    },
    computed: {
        showLabel() {
            return (this.content && this.content.length) > 0 || (this.searchWord && this.searchWord.length > 0)
        },
        resultsBox() {
            let keywordsLength = this.keywords ? this.keywords.length : 0
            let searchWordLength = this.searchWord.length
            return {
                showBox: searchWordLength > 0 || searchWordLength > 1,
                showUpper: keywordsLength > 0,
                showLower: searchWordLength > 1,
            }
        },
    },
}
</script>
