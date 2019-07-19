<template>
    <div class="data">
        <div v-if="items[uploadIndex].errors.general" class="errorBox">{{items[uploadIndex].errors.general}}</div>
        <div class="inputs">
            <InputField
                :label="$t('input.upload.title')"
                :type="'text'"
                :errors="items[uploadIndex].errors.title"

                :value="items[uploadIndex].payload.title"
                @input="updateItemProp({ index: uploadIndex, prop: 'title', value: $event })"

                 />
            <InputField
                :label="$t('input.upload.caption')"
                :type="'textarea'"
                :errors="items[uploadIndex].errors.caption"
                :value="items[uploadIndex].payload.caption"
                @input="updateItemProp({ index: uploadIndex, prop: 'caption', value: $event })" />
            <InputSelect
                :label="$t('input.upload.language')"
                :options="[
                    { value:'english',name:'English' },
                    { value:'german',name:'German' },
                    { value:'french',name:'French' },
                    { value:'italian',name:'Italian' },
                    { value:'norwegian',name:'Norwegian' },
                    { value:'russian',name:'Russian' },
                    { value:'spanish',name:'Spanish' },
                    { value:'turkish',name:'Turkish' },
                ]"
                :errors="items[uploadIndex].errors.language"
                :value="items[uploadIndex].payload.language"
                @input="updateItemProp({ index: uploadIndex, prop: 'language', value: $event })" />
            <InputKeywords
                :label="$t('input.upload.keywords')"
                :errors="items[uploadIndex].errors.keywords"
                :value="items[uploadIndex].payload.keywords"
                @input="updateItemProp({ index: uploadIndex, prop: 'keywords', value: $event })" />
            <InputRadio
                v-if="fileType==='video'"
                :label="$t('input.upload.treatas')"
                :options="[
                    { value:'', name:$t('input.upload.treatas_default_name'), tip:$t('input.upload.treatas_default_tip') },
                    { value:'video', name:$t('input.upload.treatas_video_name'), tip:$t('input.upload.treatas_video_tip') },
                    { value:'gif', name:$t('input.upload.treatas_gif_name'), tip:$t('input.upload.treatas_gif_tip') },
                ]"
                :errors="items[uploadIndex].errors.type"
                :value="items[uploadIndex].payload.type"
                @input="updateItemProp({ index: uploadIndex, prop: 'type', value: $event })" />
        </div>
    </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex'

import InputField from '../../components/InputField.vue'
import InputKeywords from '../../components/InputKeywords.vue'
import InputSelect from '../../components/InputSelect.vue'
import InputRadio from '../../components/InputRadio.vue'

export default {
    name: 'Form',
    props: {
        uploadIndex: Number,
        fileType: String,
    },
    components: { InputField, InputKeywords, InputSelect, InputRadio },
    computed: {
        ...mapState('upload', [
            'items',
        ])
    },
    methods: {
        ...mapMutations('upload', [
            'updateItemProp'
        ])
    }
}
</script>
