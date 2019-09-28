<template>
    <div class="hoverBox">
        <div class="itemRow hoverBox-header">
            <h2 class="itemRow-grow">{{ $t('filters.keywords_filterBy') }}</h2>
            <button @click="$emit('clear')" class="button button-chip">{{ $t('action.delete') }}</button>
        </div>
        <p>{{ $t('filters.keywords_description') }}</p>
        <InputKeywords
            :label="$t('filters.keywords')"
            :value="value"
            @input="v => $emit('input', v)" />
    </div>
</template>

<script>
import InputKeywords from '../../components/Input/InputKeywords.vue'

export default {
    name: 'FilterKeywords',
    props: {
        value: Array,
    },
    components: { InputKeywords },
    data() {
        return {

        }
    },
}
</script>
