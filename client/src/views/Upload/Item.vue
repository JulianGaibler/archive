<template>
    <div class="item">
        <div>
            <div class="preview">
                <video v-if="fileType==='video'" autoplay muted loop v-bind:src="imagePreview"/>
                <img v-else-if="fileType==='image'" v-bind:src="imagePreview"/>            
            </div>
        </div>
        <div class="data">
            <InputField :type="'text'" v-model="upload.title" :label="'Title'" />
            <InputField :type="'textarea'" v-model="upload.caption" :label="'Caption'" />
            <InputKeywords v-model="upload.keywords" :label="'Keywords'" />
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
            this.fileType = this.upload.file.type.split('/')[0]
        }.bind(this), false);
        reader.readAsDataURL( this.upload.file );
    },
}
</script>