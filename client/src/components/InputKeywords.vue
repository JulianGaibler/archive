<template>
    <div class="inputField light">
        <div class="autocomplete">
            <div v-for="item in content" :key="item" class="tag"><span>{{valueStore[item]}}</span>X</div>
            <input :placeholder="label" v-model="searchWord" @input="handleInput" />


            <ul class="results">
                <li v-for="keyword in keywords" :key="keyword.id" @click="addItem(keyword)" class="result">{{keyword.name}}</li>
            </ul>
        </div>
        <hr>
        <label :class="{ visible: showLabel }">{{label}}</label>
    </div>
</template>

<script>
import keywordSearch from '../graphql/keywordSearch.gql'

export default {
    name: 'InputKeywords',
    props: {
        value: Array,
        label: String,
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
        handleInput() {
            this.$emit('input', this.content)
        },
        updateInput_: function() {
            this.$emit('input', this.content)
            this.$refs.textarea.style.height = ''
            this.$refs.textarea.style.height = this.$refs.textarea.scrollHeight+'px'
        },
        addItem(item) {
            if (!!this.valueStore[item.id]) return;
            this.valueStore[item.id] = item.name
            this.content.push(item.id)
            this.$emit('input', this.content)
        },
    },
    computed: {
        showLabel() {
            return (this.content && this.content.length) > 0 || (this.searchWord && this.searchWord.length > 0)
        }
    },
}
</script>