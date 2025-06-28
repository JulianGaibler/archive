<script lang="ts" module>
  export interface TelegramUser {
    id: number
    first_name?: string
    last_name?: string
    username?: string
    photo_url?: string
    auth_date: number
    hash: string
  }
</script>

<script lang="ts">
  import { getSdk, type MeQuery } from '../generated/graphql'
  import type { Action } from 'svelte/action'
  import { webClient } from '../gql-client'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import Button from 'tint/components/Button.svelte'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'
  import { getOperationResultError } from '@src/utils'
  import UserPicture from './UserPicture.svelte'
  import IconHeart from 'tint/icons/20-heart-fill.svg?raw'

  interface Props {
    me: NonNullable<MeQuery['me']>
    telegramUserData: TelegramUser | null
    authUrl: string
  }

  let { me, telegramUserData, authUrl }: Props = $props()

  const sdk = getSdk(webClient)
  let isLinked = $state(me.linkedTelegram)
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

  export const telegramLogin: Action<HTMLElement, string> = (node, authUrl) => {
    function createWidget() {
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.setAttribute('data-telegram-login', 'ArnoldsBot')
      script.setAttribute('data-size', 'large')
      script.setAttribute('data-radius', '12')
      script.setAttribute('data-auth-url', authUrl)
      script.setAttribute('data-request-access', 'write')
      node.innerHTML = ''
      node.appendChild(script)
    }

    createWidget()

    return {
      update(newAuthUrl: string) {
        if (newAuthUrl !== authUrl) {
          authUrl = newAuthUrl
          createWidget()
        }
      },
      destroy() {
        node.innerHTML = ''
      },
    }
  }
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
{:else if telegramUserData}
  <div class="confirm-linking">
    <h3 class="tint--type-body-sans-large">Confirm Account Linking</h3>

    <div class="info-container">
      <div class="user-info tint--tinted">
        {#if telegramUserData.photo_url}
          <img
            src={telegramUserData.photo_url}
            alt="Profile"
            class="profile-photo"
          />
        {/if}
        <div class="user-details">
          <h4>
            {telegramUserData.first_name || ''}
            {telegramUserData.last_name || ''}
          </h4>
          {#if telegramUserData.username}
            <p class="username">@{telegramUserData.username}</p>
          {/if}
        </div>
      </div>
      {@html IconHeart}
      <div class="user-info tint--tinted">
        <UserPicture user={me} size="64" />
        <div class="user-details">
          <h4>
            {me.name || ''}
          </h4>
          <p class="username">@{me.username}</p>
        </div>
      </div>
    </div>

    <div class="actions">
      <Button
        variant="primary"
        onclick={() => onTelegramAuth(telegramUserData)}
      >
        Link this Account
      </Button>
      <Button variant="secondary" href="/settings">Cancel</Button>
    </div>

    <p class="note">
      Data will be authenticated before linking and is valid for 5 minutes.
    </p>

    <div class="info">
      <h3 class="tint--type">What happens next?</h3>
      <p>
        Once you confirm, your Telegram account will be linked to Archive.
        You'll be able to search for posts directly in Telegram using <strong
          >@arnoldsbot</strong
        >.
      </p>
    </div>
  </div>
{:else}
  <div class="linking-step">
    <h3 class="tint--type-body-sans-large">Link Your Account</h3>
    <p>
      Click the button below to authenticate with Telegram and link your
      accounts.
    </p>
    <div class="telegram-login-wrapper">
      <div id="telegram-login-button" use:telegramLogin={authUrl}></div>
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

  .already-linked, .linking-step, .confirm-linking
    display: flex
    flex-direction: column
    gap: tint.$size-16
    align-items: center
    text-align: center

  .info-container
    display: grid
    gap: tint.$size-12
    // container hearth container
    grid-template-columns: 1fr auto 1fr
    align-items: center
    @media (max-width: tint.$breakpoint-sm)
      grid-template-columns: 1fr
      justify-items: center
      .user-info
        width: 100%
  .user-info
    display: flex
    align-items: center
    gap: tint.$size-16
    padding: tint.$size-24
    border-radius: tint.$card-radius
    background: var(--tint-bg)
    text-align: left
    .profile-photo
      width: 64px
      height: 64px
      border-radius: 50%
      object-fit: cover
    .user-details
      h4
        margin: 0 0 tint.$size-4 0
        font-weight: 600
      .username
        margin: 0 0 tint.$size-4 0
        color: var(--tint-text-secondary)
        font-size: 0.9em

  .actions
    display: flex
    gap: tint.$size-12
    flex-wrap: wrap
    justify-content: center

  .info
    border: 1px solid var(--tint-card-border)
    text-align: left
    padding: tint.$size-32
    border-radius: tint.$card-radius
    max-width: 600px
    margin: 0 auto
    margin-block-start: tint.$size-32
    h3
      margin-block-end: tint.$size-8
    p:not(:last-of-type)
      margin-block-end: tint.$size-32

  .note
    color: var(--tint-text-secondary)
</style>
