<template>
    <div class="hoverBox" v-hoverFix>
        <div class="itemRow hoverBox-header">
            <h2 class="itemRow-grow">{{ $t('filters.type_filterBy') }}</h2>
            <button @click="$emit('clear')" class="button button-chip">{{ $t('action.delete') }}</button>
        </div>
        <p>{{ $t('filters.type_description') }}</p>
        <InputRadio
            :label="$t('input.upload.treatas')"
            :type="'checkbox'"
            :options="[
                { value:'QUEUED', name:$t('state.queued') },
                { value:'PROCESSING', name:$t('state.processing') },
                { value:'DONE', name:$t('state.done') },
                { value:'FAILED', name:$t('state.failed') },
            ]"
            :value="value"
            @input="v => $emit('input', v)" />
    </div>
</template>

<script>
import InputRadio from '../../components/Input/InputRadio'

export default {
    name: 'FilterTaskType',
    props: {
        value: Array,
    },
    components: { InputRadio },
    data() {
        return {

        }
    },
}
</script>
