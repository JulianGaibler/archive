<script lang="ts">
  import TextField from 'tint/components/TextField.svelte'
  import Button from 'tint/components/Button.svelte'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import IconDone from 'tint/icons/20-done.svg?raw'

  import {
    getSdk,
    type ChangePasswordMutationVariables,
  } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import {
    createUpdateValue,
    clearValidationErrors,
    type UpdateValue,
  } from '@src/utils/edit-utils'
  import { handleMutation } from '@src/utils/mutation-handler'

  const sdk = getSdk(webClient)

  interface Props {
    totpEnabled: boolean
  }

  const { totpEnabled }: Props = $props()

  interface PasswordFormData {
    oldPassword: UpdateValue<string>
    newPassword: UpdateValue<string>
    newPasswordConfirm: UpdateValue<string>
    code: UpdateValue<string>
  }

  let data = $state<PasswordFormData>({
    oldPassword: createUpdateValue(''),
    newPassword: createUpdateValue(''),
    newPasswordConfirm: createUpdateValue(''),
    code: createUpdateValue(''),
  })

  let loading = $state(false)
  let success = $state(false)
  let globalError: string | undefined = $state(undefined)

  const tryChangePassword = () => {
    clearValidationErrors(data)
    globalError = undefined

    if (data.oldPassword.value.trim().length === 0) {
      data.oldPassword.error = 'Please enter your current password'
    }
    if (data.newPassword.value.trim().length === 0) {
      data.newPassword.error = 'Please enter your new password'
    }
    if (data.newPassword.value !== data.newPasswordConfirm.value) {
      data.newPasswordConfirm.error = 'Passwords do not match'
    }

    if (
      data.oldPassword.error ||
      data.newPassword.error ||
      data.newPasswordConfirm.error
    ) {
      return
    }

    const apiArgs: ChangePasswordMutationVariables = {
      oldPassword: data.oldPassword.value,
      newPassword: data.newPassword.value,
      ...(totpEnabled && data.code.value ? { code: data.code.value } : {}),
    }

    handleMutation(sdk.changePassword(apiArgs), {
      data,
      onSuccess: () => {
        success = true
        data.oldPassword.value = ''
        data.newPassword.value = ''
        data.newPasswordConfirm.value = ''
        data.code.value = ''
      },
      onGlobalError: (msg) => {
        globalError = msg
      },
      setLoading: (v) => {
        loading = v
      },
    })
  }

  function resetErrors() {
    clearValidationErrors(data)
    globalError = undefined
  }

  function resetSuccess() {
    success = false
  }
</script>

{#if globalError}
  <MessageBox icon={IconWarning} onclose={resetErrors}>
    <p>{globalError}</p>
  </MessageBox>
{/if}
{#if success}
  <MessageBox icon={IconDone} onclose={resetSuccess}>
    <p>Your password has been updated</p>
  </MessageBox>
{/if}
<form
  onsubmit={(e) => {
    e.preventDefault()
    tryChangePassword()
  }}
>
  <TextField
    id="old-password"
    type="password"
    label="Current password"
    autocomplete="current-password"
    bind:value={data.oldPassword.value}
    disabled={loading}
    error={data.oldPassword.error}
    oninput={() => (data.oldPassword.error = undefined)}
  />
  <TextField
    id="new-password"
    type="password"
    label="New password"
    autocomplete="new-password"
    bind:value={data.newPassword.value}
    disabled={loading}
    error={data.newPassword.error}
    oninput={() => (data.newPassword.error = undefined)}
  />
  <TextField
    id="new-password-confirm"
    type="password"
    label="Confirm new password"
    autocomplete="new-password"
    bind:value={data.newPasswordConfirm.value}
    disabled={loading}
    error={data.newPasswordConfirm.error}
    oninput={() => (data.newPasswordConfirm.error = undefined)}
  />
  {#if totpEnabled}
    <TextField
      id="totp-code"
      type="text"
      label="Two-factor code"
      inputmode="numeric"
      autocomplete="one-time-code"
      bind:value={data.code.value}
      disabled={loading}
      error={data.code.error}
      oninput={() => (data.code.error = undefined)}
    />
  {/if}
  <div class="actions">
    <Button small submit={true} {loading}>Update password</Button>
  </div>
</form>

<style lang="sass">

form
  width: 100%
  display: flex
  flex-direction: column
  align-items: stretch
  gap: tint.$size-8

.actions
  display: flex
  justify-content: center

</style>
