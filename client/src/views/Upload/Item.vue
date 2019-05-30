<template>
    <div class="item">
        <div>
            <div class="preview">
                <video v-if="fileType==='video'" autoplay muted loop v-bind:src="imagePreview"/>
                <img v-else-if="fileType==='image'" v-bind:src="imagePreview"/>            
            </div>
        </div>
        <div class="data">
            <div v-if="upload.errors.general" class="error">{{upload.errors.general}}</div>
            <div class="inputs">
                <InputField :type="'text'" v-model="upload.payload.title" :label="'Title'" :errors="upload.errors.title" />
                <InputField :type="'textarea'" v-model="upload.payload.caption" :label="'Caption'" :errors="upload.errors.caption" />
                <InputKeywords v-model="upload.payload.keywords" :label="'Keywords'" />
            </div>
        </div>
    </div>
</template>

<script>
import InputField from '../../components/InputField.vue'
import InputKeywords from '../../components/InputKeywords.vue'

export default {
    name: 'Item',
    props: {
        upload: Object
    },
    components: { InputField, InputKeywords },
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