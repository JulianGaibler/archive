<script lang="ts">
  import TextField from 'tint/components/TextField.svelte'
  import Button from 'tint/components/Button.svelte'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import IconWarning from 'tint/icons/20-warning.svg?raw'

  import { getSdk } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import {
    getOperationResultError,
    isValidationError,
  } from '@src/graphql-errors'
  import {
    createUpdateValue,
    clearValidationErrors,
    setValidationErrors,
  } from '@src/utils/edit-utils'

  const sdk = getSdk(webClient)

  interface Props {
    initialError?: string
  }

  const { initialError }: Props = $props()

  let data = $state({
    username: createUpdateValue(''),
    name: createUpdateValue(''),
    password: createUpdateValue(''),
    confirmPassword: createUpdateValue(''),
  })

  let loading = $state(false)
  let globalError: string | undefined = $state(initialError)

  function clearErrors() {
    clearValidationErrors(data)
    globalError = undefined
  }

  function trySignup() {
    clearErrors()

    // Local validation
    if (!data.username.value.trim()) {
      data.username.error = 'Username is required'
    }
    if (!data.name.value.trim()) {
      data.name.error = 'Display name is required'
    }
    if (!data.password.value) {
      data.password.error = 'Password is required'
    } else if (data.password.value.length < 12) {
      data.password.error = 'Password must be at least 12 characters long'
    }
    if (data.password.value !== data.confirmPassword.value) {
      data.confirmPassword.error = 'Passwords do not match'
    }

    if (
      data.username.error ||
      data.name.error ||
      data.password.error ||
      data.confirmPassword.error
    ) {
      return
    }

    loading = true
    sdk
      .signup({
        username: data.username.value,
        name: data.name.value,
        password: data.password.value,
      })
      .then((res) => {
        const err = getOperationResultError(res)
        if (err) {
          handleError(err)
        } else {
          window.location.href = '/'
        }
      })
      .catch((err) => {
        const parsed = getOperationResultError(err)
        if (parsed) {
          handleError(parsed)
        } else {
          globalError = 'Signup failed. Please try again.'
        }
      })
      .finally(() => {
        loading = false
      })
  }

  function handleError(
    err: NonNullable<ReturnType<typeof getOperationResultError>>,
  ) {
    if (isValidationError(err)) {
      const { unassignableErrors } = setValidationErrors(data, err.issues)
      if (unassignableErrors.length > 0) {
        globalError = unassignableErrors.join('; ')
      }
    } else {
      globalError = err.message
    }
  }
</script>

<h2 class="tint--type-title-serif-2">Sign Up</h2>
<form
  method="POST"
  onsubmit={(e) => {
    e.preventDefault()
    trySignup()
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
    bind:value={data.username.value}
    error={data.username.error}
    disabled={loading}
    oninput={() => (data.username.error = undefined)}
  />
  <TextField
    type="text"
    id="name"
    name="name"
    label="Display Name"
    required
    autocomplete="name"
    bind:value={data.name.value}
    error={data.name.error}
    disabled={loading}
    oninput={() => (data.name.error = undefined)}
  />
  <TextField
    type="password"
    id="password"
    name="password"
    label="Password"
    required
    autocomplete="new-password"
    bind:value={data.password.value}
    error={data.password.error}
    disabled={loading}
    oninput={() => (data.password.error = undefined)}
  />
  <TextField
    type="password"
    id="confirmPassword"
    name="confirmPassword"
    label="Confirm Password"
    required
    autocomplete="new-password"
    bind:value={data.confirmPassword.value}
    error={data.confirmPassword.error}
    disabled={loading}
    oninput={() => (data.confirmPassword.error = undefined)}
  />
  <div class="form-actions">
    <a href="/login" class="tint--type-body-sans-2 login-link">
      Already have an account?
    </a>
    <Button submit={true} {loading}>Sign Up</Button>
  </div>
</form>

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
  justify-content: space-between
  width: 100%
.login-link
  color: var(--tint-text-secondary)
  text-decoration: none
  &:hover
    text-decoration: underline

</style>
