<template>
    <div class="inputField light" :class="{error: errors}">
        <label :class="{ visible: showLabel }">{{label}}</label>
        <div class="selectFlex" :class="{ noItemSelected: !showLabel }">
            <select @input="updateInput_">
                <option value="" v-if="!showLabel" selected>{{label}}</option>
                <option v-for="option in options" :key="option.value" :value="option.value">{{option.name}}</option>
            </select>
            <IconDropdown />
        </div>

        <ul v-if="errors" class="error">
            <li v-for="error in errors" :key="error.message">{{error.message}}</li>
        </ul>
    </div>
</template>

<script>
import IconDropdown from "@/assets/jw_icons/dropdown.svg?inline";

export default {
    name: 'InputSelect',
    components: { IconDropdown },
    props: {
        options: Array,
        value: String,
        label: String,
        errors: Array,
    },
    data() {
        return {
            showLabel: false
        }
    },
    methods: {
        updateInput_: function(event) {
            const value = event.srcElement.value
            this.$emit('input', value)
            this.showLabel = value !== ''
        },
    },
}
</script>
