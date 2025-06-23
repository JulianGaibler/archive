<script lang="ts">
  import { getSdk } from '../generated/graphql'
  import { webClient } from '../gql-client'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import Button from 'tint/components/Button.svelte'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'

  import { onMount } from 'svelte'
  import { getOperationResultError } from '@src/utils'

  interface Props {
    isLinked: boolean
  }

  interface TelegramUser {
    id: number
    first_name?: string
    last_name?: string
    username?: string
    photo_url?: string
    auth_date: number
    hash: string
  }

  let { isLinked = $bindable() }: Props = $props()

  const sdk = getSdk(webClient)
  let loading = $state(false)
  let error = $state<string | null>(null)

  // Handle Telegram auth from widget callback
  async function onTelegramAuth(user: TelegramUser) {
    loading = true
    error = null
    try {
      const result = await sdk.linkTelegram({
        apiResponse: JSON.stringify(user),
      })
      loading = false

      error = getOperationResultError(result) || null
      if (error) {
        console.error('Error linking Telegram account:', error)
        return
      }

      isLinked = true
    } catch (err) {
      console.error('Failed to link Telegram account:', err)
      error = 'Failed to link your Telegram account. Please try again.'
      loading = false
    }
  }

  // Initialize Telegram Login Widget
  function initTelegramLogin() {
    // Make the callback function globally available
    ;(
      window as unknown as { onTelegramAuth: (user: TelegramUser) => void }
    ).onTelegramAuth = onTelegramAuth

    // Create the Telegram login button
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', 'ArnoldsBot')
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '12')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')

    const container = document.getElementById('telegram-login-button')
    if (container) {
      container.innerHTML = ''
      container.appendChild(script)
    }
  }

  onMount(() => {
    if (!isLinked) {
      // User is not linked, show login button
      initTelegramLogin()
    }
  })
</script>

{#if error}
  <MessageBox icon={IconWarning} onclose={() => (error = null)}>
    <h2>Error</h2>
    <p>{error}</p>
  </MessageBox>
{/if}

{#if loading}
  <div class="loading-container">
    <LoadingIndicator size={32} />
    <p class="tint--type-body-sans">Processing...</p>
  </div>
{:else if isLinked}
  <div class="already-linked">
    <h3 class="tint--type-body-sans-large">Account Linked</h3>
    <div>
      <p>Your Telegram account is linked with your Archive account.</p>
      <p>
        You can now search for posts directly in Telegram by writing <strong
          >@arnoldsbot</strong
        > followed by your search query.
      </p>
    </div>
    <div class="bot-actions">
      <Button variant="secondary" href="/settings">Back to Settings</Button>
    </div>
  </div>
{:else}
  <div class="linking-step">
    <h3 class="tint--type-body-sans-large">Link Your Account</h3>
    <p>
      Click the button below to authenticate with Telegram and link your
      accounts.
    </p>
    <Button variant="secondary" onclick={onTelegramAuth}>
      Link Telegram Account
    </Button>
    <div class="telegram-login-wrapper">
      <div id="telegram-login-button"></div>
    </div>
    <div class="info">
      <h3 class="tint--type">Why link your account?</h3>
      <p>
        When you link your Telegram account, you can search for posts directly
        in Telegram chats using <strong>@arnoldsbot</strong>.
      </p>
      <h3 class="tint--type">What does linking do?</h3>
      <p>
        Once you authenticated, Telegram will send your user ID to Archive. This
        allows Archive to recognize you when you use the bot.
      </p>
    </div>
  </div>
{/if}

<style lang="sass">
  .loading-container
    display: flex
    flex-direction: column
    gap: tint.$size-16
    justify-content: center
    align-items: center
    padding-block: tint.$size-32

  .already-linked, .linking-step
    display: flex
    flex-direction: column
    gap: tint.$size-16
    align-items: center
    text-align: center

  .info
    border: 1px solid var(--tint-card-border)
    text-align: left
    padding: tint.$size-32
    border-radius: tint.$card-radius
    max-width: 600px
    margin: 0 auto
    h3
      margin-block-end: tint.$size-8
    p:not(:last-of-type)
      margin-block-end: tint.$size-32
</style>
