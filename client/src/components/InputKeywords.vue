<template>
    <div class="inputField light">
        <div class="autocomplete">
            <div v-for="id in content" :key="id" class="tag">
                <span>{{valueStore[id]}}</span>
                <div class="icon" @click="removeItem(id)"><IconClose /></div>
            </div>
            <input :placeholder="label" ref="tagInput" v-model="searchWord" />
            <ul v-if="resultsBox.showBox" class="results">
                <li v-for="keyword in keywords" :key="keyword.id" @click="addItem(keyword)" class="result">{{keyword.name}}</li>
                <hr v-if="resultsBox.showLower && resultsBox.showUpper">
                <li v-if="resultsBox.showLower" @click="createItem()" class="result">Create Keyword "{{searchWord}}"</li>
            </ul>
        </div>
        <hr>
        <label :class="{ visible: showLabel }">{{label}}</label>
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
            this.$apollo.mutate({
                mutation: createKeyword,
                variables: {
                    input: this.searchWord
                },
            }).then(result => {
                console.log(result)
            }).catch(error => {
                console.log(error, error.message)
            })
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
                showBox: keywordsLength > 0 || searchWordLength > 0,
                showUpper: keywordsLength > 0,
                showLower: searchWordLength > 1,
            }
        },
    },
}
</script>