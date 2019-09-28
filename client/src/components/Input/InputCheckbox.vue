<template>
    <div class="inputField light" :class="{error: errors}">
        <label class="visible">{{label}}</label>

        <div class="option" v-for="(option, i) in options" :key="option.value">
            <input
                type="checkbox"
                :id="rid+option.value"
                :value="option.value"
                v-focus="autofocus && i === 0"
                v-model="content"
                @input="updateInput_">
            <label :for="rid+option.value">
                <div class="name">{{option.name}}</div>
                <div v-if="option.tip" class="desc">{{option.tip}}</div>
            </label>
        </div>

        <ul v-if="errors" class="error">
            <li v-for="error in errors" :key="error.message">{{error.messageT ? $t(error.messageT) : error.message}}</li>
        </ul>
    </div>
</template>

<script>

export default {
    name: 'InputCheckbox',
    props: {
        options: Array,
        value: Array,
        label: String,
        errors: Array,
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
