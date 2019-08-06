<template>
    <div class="frame framed settings">
        <header>
                <h1>{{ $t('views.settings') }}</h1>
        </header>

        <section class="content" >
            <h2>{{ $t('settings.profile') }}</h2>
            <InputProfilePicture />
            <InputChangeName />
        </section>
        <section class="content" >
            <h2>{{ $t('settings.security') }}</h2>
            <h3>{{ $t('settings.security_changePassword') }}</h3>
            <InputChangePassword />
            <h3>{{ $t('settings.security_sessions') }}</h3>
            <SessionManager />
        </section>

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
