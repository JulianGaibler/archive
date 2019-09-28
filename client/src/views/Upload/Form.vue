<template>
    <div class="data">
        <div v-if="uploadItem.errors.general" class="errorBox">{{uploadItem.errors.general}}</div>
        <div class="inputs">
            <InputField
                :label="$t('input.upload.title')"
                :type="'text'"
                :autofocus="true"
                :errors="uploadItem.errors.title"
                v-model="uploadItem.payload.title" />
            <InputField
                :label="$t('input.upload.caption')"
                :type="'textarea'"
                :errors="uploadItem.errors.caption"
                v-model="uploadItem.payload.caption" />
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
                :errors="uploadItem.errors.language"
                v-model="uploadItem.payload.language" />
            <InputKeywords
                :label="$t('input.upload.keywords')"
                :errors="uploadItem.errors.keywords"
                v-model="uploadItem.payload.keywords" />
            <InputRadio
                v-if="fileType==='video'"
                :label="$t('input.upload.treatas')"
                :options="[
                    { value:'', name:$t('input.upload.treatas_default_name'), tip:$t('input.upload.treatas_default_tip') },
                    { value:'video', name:$t('input.upload.treatas_video_name'), tip:$t('input.upload.treatas_video_tip') },
                    { value:'gif', name:$t('input.upload.treatas_gif_name'), tip:$t('input.upload.treatas_gif_tip') },
                ]"
                :errors="uploadItem.errors.type"
                v-model="uploadItem.payload.type" />
        </div>
    </div>
</template>

<script>

import InputField from '@/components/Input/InputField.vue'
import InputKeywords from '@/components/Input/InputKeywords.vue'
import InputSelect from '@/components/Input/InputSelect.vue'
import InputRadio from '@/components/Input/InputRadio.vue'

export default {
    name: 'Form',
    props: {
        uploadItem: Object,
        fileType: String,
    },
    components: { InputField, InputKeywords, InputSelect, InputRadio },
}
</script>
