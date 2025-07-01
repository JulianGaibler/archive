<script lang="ts">
  import TextField from 'tint/components/TextField.svelte'
  import Button from 'tint/components/Button.svelte'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import IconDone from 'tint/icons/20-done.svg?raw'

  import {
    getSdk,
    type ChangeNameMutationVariables,
    type User,
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

  interface Props {
    user: Pick<User, 'username' | 'name'>
  }

  let { user }: Props = $props()

  interface NameFormData {
    newName: UpdateValue<string>
  }

  let data = $state<NameFormData>({
    newName: createUpdateValue(user.name || ''),
  })

  let loading = $state(false)
  let success = $state(false)
  let globalError: string | undefined = $state(undefined)

  const tryChangeName = (e: Event) => {
    e.preventDefault()

    // Clear previous validation errors
    clearValidationErrors(data)
    globalError = undefined

    // Local validation
    if (!data.newName.value || data.newName.value.trim().length === 0) {
      data.newName.error = 'Please enter a name'
    }

    // Check if there are any validation errors
    if (data.newName.error) {
      return
    }

    loading = true

    const args: ChangeNameMutationVariables = { newName: data.newName.value }

    sdk
      .changeName(args)
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

<h2 class="tint--type-body-serif-bold">Your name</h2>

{#if globalError}
  <MessageBox icon={IconWarning} onclose={resetErrors}>
    <h2>Error</h2>
    <p>{globalError}</p>
  </MessageBox>
{/if}
{#if success}
  <MessageBox icon={IconDone} onclose={resetSuccess}>
    <h2>Success</h2>
    <p>Your name has been updated</p>
  </MessageBox>
{/if}
<TextField
  id="username"
  label="Username"
  disabled
  bind:value={user.username}
  helperText="Reach out if you want to change your username"
/>
<form onsubmit={tryChangeName} class="update">
  <TextField
    id="display-name"
    label="Name"
    bind:value={data.newName.value}
    error={data.newName.error}
    disabled={loading}
    oninput={() => (data.newName.error = undefined)}
  />
  <div class="flex-center">
    <Button small variant="primary" submit={true} {loading}>Update name</Button>
  </div>
</form>

<style lang="sass">

form
  width: 100%
  display: flex
  flex-direction: column
  align-items: stretch
  gap: tint.$size-8

form.update
  flex-grow: 1

.flex-center
  display: flex
  justify-content: center

</style>
