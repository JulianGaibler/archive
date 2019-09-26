<template>
    <div class="settings">
        <header class="framed">
            <h1>{{ $t('views.settings') }}</h1>
        </header>

        <div class="frame framed">
            <section>
                <h2>{{ $t('settings.profile') }}</h2>
                <InputProfilePicture />
                <InputChangeName />
            </section>
            <section>
                <h2>{{ $t('settings.security') }}</h2>
                <h3>{{ $t('settings.security_changePassword') }}</h3>
                <InputChangePassword />
                <h3>{{ $t('settings.security_sessions') }}</h3>
                <SessionManager />
            </section>
        </div>
    </div>
</template>

<script>
import InputProfilePicture from './Settings/InputProfilePicture'
import InputChangePassword from './Settings/InputChangePassword'
import InputChangeName from './Settings/InputChangeName'
import SessionManager from './Settings/SessionManager'

export default {
    name: 'Settings',
    components: { InputProfilePicture, InputChangePassword, InputChangeName, SessionManager },
}
</script>

<style scoped lang="stylus">
@import "~@/assets/styles/palette.styl"

.settings
    > section > .itemRow > :not(:last-child)
        margin-right 2rem
    > div > section
        > h2, > h3
            margin-top 1.5rem
            margin-bottom 1rem
</style>
