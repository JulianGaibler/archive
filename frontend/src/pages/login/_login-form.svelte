<script lang="ts">
  import TextField from 'tint/components/TextField.svelte'
  import Button from 'tint/components/Button.svelte'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import IconWarning from 'tint/icons/20-warning.svg?raw'

  import { getSdk } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import { getOperationResultError } from '@src/graphql-errors'
  import {
    createUpdateValue,
    clearValidationErrors,
    type UpdateValue,
  } from '@src/utils/edit-utils'

  const sdk = getSdk(webClient)

  interface Props {
    redirectUrl: string
    signupAllowed: boolean
    initialError?: string
  }

  const { redirectUrl, signupAllowed, initialError }: Props = $props()

  let phase: 'credentials' | 'totp' = $state('credentials')
  let username: UpdateValue<string> = $state(createUpdateValue(''))
  let password: UpdateValue<string> = $state(createUpdateValue(''))
  let code: UpdateValue<string> = $state(createUpdateValue(''))
  let pendingToken = $state('')
  let loading = $state(false)
  let globalError: string | undefined = $state(initialError)

  function clearErrors() {
    clearValidationErrors({ username, password, code })
    globalError = undefined
  }

  function tryLogin() {
    clearErrors()

    if (!username.value.trim()) {
      username.error = 'Username is required'
    }
    if (!password.value.trim()) {
      password.error = 'Password is required'
    }
    if (username.error || password.error) return

    loading = true
    sdk
      .login({ username: username.value, password: password.value })
      .then((res) => {
        const err = getOperationResultError(res)
        if (err) {
          globalError = err.message
          return
        }
        const login = res.data.login
        if (login.requiresTotp) {
          pendingToken = login.pendingToken!
          phase = 'totp'
        } else if (login.success) {
          window.location.href = redirectUrl
        } else {
          globalError = 'Invalid username or password'
        }
      })
      .catch((err) => {
        const parsed = getOperationResultError(err)
        globalError = parsed?.message || 'Login failed. Please try again.'
      })
      .finally(() => {
        loading = false
      })
  }

  function tryVerifyTotp() {
    clearErrors()

    if (!code.value.trim()) {
      code.error = 'Please enter your verification code'
      return
    }

    loading = true
    sdk
      .verifyLoginTotp({ pendingToken, code: code.value })
      .then((res) => {
        const err = getOperationResultError(res)
        if (err) {
          if (
            err.message.toLowerCase().includes('expired') ||
            err.message.toLowerCase().includes('invalid token')
          ) {
            phase = 'credentials'
            code = createUpdateValue('')
            pendingToken = ''
            globalError =
              'Your verification session has expired. Please log in again.'
          } else {
            globalError = err.message
          }
          return
        }
        window.location.href = redirectUrl
      })
      .catch((err) => {
        const parsed = getOperationResultError(err)
        if (
          parsed?.message.toLowerCase().includes('expired') ||
          parsed?.message.toLowerCase().includes('invalid token')
        ) {
          phase = 'credentials'
          code = createUpdateValue('')
          pendingToken = ''
          globalError =
            'Your verification session has expired. Please log in again.'
        } else {
          globalError =
            parsed?.message || 'Verification failed. Please try again.'
        }
      })
      .finally(() => {
        loading = false
      })
  }

  function backToCredentials() {
    phase = 'credentials'
    code = createUpdateValue('')
    pendingToken = ''
    globalError = undefined
  }
</script>

{#if phase === 'credentials'}
  <h2 class="tint--type-title-serif-2">Login</h2>
  <form
    method="POST"
    onsubmit={(e) => {
      e.preventDefault()
      tryLogin()
    }}
  >
    {#if globalError}
      <MessageBox icon={IconWarning} onclose={() => (globalError = undefined)}>
        <h2>Error</h2>
        <p>{globalError}</p>
      </MessageBox>
    {/if}
    <TextField
      type="text"
      id="username"
      name="username"
      label="Username"
      required
      autocomplete="username"
      bind:value={username.value}
      error={username.error}
      disabled={loading}
      oninput={() => (username.error = undefined)}
    />
    <TextField
      type="password"
      id="password"
      name="password"
      label="Password"
      required
      autocomplete="current-password"
      bind:value={password.value}
      error={password.error}
      disabled={loading}
      oninput={() => (password.error = undefined)}
    />
    <div class="form-actions">
      {#if signupAllowed}
        <a href="/signup" class="tint--type-body-sans-2 secondary-link">
          Create an account
        </a>
      {/if}
      <Button submit={true} {loading}>Login</Button>
    </div>
    <input type="hidden" name="redirect" value={redirectUrl} />
  </form>
{:else}
  <h2 class="tint--type-title-serif-2">Verify your identity</h2>
  <form
    onsubmit={(e) => {
      e.preventDefault()
      tryVerifyTotp()
    }}
  >
    {#if globalError}
      <MessageBox icon={IconWarning} onclose={() => (globalError = undefined)}>
        <h2>Error</h2>
        <p>{globalError}</p>
      </MessageBox>
    {/if}
    <p class="tint--type-body-sans-2 hint">
      Enter the 6-digit code from your authenticator app. If you've lost access,
      use a recovery code.
    </p>
    <TextField
      type="text"
      id="totp-code"
      label="Verification code"
      inputmode="numeric"
      autocomplete="one-time-code"
      bind:value={code.value}
      error={code.error}
      disabled={loading}
      oninput={() => (code.error = undefined)}
    />
    <div class="form-actions">
      <button
        type="button"
        class="tint--type-body-sans-2 secondary-link back-link"
        onclick={backToCredentials}
      >
        Back
      </button>
      <Button submit={true} {loading}>Verify</Button>
    </div>
  </form>
{/if}

<style lang="sass">

form
  display: flex
  flex-direction: column
  gap: tint.$size-12
  :global(.error)
    width: 100%
    box-sizing: border-box
.form-actions
  display: flex
  align-items: center
  justify-content: flex-end
  width: 100%
  gap: tint.$size-12
.secondary-link
  color: var(--tint-text-secondary)
  text-decoration: none
  margin-right: auto
  &:hover
    text-decoration: underline
.back-link
  background: none
  border: none
  padding: 0
  cursor: pointer
  font: inherit
.hint
  color: var(--tint-text-secondary)

</style>
