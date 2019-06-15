<template>
    <div class="item">
        <div>
            <div class="preview">
                <video v-if="fileType==='video'" autoplay muted loop v-bind:src="imagePreview"/>
                <img v-else-if="fileType==='image'" v-bind:src="imagePreview"/>
            </div>
        </div>
        <div class="data">
            <div v-if="upload.errors.general" class="errorBox">{{upload.errors.general}}</div>
            <div class="inputs">
                <InputField
                    :label="$t('input.upload.title')"
                    :type="'text'"
                    :errors="upload.errors.title"
                    v-model="upload.payload.title" />
                <InputField
                    :label="$t('input.upload.caption')"
                    :type="'textarea'"
                    :errors="upload.errors.caption"
                    v-model="upload.payload.caption" />
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
                    :errors="upload.errors.language"
                    v-model="upload.payload.language" />
                <InputKeywords
                    :label="$t('input.upload.keywords')"
                    :errors="upload.errors.keywords"
                    v-model="upload.payload.keywords" />
                <InputRadio
                    v-if="fileType==='video'"
                    :label="$t('input.upload.treatas')"
                    :options="[
                        { value:'', name:$t('input.upload.treatas_default_name'), tip:$t('input.upload.treatas_default_tip') },
                        { value:'video', name:$t('input.upload.treatas_video_name'), tip:$t('input.upload.treatas_video_tip') },
                        { value:'gif', name:$t('input.upload.treatas_gif_name'), tip:$t('input.upload.treatas_gif_tip') },
                    ]"
                    :errors="upload.errors.type"
                    v-model="upload.payload.type" />
            </div>
        </div>
    </div>
</template>

<script>
import InputField from '../../components/InputField.vue'
import InputKeywords from '../../components/InputKeywords.vue'
import InputSelect from '../../components/InputSelect.vue'
import InputRadio from '../../components/InputRadio.vue'

export default {
    name: 'Item',
    props: {
        upload: Object
    },
    components: { InputField, InputKeywords, InputSelect, InputRadio },
    data() {
        return {
            imagePreview: '',
            fileType: ''
        }
    },
    mounted() {
        let reader  = new FileReader();
        reader.addEventListener("load", function () {
            this.imagePreview = reader.result;
            this.fileType = this.upload.payload.file.type.split('/')[0]
        }.bind(this), false);
        reader.readAsDataURL( this.upload.payload.file );
    },
}
</script>
