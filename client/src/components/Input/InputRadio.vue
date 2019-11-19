<template>
    <div class="inputField light" :class="{error: errors}">
        <label v-if="label" class="visible">{{label}}</label>

        <div class="option" v-for="(option, i) in options" :key="option.value">
            <input
                :type="type || 'radio'"
                :id="rid+option.value"
                v-focus="autofocus && i === 0"
                :value="option.value"
                :checked="option.value === value"
                :disabled="disabled"
                @change="updateInput_">
            <label :for="rid+option.value">
                <div class="name">{{option.tName ? $t(option.tName) : option.name}}</div>
                <div v-if="option.tip" class="desc">{{option.tTip ? $t(option.tTip) : option.tip}}</div>
            </label>
        </div>

        <ul v-if="errors" class="error">
            <li v-for="error in errors" :key="error.message">{{error.messageT ? $t(error.messageT) : error.message}}</li>
        </ul>
    </div>
</template>

<script>

export default {
    name: 'InputRadio',
    props: {
        options: Array,
        type: String,
        value: [String, Array, Boolean],
        label: String,
        errors: Array,
        disabled: {
            type: Boolean,
            default: false,
        },
        autofocus: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            content: this.value,
            rid: this.randomId_(),
        }
    },
    methods: {
        updateInput_(event) {
            this.$emit('input', event.srcElement.value)
        },
        // We need this to have unique label IDs
        randomId_: function() {
            return btoa(Math.random()).slice(0,5)
        },
    },
    computed: {
        showLabel() {
            return this.content !== ''
        },
    },
}
</script>
