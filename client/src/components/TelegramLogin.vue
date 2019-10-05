<template>
    <div ref="telegram"></div>
</template>

<script>
export default {
    name: 'TelegramLogin',
    props: {
        telegramLogin: {
            type: String,
            required: true,
            validator (value) { return value.endsWith('bot') || value.endsWith('Bot') },
        },
        size: {
            type: String,
            default: 'large',
            validator (value) { return ['small', 'medium', 'large'].includes(value) },
        },
        userpic: {
            type: Boolean,
            default: true,
        },
    },
    methods: {
        onTelegramAuth (user) {
            this.$emit('callback', user)
        },
    },
    mounted () {
        const script = document.createElement('script')
        script.async = true
        script.src = 'https://telegram.org/js/telegram-widget.js?7'
        script.setAttribute('data-size', this.size)
        script.setAttribute('data-userpic', this.userpic)
        script.setAttribute('data-telegram-login', this.telegramLogin)
        window.onTelegramAuth = this.onTelegramAuth
        script.setAttribute('data-onauth', 'window.onTelegramAuth(user)')
        this.$refs.telegram.appendChild(script)
    },
}
</script>
