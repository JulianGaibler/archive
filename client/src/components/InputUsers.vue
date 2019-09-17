<template>
    <div class="inputField light">
        <label :class="{ visible: showLabel }">{{label}}</label>
        <div class="autocomplete">
            <div v-for="id in value" :key="id" class="tag">
                <ApolloQuery
                    :query="gql => gql`
                      query getUsername($id: ID!) {
                        node (id: $id) {
                          ... on User {
                            username
                          }
                        }
                      }
                    `"
                    :variables="{ id }" >
                    <template slot-scope="{ result: { data } }">
                        <span v-if="data">{{data.node.username}}</span>
                    </template>
                </ApolloQuery>

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
                    v-for="(edge, idx) in users.edges"
                    :key="edge.node.id"
                    @click="addItem(edge.node)"
                    :class="{ selected: idx===currentSelect }"
                    class="result"
                >{{edge.node.username}}</li>
            </ul>
        </div>
    </div>
</template>

<script>
import debounce from 'debounce'
import gql from 'graphql-tag'

import IconClose from '@/assets/jw_icons/close.svg?inline'

const USER_SEARCH = gql`query userSearch($input: String) {
  users(byUsername: $input) {
    edges {
      node {
        id
        username
      }
    }
  }
}`

export default {
    name: 'InputUsers',
    props: {
        value: Array,
        label: String,
    },
    components: {
        IconClose,
    },
    data() {
        return {
            searchWord: '',

            showResults: false,
            currentSelect: -1,
            users: [],
        }
    },
    methods: {
        handleSearch: debounce(function() {
            this.$apollo.query({
                query: USER_SEARCH,
                variables: {
                    input: this.searchWord,
                },
                fetchPolicy: 'network-only',
                error(e) {
                    console.log('errors', e.message)
                },
            }).then(result => {
                this.users = result.data.users
                this.showResults = true
            }).catch(() => {
                //TODO
            })
        }, 200),
        handleBlur: debounce(function() {
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
        handleInput() {
            this.showResults = false
            this.currentSelect = -1
            this.handleSearch()
        },
        onArrowDown(e) {
            if (!this.showResults) return
            e.preventDefault()
            if (this.currentSelect < this.users.edges.length) this.currentSelect++
        },
        onArrowUp(e) {
            if (!this.showResults) return
            e.preventDefault()
            if (this.currentSelect > 0) this.currentSelect--
        },
        onEnter() {
            if (!this.showResults) return
            if (this.currentSelect < this.users.edges.length && this.currentSelect >= 0)
                this.addItem(this.users.edges[this.currentSelect].node)
            else if (this.currentSelect === this.users.edges.length)
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
