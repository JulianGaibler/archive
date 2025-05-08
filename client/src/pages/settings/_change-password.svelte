<script lang="ts">
  import { preventDefault } from 'svelte/legacy'

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
  import { getOperationResultError } from '@src/utils'

  const sdk = getSdk(webClient)

  let oldPassword = $state('')
  let newPassword = $state('')
  let newPasswordConfirm = $state('')

  let loading = $state(false)
  let success = $state(false)
  let globalError: string | undefined = $state(undefined)
  let oldPasswordError: string | undefined = $state(undefined)
  let newPasswordError: string | undefined = $state(undefined)
  let newPasswordConfirmError: string | undefined = $state(undefined)

  const tryChangePassword = (args: ChangePasswordMutationVariables) => {
    resetErrors()

    if (args.oldPassword.trim().length === 0) {
      oldPasswordError = 'Please enter your current password'
    }
    if (args.newPassword.trim().length === 0) {
      newPasswordError = 'Please enter your new password'
    }
    if (args.newPassword !== newPasswordConfirm) {
      newPasswordConfirmError = 'Passwords do not match'
    }
    if (oldPasswordError || newPasswordError || newPasswordConfirmError) {
      return
    }

    loading = true

    sdk
      .changePassword(args)
      .finally(() => {
        loading = false
      })
      .then((res) => {
        globalError = getOperationResultError(res)
        if (!globalError) {
          success = true
          oldPassword = ''
          newPassword = ''
          newPasswordConfirm = ''
        }
      })
      .catch((err) => {
        globalError = getOperationResultError(err)
      })
  }

  function resetErrors() {
    globalError = undefined
    oldPasswordError = undefined
    newPasswordError = undefined
    newPasswordConfirmError = undefined
  }

  function resetSuccess() {
    success = false
  }
</script>

<h2 class="tint--type-body-serif-bold">Password</h2>

{#if globalError}
  <MessageBox icon={IconWarning} onclose={resetErrors}>
    <h2>Error</h2>
    <p>{globalError}</p>
  </MessageBox>
{/if}
{#if success}
  <MessageBox icon={IconDone} onclose={resetSuccess}>
    <h2>Success</h2>
    <p>Your password has been updated</p>
  </MessageBox>
{/if}
<form
  onsubmit={preventDefault(() =>
    tryChangePassword({ oldPassword, newPassword }),
  )}
>
  <TextField
    id="old-password"
    type="password"
    label="Current password"
    autocomplete="current-password"
    bind:value={oldPassword}
    disabled={loading}
    error={oldPasswordError}
    oninput={() => (oldPasswordError = undefined)}
  />
  <TextField
    id="new-password"
    type="password"
    label="New password"
    autocomplete="new-password"
    bind:value={newPassword}
    disabled={loading}
    error={newPasswordError}
    oninput={() => (newPasswordError = undefined)}
  />
  <TextField
    id="new-password-confirm"
    type="password"
    label="Confirm new password"
    autocomplete="new-password"
    bind:value={newPasswordConfirm}
    disabled={loading}
    error={newPasswordConfirmError}
    oninput={() => (newPasswordConfirmError = undefined)}
  />
  <Button submit={true} disabled={loading}>Update password</Button>
</form>

<style lang="sass">

form
  width: 100%
  display: flex
  flex-direction: column
  align-items: stretch
  gap: tint.$size-8
  :global(> :last-child)
    align-self: flex-end

</style>
