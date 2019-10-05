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
                <h3>{{ $t('settings.linked_accounts') }}</h3>
                <InputArnoldBot />
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
import InputArnoldBot from './Settings/InputArnoldBot'
import SessionManager from './Settings/SessionManager'

export default {
    name: 'Settings',
    components: { InputProfilePicture, InputChangePassword, InputChangeName, InputArnoldBot, SessionManager },
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
