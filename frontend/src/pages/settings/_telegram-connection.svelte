<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import IconDone from 'tint/icons/20-done.svg?raw'

  import { getSdk, type User } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import { getOperationResultError } from '@src/utils'

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
          // Success feedback will clear after 3 seconds
          setTimeout(() => {
            success = false
          }, 3000)
        } else {
          console.error('Failed to unlink Telegram:', res)
          globalError = 'Failed to unlink Telegram'
        }
      })
      .catch((e) => {
        globalError = getOperationResultError(e)
      })
  }

  const resetErrors = () => {
    globalError = undefined
    success = false
  }
</script>

<h2 class="tint--type-body-serif-bold">Telegram connection</h2>

<form>
  <p class="tint--type-ui description">
    Connect your Archive account with Telegram to enable posting directly from
    the arnoldbot.
  </p>

  {#if globalError}
    <MessageBox icon={IconWarning}>
      {globalError}
    </MessageBox>
  {/if}

  {#if success}
    <MessageBox icon={IconDone}>
      Telegram account has been unlinked successfully.
    </MessageBox>
  {/if}

  {#if user.linkedTelegram}
    <div class="connected-status">
      <MessageBox icon={IconDone}>
        Your Telegram account is connected.
      </MessageBox>
    </div>

    <div class="actions">
      <Button variant="secondary" onclick={tryUnlinkTelegram} {loading}>
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
      <Button variant="primary" href="/settings/link-telegram">
        Link Telegram Account
      </Button>
    </div>
  {/if}
</form>

<style lang="sass">
  form
    display: flex
    flex-direction: column
    gap: tint.$size-16
      
  p.description
    color: var(--tint-text-secondary)
    margin: 0

  .connected-status,
  .disconnected-status
    display: flex
    flex-direction: column
    gap: tint.$size-8

  .actions
    display: flex
    gap: tint.$size-12
    justify-content: flex-end
</style>
