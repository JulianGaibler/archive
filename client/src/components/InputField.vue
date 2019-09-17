<template>
    <div class="inputField light" :class="{error: errors && errors.length > 0, disabled}">
        <label :class="{ visible: showLabel }">{{label}}</label>
        <textarea
            v-if="type==='textarea'"
            ref="textarea"
            class="dynamicInput"
            rows="1"
            :value="value"
            :placeholder="label"
            :disabled="disabled"
            @input="updateInputArea"
        />
        <input
            v-else
            :value="value"
            :autocomplete="autocomplete"
            :type="type"
            :disabled="disabled"
            :placeholder="label"
            @input="handleInput" />

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
        autocomplete: String,
        disabled: {
            type: Boolean,
            default: false,
        },
        errors: Array,
    },
    mounted() {
        this.updateInputArea({ target: { value: this.value } })
    },
    methods: {
        handleInput(e) {
            this.$emit('input', e.target.value)
        },
        updateInputArea: function(e) {
            this.$emit('input', e.target.value)
            if (!this.$refs.textarea) return
            this.$refs.textarea.style.height = ''
            this.$refs.textarea.style.height = this.$refs.textarea.scrollHeight+'px'
        },
    },
    computed: {
        showLabel() {
            return this.value && this.value.trim().length > 0
        },
    },
}
</script>
