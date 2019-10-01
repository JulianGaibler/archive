<template>
    <div class="hoverBox" v-hoverFix>
        <div class="itemRow hoverBox-header">
            <h2 class="itemRow-grow">{{ $t('filters.users_filterBy') }}</h2>
            <button @click="$emit('clear')" class="button button-chip">{{ $t('action.delete') }}</button>
        </div>
        <p>{{ $t('filters.users_description') }}</p>
        <InputUsers
            :label="$t('filters.users')"
            :value="value"
            @input="v => $emit('input', v)" />
    </div>
</template>

<script>
import InputUsers from '../../components/Input/InputUsers.vue'

export default {
    name: 'FilterUsers',
    props: {
        value: Array,
    },
    components: { InputUsers },
    data() {
        return {

        }
    },
}
</script>
