<template>
    <div class="inputField light">
        <input :placeholder="label" @input="handleInput" />
        <hr>
        <label :class="{ visible: showLabel }">{{label}}</label>
    </div>
</template>

<script>

export default {
    name: 'InputField',
    props: {
        value: Array,
        label: String,
    },
    data() {
        return {
            content: this.value
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
            return this.content && this.content.length > 0
        }
    },
}
</script>