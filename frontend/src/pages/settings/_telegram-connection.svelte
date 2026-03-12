<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import IconDone from 'tint/icons/20-done.svg?raw'

  import { getSdk, type User } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import { getOperationResultError } from '@src/graphql-errors'

  const sdk = getSdk(webClient)

  interface Props {
    user: Pick<User, 'linkedTelegram'>
  }

  let { user }: Props = $props()

  let loading = $state(false)
  let success = $state(false)
  let globalError = $state<string | undefined>(undefined)

  const tryUnlinkTelegram = () => {
    resetErrors()
    loading = true

    sdk
      .unlinkTelegram()
      .finally(() => {
        loading = false
      })
      .then((res) => {
        if (res.data?.unlinkTelegram) {
          success = true
          user.linkedTelegram = null
          setTimeout(() => {
            success = false
          }, 3000)
        } else {
          console.error('Failed to unlink Telegram:', res)
          globalError = 'Failed to unlink Telegram'
        }
      })
      .catch((e) => {
        globalError = getOperationResultError(e)?.message
      })
  }

  const resetErrors = () => {
    globalError = undefined
    success = false
  }
</script>

<div class="content">
  {#if globalError}
    <MessageBox
      icon={IconWarning}
      onclose={() => {
        globalError = undefined
      }}
    >
      <p>{globalError}</p>
    </MessageBox>
  {/if}

  {#if success}
    <MessageBox
      icon={IconDone}
      onclose={() => {
        success = false
      }}
    >
      <p>Telegram account has been unlinked successfully.</p>
    </MessageBox>
  {/if}

  {#if user.linkedTelegram}
    <div class="connected-status">
      <MessageBox icon={IconDone}>
        Your Telegram account is connected.
      </MessageBox>
    </div>

    <div class="actions">
      <Button small variant="secondary" onclick={tryUnlinkTelegram} {loading}>
        Unlink Telegram
      </Button>
    </div>
  {:else}
    <div class="disconnected-status">
      <p class="tint--type-ui">
        No Telegram account is currently linked to your Archive account.
      </p>
    </div>

    <div class="actions">
      <Button small variant="primary" href="/settings/link-telegram">
        Link Telegram Account
      </Button>
    </div>
  {/if}
</div>

<style lang="sass">
  .content
    display: flex
    flex-direction: column
    gap: tint.$size-8

  .connected-status,
  .disconnected-status
    display: flex
    flex-direction: column
    gap: tint.$size-8

  .actions
    display: flex
    gap: tint.$size-12
    justify-content: center
</style>
