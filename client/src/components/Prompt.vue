<template>
    <div class="promptWrapper">
        <div class="prompt" v-click-outside="cancel">
            <div class="message">
                <h1 v-if="messageA">{{ messageA }}</h1>
                <p v-if="messageB">{{ messageB }}</p>
            </div>
            <div class="actionsRow">
                <button @click="cancel" v-focus="true" class="button button-slim">{{ actionA }}</button>
                <button
                    v-if="actionB"
                    @click="confirm"
                    class="button button-slim"
                    :class="[ important ? 'button-dangerous' : 'button-primary' ]">{{ actionB }}</button>
            </div>
        </div>
    </div>
</template>

<script>

export default {
    name: 'Prompt',
    props: {
        messageA: String,
        messageB: String,
        actionA: String,
        actionB: String,
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

<style scoped lang="stylus">
@import "~@/assets/styles/palette.styl"

.promptWrapper
    position fixed
    z-index 400
    c background archive-std-a04
    display flex
    justify-content center
    align-items center
    left 0
    right 0
    top 0
    bottom 0
    > .prompt
        padding 1rem
        c background archive-std
        border-radius $archive-radius3
        box-shadow $archive-hoverShadow3
        .message
            max-width 20rem
            font-size 1.1rem
            padding .5rem
            margin-bottom 1rem
            line-height 1.4
            h1
                font-size inherit
            :not(:last-child)
                margin-bottom .5rem

[data-theme^="dark"] .hoverBox
        border 0.15rem solid #313131
</style>
