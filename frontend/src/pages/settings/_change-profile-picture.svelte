<script lang="ts">
  import FileInput from 'tint/components/FileInput.svelte'
  import Button from 'tint/components/Button.svelte'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import IconDone from 'tint/icons/20-done.svg?raw'

  import {
    FileProcessingStatus,
    getSdk,
    type UploadPictureMutationVariables,
    type User,
  } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import UserPicture from '@src/components/UserPicture.svelte'
  import { getOperationResultError } from '@src/graphql-errors'
  import { handleMutation } from '@src/utils/mutation-handler'

  const sdk = getSdk(webClient)

  interface Props {
    user: Pick<User, 'profilePicture' | 'username'>
  }

  let { user }: Props = $props()

  let file = $state<File | undefined>(undefined)

  let loading = $state(false)
  let processing = $state(false)
  let success = $state(false)
  let globalError = $state<string | undefined>(undefined)
  let fileError = $state<string | undefined>(undefined)

  async function pollForProcessingStatus() {
    const maxAttempts = 20
    const interval = 500

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval))

      try {
        const res = await sdk.profilePictureStatus()
        const pfp = res.data.me?.profilePicture

        if (pfp?.processingStatus === FileProcessingStatus.Done) {
          processing = false
          loading = false
          success = true
          return
        }

        if (pfp?.processingStatus === FileProcessingStatus.Failed) {
          processing = false
          loading = false
          globalError =
            pfp.processingNotes ?? 'Profile picture processing failed'
          return
        }
      } catch {
        // Ignore individual poll errors, keep trying
      }
    }

    // Timeout
    processing = false
    loading = false
    globalError = 'Profile picture processing is taking longer than expected. Please reload the page.'
  }

  const tryChangePicture = async (e: Event) => {
    e.preventDefault()
    resetErrors()

    if (!file) {
      fileError = 'Please select a file'
    }
    if (fileError) {
      return
    }

    loading = true
    const args: UploadPictureMutationVariables = { file }

    try {
      const res = await sdk.uploadPicture(args)
      const errorResult = getOperationResultError(res)
      if (errorResult) {
        globalError = errorResult.message
        loading = false
        return
      }

      // File is now queued for processing — poll for completion
      processing = true
      pollForProcessingStatus()
    } catch (err) {
      const errorResult = getOperationResultError(err)
      if (errorResult) {
        globalError = errorResult.message
      } else {
        globalError = 'An unexpected error occurred'
      }
      loading = false
    }
  }

  const tryClearPicture = (e: Event) => {
    e.preventDefault()
    resetErrors()

    handleMutation(sdk.clearProfilePicture(), {
      onSuccess: () => {
        success = true
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
    globalError = undefined
    fileError = undefined
  }

  function resetSuccess() {
    success = false
    processing = false
    file = undefined
  }
</script>

<div class="flex-center">
  <UserPicture {user} size="128" />
</div>

{#if globalError}
  <MessageBox icon={IconWarning} onclose={resetErrors}>
    <p>{globalError}</p>
  </MessageBox>
{/if}
{#if processing}
  <MessageBox>
    <p>Processing profile picture...</p>
  </MessageBox>
{/if}
{#if success}
  <MessageBox icon={IconDone} onclose={resetSuccess}>
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
    disabled={loading}
  />
  <div class="flex-center">
    <Button small variant="primary" submit={true} {loading}
      >Update picture</Button
    >
  </div>
</form>
<form class="flex-center pfp-clear" onsubmit={tryClearPicture}>
  <Button small submit={true} {loading}>Remove picture</Button>
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
