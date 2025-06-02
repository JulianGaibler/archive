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
  import { getOperationResultError } from '@src/utils'

  const sdk = getSdk(webClient)

  interface Props {
    user: Pick<User, 'username' | 'name'>
  }

  let { user }: Props = $props()

  let newName = $state<string>(user.name || '')

  let loading = $state(false)
  let success = $state(false)
  let globalError = $state<string | undefined>(undefined)
  let inputError = $state<string | undefined>(undefined)

  const tryChangePicture = (e: Event) => {
    e.preventDefault()
    const args: ChangeNameMutationVariables = { newName }
    resetErrors()

    if (!newName || newName.trim().length === 0) {
      inputError = 'Please enter a name'
    }
    if (inputError) {
      return
    }

    loading = true

    sdk
      .changeName(args)
      .finally(() => {
        loading = false
      })
      .then((res) => {
        globalError = getOperationResultError(res)
        if (!globalError) {
          success = true
        }
      })
      .catch((err) => {
        globalError = getOperationResultError(err)
      })
  }

  function resetErrors() {
    globalError = undefined
    inputError = undefined
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
  id="file"
  label="Username"
  disabled
  bind:value={user.username}
  helperText="Reach out if you want to change your username"
/>
<form onsubmit={tryChangePicture} class="update">
  <TextField id="file" label="Name" bind:value={newName} error={inputError} />
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
