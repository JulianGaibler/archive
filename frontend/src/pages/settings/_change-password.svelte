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
  import { getOperationResultError } from '@src/graphql-errors'
  import {
    createUpdateValue,
    clearValidationErrors,
    setValidationErrors,
    type UpdateValue,
  } from '@src/utils/edit-utils'

  const sdk = getSdk(webClient)

  interface PasswordFormData {
    oldPassword: UpdateValue<string>
    newPassword: UpdateValue<string>
    newPasswordConfirm: UpdateValue<string>
  }

  let data = $state<PasswordFormData>({
    oldPassword: createUpdateValue(''),
    newPassword: createUpdateValue(''),
    newPasswordConfirm: createUpdateValue(''),
  })

  let loading = $state(false)
  let success = $state(false)
  let globalError: string | undefined = $state(undefined)

  const tryChangePassword = () => {
    // Clear previous validation errors
    clearValidationErrors(data)
    globalError = undefined

    // Local validation
    if (data.oldPassword.value.trim().length === 0) {
      data.oldPassword.error = 'Please enter your current password'
    }
    if (data.newPassword.value.trim().length === 0) {
      data.newPassword.error = 'Please enter your new password'
    }
    if (data.newPassword.value !== data.newPasswordConfirm.value) {
      data.newPasswordConfirm.error = 'Passwords do not match'
    }

    // Check if there are any validation errors
    if (
      data.oldPassword.error ||
      data.newPassword.error ||
      data.newPasswordConfirm.error
    ) {
      return
    }

    loading = true

    // Extract values for API call
    const apiArgs: ChangePasswordMutationVariables = {
      oldPassword: data.oldPassword.value,
      newPassword: data.newPassword.value,
    }

    sdk
      .changePassword(apiArgs)
      .finally(() => {
        loading = false
      })
      .then((res) => {
        const errorResult = getOperationResultError(res)
        if (errorResult) {
          if ('issues' in errorResult) {
            const { unassignableErrors } = setValidationErrors(
              data,
              errorResult.issues,
            )
            if (unassignableErrors.length > 0) {
              globalError = unassignableErrors.join('; ')
            }
          } else {
            globalError = errorResult.message
          }
        } else {
          success = true
          data.oldPassword.value = ''
          data.newPassword.value = ''
          data.newPasswordConfirm.value = ''
        }
      })
      .catch((err) => {
        const errorResult = getOperationResultError(err)
        if (errorResult) {
          if ('issues' in errorResult) {
            const { unassignableErrors } = setValidationErrors(
              data,
              errorResult.issues,
            )
            if (unassignableErrors.length > 0) {
              globalError = unassignableErrors.join('; ')
            }
          } else {
            globalError = errorResult.message
          }
        } else {
          globalError = 'An unexpected error occurred'
        }
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
<form onsubmit={preventDefault(() => tryChangePassword())}>
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
  <Button submit={true} {loading}>Update password</Button>
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
