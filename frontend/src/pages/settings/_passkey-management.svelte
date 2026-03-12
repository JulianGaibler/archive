<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import TextField from 'tint/components/TextField.svelte'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import Modal from 'tint/components/Modal.svelte'
  import Dialog, { type OpenDialog } from 'tint/components/Dialog.svelte'
  import { tooltip } from 'tint/actions/tooltip'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import IconDone from 'tint/icons/20-done.svg?raw'
  import IconEdit from 'tint/icons/20-edit.svg?raw'
  import IconTrash from 'tint/icons/20-trash.svg?raw'

  import { getSdk, type Passkey } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import { getOperationResultError } from '@src/graphql-errors'
  import { startRegistration } from '@simplewebauthn/browser'

  const sdk = getSdk(webClient)

  interface Props {
    passkeys: Pick<
      Passkey,
      'id' | 'name' | 'deviceType' | 'backedUp' | 'transports' | 'createdAt'
    >[]
    totpEnabled: boolean
  }

  let { passkeys: initialPasskeys, totpEnabled }: Props = $props()

  let passkeys = $state([...initialPasskeys])
  let loading = $state(false)
  let globalError = $state<string | undefined>(undefined)
  let successMessage = $state<string | undefined>(undefined)

  // Rename modal state
  let renameModalOpen = $state(false)
  let renameTargetId = $state<string | null>(null)
  let renameValue = $state('')
  let renameError = $state<string | undefined>(undefined)

  // Delete dialog
  let openDeleteDialog = $state<OpenDialog | undefined>(undefined)

  // TOTP bypass acknowledgement dialog
  let openTotpWarningDialog = $state<OpenDialog | undefined>(undefined)
  let totpAcknowledged = $state(false)

  function resetErrors() {
    globalError = undefined
    successMessage = undefined
  }

  async function handleAddPasskey() {
    if (totpEnabled && !totpAcknowledged) {
      const accepted = await openTotpWarningDialog?.({
        heading: 'Passkeys bypass two-factor authentication',
        actionLabel: 'I understand',
        children:
          'Signing in with a passkey will skip your second factor verification step. Only register passkeys on devices you trust.',
      })
      if (!accepted) return
      totpAcknowledged = true
    }
    await addPasskey()
  }

  async function addPasskey() {
    resetErrors()
    loading = true
    try {
      const name = `Passkey ${passkeys.length + 1}`

      const genRes = await sdk.generatePasskeyRegistrationOptions({ name })
      const genErr = getOperationResultError(genRes)
      if (genErr) {
        globalError = genErr.message
        return
      }

      const optionsJSON = JSON.parse(
        genRes.data!.generatePasskeyRegistrationOptions,
      )

      let attResp
      try {
        attResp = await startRegistration({ optionsJSON })
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'NotAllowedError') {
          return // User cancelled
        }
        throw err
      }

      const verifyRes = await sdk.verifyPasskeyRegistration({
        response: JSON.stringify(attResp),
        name,
      })
      const verifyErr = getOperationResultError(verifyRes)
      if (verifyErr) {
        globalError = verifyErr.message
        return
      }

      // Refresh passkey list
      const settingsRes = await sdk.settings()
      if (settingsRes.data?.me?.passkeys) {
        passkeys = [...settingsRes.data.me.passkeys]
      }
      successMessage = 'Passkey added successfully.'
    } catch (e) {
      globalError =
        getOperationResultError(e)?.message || 'Failed to add passkey.'
    } finally {
      loading = false
    }
  }

  async function confirmDelete(pk: (typeof passkeys)[0]) {
    const confirmed = await openDeleteDialog?.({
      variant: 'transaction',
      heading: 'Remove passkey?',
      children: `The passkey "${pk.name}" will be permanently removed. You won't be able to sign in with it anymore.`,
      actionLabel: 'Remove',
    })
    if (!confirmed) return
    await deletePasskey(pk.id)
  }

  async function deletePasskey(passkeyId: string) {
    resetErrors()
    loading = true
    try {
      const res = await sdk.deletePasskey({ passkeyId })
      const err = getOperationResultError(res)
      if (err) {
        globalError = err.message
        return
      }
      passkeys = passkeys.filter((pk) => pk.id !== passkeyId)
      successMessage = 'Passkey removed.'
    } catch (e) {
      globalError =
        getOperationResultError(e)?.message || 'Failed to delete passkey.'
    } finally {
      loading = false
    }
  }

  function openRenameModal(pk: (typeof passkeys)[0]) {
    renameTargetId = pk.id
    renameValue = pk.name
    renameError = undefined
    renameModalOpen = true
    resetErrors()
  }

  async function submitRename() {
    renameError = undefined
    if (!renameValue.trim()) {
      renameError = 'Name cannot be empty'
      return
    }
    if (!renameTargetId) return
    resetErrors()
    loading = true
    try {
      const res = await sdk.renamePasskey({
        passkeyId: renameTargetId,
        name: renameValue.trim(),
      })
      const err = getOperationResultError(res)
      if (err) {
        globalError = err.message
        return
      }
      const idx = passkeys.findIndex((pk) => pk.id === renameTargetId)
      if (idx !== -1) {
        passkeys[idx] = { ...passkeys[idx], name: renameValue.trim() }
      }
      renameModalOpen = false
      renameTargetId = null
      renameValue = ''
    } catch (e) {
      globalError =
        getOperationResultError(e)?.message || 'Failed to rename passkey.'
    } finally {
      loading = false
    }
  }

  function deviceTooltipText(pk: (typeof passkeys)[0]): string {
    if (pk.deviceType === 'multiDevice') {
      return pk.backedUp
        ? 'Synced passkey (backed up to cloud)'
        : 'Synced passkey (not yet backed up)'
    }
    return 'Device-bound passkey (e.g. security key)'
  }

  function formatDate(timestamp: unknown): string {
    const ts =
      typeof timestamp === 'string' ? parseInt(timestamp) : Number(timestamp)
    return new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
</script>

{#if globalError}
  <MessageBox icon={IconWarning} onclose={() => (globalError = undefined)}>
    <p>{globalError}</p>
  </MessageBox>
{/if}

{#if successMessage}
  <MessageBox icon={IconDone} onclose={() => (successMessage = undefined)}>
    <p>{successMessage}</p>
  </MessageBox>
{/if}

{#if passkeys.length > 0}
  <ul>
    {#each passkeys as pk (pk.id)}
      <li>
        <div class="passkey-row">
          <div class="passkey-info">
            <span class="tint--type-ui-bold">{pk.name}</span>
            <span class="tint--type-ui-small meta">
              Added {formatDate(pk.createdAt)}
              <span class="device-type" use:tooltip={deviceTooltipText(pk)}>
                &middot; {pk.deviceType === 'multiDevice'
                  ? 'Synced'
                  : 'Device-bound'}
              </span>
            </span>
          </div>
          <div class="actions">
            <Button
              icon
              small
              tooltip="Rename"
              onclick={() => openRenameModal(pk)}
              disabled={loading}
            >
              {@html IconEdit}
            </Button>
            <Button
              icon
              small
              tooltip="Remove"
              onclick={() => confirmDelete(pk)}
              disabled={loading}
            >
              {@html IconTrash}
            </Button>
          </div>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<div class="add-action">
  <Button small variant="primary" onclick={handleAddPasskey} {loading}>
    {passkeys.length === 0 ? 'Add a passkey' : 'Add another passkey'}
  </Button>
</div>

<Modal bind:open={renameModalOpen}>
  <form
    class="rename-modal"
    onsubmit={(e) => {
      e.preventDefault()
      submitRename()
    }}
  >
    <h2 class="tint--type-title-sans-3">Rename passkey</h2>
    <TextField
      id="rename-passkey"
      type="text"
      label="Name"
      bind:value={renameValue}
      error={renameError}
      disabled={loading}
      oninput={() => (renameError = undefined)}
    />
    <div class="rename-modal-actions">
      <Button
        variant="secondary"
        onclick={() => (renameModalOpen = false)}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        submit={true}
        disabled={!renameValue.trim()}
        {loading}
      >
        Save
      </Button>
    </div>
  </form>
</Modal>

<Dialog bind:openDialog={openDeleteDialog} />
<Dialog bind:openDialog={openTotpWarningDialog} />

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

  .passkey-row
    display: flex
    align-items: center
    justify-content: space-between
    gap: tint.$size-12
    padding: tint.$size-12 tint.$size-16

  .passkey-info
    display: flex
    flex-direction: column
    gap: tint.$size-2
    min-width: 0

  .meta
    color: var(--tint-text-secondary)

  .device-type
    cursor: help
    text-decoration-line: underline
    text-decoration-style: dotted
    text-underline-offset: 2px

  .actions
    display: flex
    gap: tint.$size-4

  .add-action
    display: flex
    gap: tint.$size-12
    justify-content: center

  .rename-modal
    display: flex
    flex-direction: column
    gap: tint.$size-16
    padding: tint.$size-24
    max-width: 448px

  .rename-modal-actions
    display: flex
    gap: tint.$size-8
    justify-content: flex-end
</style>
