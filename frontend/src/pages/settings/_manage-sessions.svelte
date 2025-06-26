<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import { formatDateTime, getOperationResultError } from '@src/utils'

  import { getSdk, type SettingsQuery } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'

  const sdk = getSdk(webClient)

  interface Props {
    sessions: SettingsQuery['userSessions']
  }

  let { sessions }: Props = $props()

  let loading = $state(false)
  let globalError: string | undefined = $state(undefined)

  function resetErrors() {
    globalError = undefined
  }

  function revokeSession(sessionId: string) {
    resetErrors()

    loading = true

    sdk
      .revokeSession({ id: sessionId })
      .finally(() => {
        loading = false
      })
      .catch((err) => {
        globalError = getOperationResultError(err)
      })
      .then((res) => {
        globalError = getOperationResultError(res)
        if (!globalError) {
          if (sessions.find((s) => s.id === sessionId)?.current) {
            window.location.href = '/login'
            return
          }
          sessions = sessions.filter((session) => session.id !== sessionId)
        }
      })
  }
</script>

<h2 class="tint--type-body-serif-bold">Sessions</h2>

{#if globalError}
  <MessageBox icon={IconWarning} onclose={resetErrors}>
    <h2>Error</h2>
    <p>{globalError}</p>
  </MessageBox>
{/if}

<ul>
  {#each sessions as session (session.id)}
    <li>
      <p class="tint--type-ui-bold">
        <span class="label tint--type-ui-small">Last device:</span><br />
        {session.userAgent}
      </p>
      <p>
        <span class="label tint--type-ui-small">Last seen:</span><br />
        {session.latestIp}<br />
        <time
          datetime={new Date(session.updatedAt).toISOString()}
          title={new Date(session.updatedAt).toISOString()}
          >{formatDateTime(session.updatedAt)}</time
        >
      </p>
      <p>
        <span class="label tint--type-ui-small">First seen:</span><br />
        {session.firstIp}<br />
        <time
          datetime={new Date(session.createdAt).toISOString()}
          title={new Date(session.createdAt).toISOString()}
          >{formatDateTime(session.createdAt)}</time
        >
      </p>
      <div class="actions">
        <Button
          disabled={loading}
          small
          onclick={() => revokeSession(session.id)}>Revoke session</Button
        >
      </div>
      {#if session.current}
        <p class="current-badge">
          <span class="tint--type-ui-bold">Current session</span> You will get logged
          out if you revoke this session.
        </p>
      {/if}
    </li>
  {/each}
</ul>

<style lang="sass">
ul
  display: flex
  flex-direction: column
  border: 1px solid var(--tint-input-bg)
  border-radius: tint.$size-12

li
  display: flex
  flex-direction: column
  gap: tint.$size-8
  padding: tint.$size-16
  &:not(:last-child)
    border-bottom: 1px solid var(--tint-input-bg)

.label
  color: var(--tint-text-secondary)

.actions
  display: flex
  margin-block-start: tint.$size-4
  justify-content: center

.current-badge
  color: var(--tint-text-secondary)
  display: inline-block
  text-align: center


</style>
