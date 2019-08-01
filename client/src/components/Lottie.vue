<template>
    <div ref="animContainer"></div>
</template>

<script>
import lottie from 'lottie-web'

export default {
    name: 'Lottie',
    props: {
        options: Object,
    },
    mounted () {
        this.anim = lottie.loadAnimation({
            container: this.$refs.animContainer,
            renderer: 'svg',
            loop: this.options.loop !== false,
            autoplay: this.options.autoplay !== false,
            animationData: this.options.animationData.default,
            rendererSettings: this.options.rendererSettings,
        })
        this.$emit('animCreated', this.anim)
    },
}
</script>
