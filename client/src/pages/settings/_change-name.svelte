<script lang="ts">
  import TextField from 'tint/components/TextField.svelte'
  import Button from 'tint/components/Button.svelte'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import IconDone from 'tint/icons/20-done.svg?raw'

  import {
    getSdk,
    type UploadPictureMutationVariables,
    type User,
  } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import { getOperationResultError } from '@src/utils'

  const sdk = getSdk(webClient)

  interface Props {
    user: Pick<User, 'username' | 'name'>
  }

  let { user }: Props = $props()

  let file = $state<File | undefined>(undefined)

  let loading = $state(false)
  let success = $state(false)
  let globalError = $state<string | undefined>(undefined)
  let fileError = $state<string | undefined>(undefined)

  const tryChangePicture = (e: Event) => {
    e.preventDefault()
    const args: UploadPictureMutationVariables = { file }
    resetErrors()

    if (!file) {
      fileError = 'Please select a file'
    }
    if (fileError) {
      return
    }

    loading = true

    sdk
      .uploadPicture(args)
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
    fileError = undefined
  }

  function resetSuccess() {
    success = false
    file = undefined
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
    <p>Your profile picture has been updated</p>
  </MessageBox>
{/if}
<TextField
  id="file"
  label="Username"
  disabled
  bind:value={user.username}
  error={fileError}
  helperText="Reach out if you want to change your username"
/>
<form onsubmit={tryChangePicture} class="pfp-set">
  <TextField id="file" label="Name" bind:value={user.name} error={fileError} />
  <div class="flex-center">
    <Button small variant="primary" submit={true} disabled={loading}
      >Update name</Button
    >
  </div>
</form>

<style lang="sass">

form
  width: 100%
  display: flex
  flex-direction: column
  align-items: stretch
  gap: tint.$size-8

form.pfp-set
  flex-grow: 1

form.pfp-clear
  flex-direction: row

a
  color: var(--tint-text-link)

.flex-center
  display: flex
  justify-content: center

</style>
