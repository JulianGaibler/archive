<template>
    <div class="modalWrapper">
        <div class="modal" v-click-outside="cancel">
            <div class="message">
                <p v-if="messageA"><strong>{{ messageA }}</strong></p>
                <p v-if="messageB">{{ messageB }}</p>
            </div>
            <div class="actionsRow">
                <button @click="cancel" class="button button-slim">{{ optionA }}</button>
                <button v-if="optionB" @click="confirm" class="button button-slim" :class="[ important ? 'button-dangerous' : 'button-primary' ]">{{ optionB }}</button>
            </div>
        </div>
    </div>
</template>

<script>

export default {
    name: 'Modal',
    props: {
        messageA: String,
        messageB: String,
        optionA: String,
        optionB: String,
        important: Boolean,
    },
    methods: {
        cancel() {
            this.$emit('cancel')
        },
        confirm() {
            this.$emit('confirm')
        },
    },
}
</script>
