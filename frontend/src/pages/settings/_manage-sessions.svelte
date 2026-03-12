<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import Dialog, { type OpenDialog } from 'tint/components/Dialog.svelte'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import IconTrash from 'tint/icons/20-trash.svg?raw'
  import { formatDateTime } from '@src/utils'

  import { getSdk, type SettingsQuery } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import { getOperationResultError } from '@src/graphql-errors'

  const sdk = getSdk(webClient)

  interface Props {
    sessions: SettingsQuery['userSessions']
  }

  let { sessions }: Props = $props()

  let loading = $state(false)
  let globalError: string | undefined = $state(undefined)

  let openRevokeDialog = $state<OpenDialog | undefined>(undefined)

  function resetErrors() {
    globalError = undefined
  }

  async function confirmRevoke(session: (typeof sessions)[0]) {
    const isCurrent = session.current
    const confirmed = await openRevokeDialog?.({
      variant: 'transaction',
      heading: 'Revoke session?',
      children: isCurrent
        ? 'This is your current session. Revoking it will log you out immediately.'
        : `This will log out the session from "${session.userAgent}".`,
      actionLabel: 'Log out',
    })
    if (!confirmed) return
    revokeSession(session.id)
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
        globalError = getOperationResultError(err)?.message
      })
      .then((res) => {
        globalError = getOperationResultError(res)?.message
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

{#if globalError}
  <MessageBox icon={IconWarning} onclose={resetErrors}>
    <p>{globalError}</p>
  </MessageBox>
{/if}

<ul>
  {#each sessions as session (session.id)}
    <li>
      <div class="session-row">
        <div class="session-info">
          <p class="tint--type-ui-bold device">{session.userAgent}</p>
          <p class="tint--type-ui-small meta">
            <span class="ip">{session.latestIp}</span> &middot;
            <time
              datetime={new Date(session.updatedAt).toISOString()}
              title={new Date(session.updatedAt).toISOString()}
              >{formatDateTime(session.updatedAt)}</time
            >
          </p>
          {#if session.current}
            <span class="current-tag tint--type-ui-small">Current session</span>
          {/if}
        </div>
        <Button
          icon
          small
          tooltip="Revoke session"
          disabled={loading}
          onclick={() => confirmRevoke(session)}
        >
          {@html IconTrash}
        </Button>
      </div>
    </li>
  {/each}
</ul>

<Dialog bind:openDialog={openRevokeDialog} />

<style lang="sass">
ul
  display: flex
  flex-direction: column
  border: 1px solid var(--tint-input-bg)
  border-radius: tint.$size-12
  list-style: none
  margin: 0
  padding: 0

li
  &:not(:last-child)
    border-block-end: 1px solid var(--tint-input-bg)

.session-row
  display: flex
  align-items: center
  justify-content: space-between
  gap: tint.$size-12
  padding: tint.$size-12 tint.$size-16

.session-info
  display: flex
  flex-direction: column
  gap: tint.$size-2
  min-width: 0

.device
  margin: 0

.meta
  color: var(--tint-text-secondary)
  margin: 0

.ip
  overflow-wrap: break-word
  word-break: break-all

.current-tag
  color: var(--tint-text-secondary)
  font-weight: 600
</style>
