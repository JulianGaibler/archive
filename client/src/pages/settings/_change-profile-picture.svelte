<script lang="ts">
  import FileInput from 'tint/components/FileInput.svelte'
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
  import UserPicture from '@src/components/UserPicture.svelte'

  const sdk = getSdk(webClient)

  interface Props {
    user: Pick<User, 'profilePicture' | 'username'>
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

  const tryClearPicture = (e: Event) => {
    e.preventDefault()
    resetErrors()
    loading = true

    sdk
      .clearProfilePicture()
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

<h2 class="tint--type-body-serif-bold">Profile picture</h2>

<div class="flex-center">
  <UserPicture {user} size="128" />
</div>

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
    <!-- svelte-ignore a11y_invalid_attribute -->
    <a href="javascript:location.reload()">Reload page </a>
  </MessageBox>
{/if}
<form onsubmit={tryChangePicture} class="pfp-set">
  <FileInput
    id="file"
    accept="image/*"
    label="Profile picture"
    bind:value={file}
    error={fileError}
  />
  <div class="flex-center">
    <Button small variant="primary" submit={true} disabled={loading}
      >Update picture</Button
    >
  </div>
</form>
<form class="flex-center pfp-clear" onsubmit={tryClearPicture}>
  <Button small submit={true} disabled={loading}>Remove picture</Button>
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
