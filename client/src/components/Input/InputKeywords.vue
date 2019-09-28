<template>
    <div class="inputField light" :class="{ focused, disabled }">
        <label :class="{ visible: showLabel }">{{label}}</label>
        <div class="autocomplete hoverParent">
            <div v-for="id in value" :key="id" class="tag">
                <ApolloQuery
                    :query="gql => gql`
                      query getKeywordName($id: ID!) {
                        node (id: $id) {
                          ... on Keyword {
                            name
                          }
                        }
                      }
                    `"
                    :variables="{ id }" >
                    <template slot-scope="{ result: { data } }">
                        <span v-if="data">{{data.node.name}}</span>
                    </template>
                </ApolloQuery>

                <button class="icon" @click="removeItem(id)"><IconClose /></button>
            </div>
            <input
                :placeholder="label"
                :disabled="disabled"
                ref="tagInput"
                @input="handleInput"
                @focus="focused = true"
                @blur="handleBlur"
                @keydown.down="onArrowDown"
                @keydown.up="onArrowUp"
                @keydown.enter="onEnter"
                v-focus="autofocus"
                v-model="searchWord" />
            <div v-if="showResults" class="hoverBox hoverBox-thin">
                <ul class="optionList">
                    <li
                        v-for="(edge, idx) in keywords.edges"
                        :key="edge.node.id"
                        :class="{ selected: idx===currentSelect }"
                        class="option"
                    ><button @click="addItem(edge.node)">{{edge.node.name}}</button></li>
                    <li
                        v-if="showResults"
                        :class="{ selected: keywords.edges.length===currentSelect }"
                        class="option active"
                    ><button @click="createItem()">Create Keyword "{{searchWord}}"</button></li>

                    <div v-if="createStatus.loading" class="info">Creating...</div>
                    <div v-if="createStatus.error" class="info error">{{createStatus.error}}</div>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
import debounce from 'debounce'

import IconClose from '@/assets/jw_icons/close.svg?inline'

import KEYWORD_SEARCH from '@/graphql/keywordSearchQuery.gql'
import KEYWORD_CREATE from '@/graphql/createKeywordMutation.gql'

export default {
    name: 'InputKeywords',
    props: {
        value: Array,
        label: String,
        disabled: {
            type: Boolean,
            default: false,
        },
        autofocus: {
            type: Boolean,
            default: false,
        },
    },
    components: {
        IconClose,
    },
    data() {
        return {
            searchWord: '',
            focused: false,

            showResults: false,
            currentSelect: -1,
            keywords: [],

            createStatus: {
                loading: false,
                error: null,
            },
        }
    },
    methods: {
        handleSearch: debounce(function() {
            this.$apollo.query({
                query: KEYWORD_SEARCH,
                variables: {
                    input: this.searchWord,
                },
                fetchPolicy: 'network-only',
                error(e) {
                    console.log('errors', e.message)
                },
            }).then(result => {
                this.keywords = result.data.keywords
                this.showResults = true
            }).catch(() => {
                //TODO
            })
        }, 200),
        handleBlur: debounce(function() {
            this.focused = false
            this.showResults = false
        }),
        addItem(item) {
            this.showResults = false
            this.value.push(item.id)
            this.$emit('input', [...this.value])
            this.$refs.tagInput.focus()
            this.searchWord = ''
        },
        removeItem(id) {
            const index = this.value.indexOf(id)
            if (index !== -1) {
                this.value.splice(index, 1)
                this.$emit('input', [...this.value])
            }
        },
        createItem() {
            if (this.createStatus.loading) return
            this.createStatus.loading = true
            this.$apollo.mutate({
                mutation: KEYWORD_CREATE,
                variables: {
                    input: this.searchWord,
                },
            }).then(({ data }) => {
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
            if (!this.showResults) return
            e.preventDefault()
            if (this.currentSelect < this.keywords.edges.length) this.currentSelect++
        },
        onArrowUp(e) {
            if (!this.showResults) return
            e.preventDefault()
            if (this.currentSelect > 0) this.currentSelect--
        },
        onEnter() {
            if (!this.showResults) return
            if (this.currentSelect < this.keywords.edges.length && this.currentSelect >= 0)
                this.addItem(this.keywords.edges[this.currentSelect].node)
            else if (this.currentSelect === this.keywords.edges.length)
                this.createItem()
        },
    },
    computed: {
        showLabel() {
            return (this.value && this.value.length) > 0 || (this.searchWord && this.searchWord.length > 0)
        },
    },
}
</script>
