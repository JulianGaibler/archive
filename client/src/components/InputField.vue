<template>
    <div class="inputField light" :class="{error: errors}">
        <label :class="{ visible: showLabel }">{{label}}</label>
        <textarea
            v-if="type==='textarea'"
            ref="textarea"
            class="dynamicInput"
            rows="1"
            value="content"
            :placeholder="label"
            @input="updateInput_()"
        />
        <input v-else v-model="content" :type="type" :placeholder="label" @input="handleInput" />

        <ul v-if="errors" class="error">
            <li v-for="error in errors" :key="error.message">{{error.messageT ? $t(error.messageT) : error.message}}</li>
        </ul>
    </div>
</template>

<script>

export default {
    name: 'InputField',
    props: {
        value: String,
        label: String,
        type: String,
        errors: Array,
    },
    data() {
        return {
            content: this.value,
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
    },
    computed: {
        showLabel() {
            return this.content && this.content.trim().length > 0
        },
    },
}
</script>
