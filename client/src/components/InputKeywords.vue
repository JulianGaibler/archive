<template>
    <div class="inputField light">
        <label :class="{ visible: showLabel }">{{label}}</label>
        <div class="autocomplete">
            <div v-for="id in content" :key="id" class="tag">
                <span>{{valueStore[id]}}</span>
                <div class="icon" @click="removeItem(id)"><IconClose /></div>
            </div>
            <input
                :placeholder="label"
                ref="tagInput"
                @input="handleInput"
                @blur="handleBlur"
                @keydown.down="onArrowDown"
                @keydown.up="onArrowUp"
                @keydown.enter="onEnter"
                v-model="searchWord" />
            <ul v-if="showResults" class="results">
                <li
                    v-for="(keyword, idx) in keywords"
                    :key="keyword.id" @click="addItem(keyword)"
                    :class="{ selected: idx===currentSelect }"
                    class="result"
                >{{keyword.name}}</li>
                <li
                    v-if="showResults"
                    @click="createItem()"
                    :class="{ selected: keywords.length===currentSelect }"
                    class="result create"
                >Create Keyword "{{searchWord}}"</li>

                <div v-if="createStatus.loading" class="info">Creating...</div>
                <div v-if="createStatus.error" class="info error">{{createStatus.error}}</div>
            </ul>
        </div>
    </div>
</template>

<script>
import debounce from 'debounce'
import keywordSearch from '../graphql/keywordSearch.gql'
import createKeyword from '../graphql/mutation/createKeyword.gql'

import IconClose from "@/assets/icon_close.svg?inline"

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
            content: [...this.value],
            valueStore: {},
            searchWord: '',

            showResults: false,
            currentSelect: -1,
            keywords: [],

            createStatus: {
                loading: false,
                error: null,
            }
        }
    },
    methods: {
        handleSearch: debounce(function() {
            this.$apollo.query({
                query: keywordSearch,
                variables () {
                    return {
                        input: this.searchWord
                    }
                },
                fetchPolicy: 'network-only',
                error(e) {
                    console.log('errors', e.message)
                }
            }).then(result => {
                this.keywords = result.data.keywords
                this.showResults = true
            }).catch(() => {
                //TODO
            })
        }, 200),
        handleBlur: debounce(function() {
            this.showResults = false
        }),
        addItem(item) {
            if (this.valueStore[item.id]) return;
            this.showResults = false
            this.valueStore[item.id] = item.name
            this.content.push(item.id)
            this.$emit('input', [...this.content])
            this.$refs.tagInput.focus()
            this.searchWord = ''
        },
        removeItem(id) {
            const index = this.content.indexOf(id);
            if (index !== -1) {
                this.content.splice(index, 1)
                delete this.valueStore[id]
                this.$emit('input', [...this.content])
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
            this.showResults = false
            this.createStatus.error = null
            this.currentSelect = -1
            this.handleSearch()
        },
        onArrowDown(e) {
            if (!this.showResults) return;
            e.preventDefault()
            if (this.currentSelect < this.keywords.length) this.currentSelect++
        },
        onArrowUp(e) {
            if (!this.showResults) return;
            e.preventDefault()
            if (this.currentSelect > 0) this.currentSelect--
        },
        onEnter() {
            if (!this.showResults) return;
            if (this.currentSelect < this.keywords.length && this.currentSelect >= 0)
                this.addItem(this.keywords[this.currentSelect])
            else if (this.currentSelect === this.keywords.length)
                this.createItem()
        },
    },
    computed: {
        showLabel() {
            return (this.content && this.content.length) > 0 || (this.searchWord && this.searchWord.length > 0)
        },
    },
}
</script>
