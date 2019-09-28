<template>
    <div class="hoverBox">
        <div class="itemRow hoverBox-header">
            <h2 class="itemRow-grow">{{ $t('filters.language_filterBy') }}</h2>
            <button @click="$emit('clear')" class="button button-chip">{{ $t('action.delete') }}</button>
        </div>
        <p>{{ $t('filters.language_description') }}</p>
        <InputSelect
            :label="$t('filters.language')"
            :options="[
                { value:'ENGLISH', tName:'languages.english' },
                { value:'GERMAN', tName:'languages.german' },
                { value:'FRENCH', tName:'languages.french' },
                { value:'ITALIAN', tName:'languages.italian' },
                { value:'NORWEGIAN', tName:'languages.norwegian' },
                { value:'RUSSIAN', tName:'languages.russian' },
                { value:'SPANISH', tName:'languages.spanish' },
                { value:'TURKISH', tName:'languages.turkish' },
            ]"
            :value="value"
            @input="v => $emit('input', v)" />
    </div>
</template>

<script>
import InputSelect from '../../components/Input/InputSelect.vue'

export default {
    name: 'FilterLanguage',
    props: {
        value: String,
    },
    components: { InputSelect },
    data() {
        return {

        }
    },
}
</script>
