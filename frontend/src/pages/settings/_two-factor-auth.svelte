<script lang="ts">
  import TextField from 'tint/components/TextField.svelte'
  import Button from 'tint/components/Button.svelte'
  import MessageBox from 'tint/components/MessageBox.svelte'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import IconDone from 'tint/icons/20-done.svg?raw'

  import { getSdk, type TotpStatus } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import { getOperationResultError } from '@src/graphql-errors'

  const sdk = getSdk(webClient)

  type Phase =
    | 'idle'
    | 'qr'
    | 'recovery'
    | 'disable'
    | 'regenerate'
    | 'regenerate-recovery'

  interface Props {
    totpStatus: Pick<TotpStatus, 'enabled' | 'recoveryCodesRemaining'> | null
  }

  let { totpStatus }: Props = $props()

  let phase = $state<Phase>('idle')
  let loading = $state(false)
  let globalError = $state<string | undefined>(undefined)

  // QR code step
  let qrCodeDataUrl = $state('')
  let totpSecret = $state('')
  let verifyCode = $state('')

  // Recovery codes
  let recoveryCodes = $state<string[]>([])

  // Disable / regenerate form
  let formPassword = $state('')
  let formCode = $state('')

  function resetErrors() {
    globalError = undefined
  }

  async function startSetup() {
    resetErrors()
    loading = true
    try {
      const res = await sdk.initTotp()
      const err = getOperationResultError(res)
      if (err) {
        globalError = err.message
        return
      }
      qrCodeDataUrl = res.data!.initTotp.qrCodeDataUrl
      totpSecret = res.data!.initTotp.secret
      verifyCode = ''
      phase = 'qr'
    } catch (e) {
      globalError = getOperationResultError(e)?.message || 'An error occurred'
    } finally {
      loading = false
    }
  }

  async function confirmSetup() {
    resetErrors()
    if (!verifyCode.trim()) {
      globalError = 'Please enter the verification code'
      return
    }
    loading = true
    try {
      const res = await sdk.confirmTotp({ code: verifyCode.trim() })
      const err = getOperationResultError(res)
      if (err) {
        globalError = err.message
        return
      }
      recoveryCodes = res.data!.confirmTotp.recoveryCodes
      phase = 'recovery'
      if (totpStatus) {
        totpStatus.enabled = true
        totpStatus.recoveryCodesRemaining = recoveryCodes.length
      }
    } catch (e) {
      globalError = getOperationResultError(e)?.message || 'An error occurred'
    } finally {
      loading = false
    }
  }

  async function cancelSetup() {
    resetErrors()
    loading = true
    try {
      await sdk.cancelTotpSetup()
      phase = 'idle'
      qrCodeDataUrl = ''
      totpSecret = ''
      verifyCode = ''
    } catch (e) {
      globalError = getOperationResultError(e)?.message || 'An error occurred'
    } finally {
      loading = false
    }
  }

  async function disableTotp() {
    resetErrors()
    if (!formPassword.trim() || !formCode.trim()) {
      globalError = 'Password and code are required'
      return
    }
    loading = true
    try {
      const res = await sdk.disableTotp({
        password: formPassword,
        code: formCode.trim(),
      })
      const err = getOperationResultError(res)
      if (err) {
        globalError = err.message
        return
      }
      if (totpStatus) {
        totpStatus.enabled = false
        totpStatus.recoveryCodesRemaining = 0
      }
      phase = 'idle'
      formPassword = ''
      formCode = ''
    } catch (e) {
      globalError = getOperationResultError(e)?.message || 'An error occurred'
    } finally {
      loading = false
    }
  }

  async function regenerateCodes() {
    resetErrors()
    if (!formPassword.trim() || !formCode.trim()) {
      globalError = 'Password and code are required'
      return
    }
    loading = true
    try {
      const res = await sdk.regenerateRecoveryCodes({
        password: formPassword,
        code: formCode.trim(),
      })
      const err = getOperationResultError(res)
      if (err) {
        globalError = err.message
        return
      }
      recoveryCodes = res.data!.regenerateRecoveryCodes.recoveryCodes
      phase = 'regenerate-recovery'
      if (totpStatus) {
        totpStatus.recoveryCodesRemaining = recoveryCodes.length
      }
      formPassword = ''
      formCode = ''
    } catch (e) {
      globalError = getOperationResultError(e)?.message || 'An error occurred'
    } finally {
      loading = false
    }
  }

  function copyRecoveryCodes() {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
  }

  function downloadRecoveryCodes() {
    const text = recoveryCodes.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  function doneWithRecoveryCodes() {
    recoveryCodes = []
    phase = 'idle'
  }
</script>

<h2 class="tint--type-body-serif-bold">Two-factor authentication</h2>

{#if totpStatus !== null && phase === 'idle'}
  <p class="tint--type-ui description">
    Add an extra layer of security to your account by requiring a code from your
    authenticator app when you sign in.
  </p>
{/if}

{#if totpStatus === null}
  <p class="tint--type-ui description">
    Two-factor authentication is not available on this server.
  </p>
{:else if phase === 'idle' && !totpStatus.enabled}
  {#if globalError}
    <MessageBox icon={IconWarning} onclose={resetErrors}>
      <p>{globalError}</p>
    </MessageBox>
  {/if}

  <div class="actions">
    <Button variant="primary" onclick={startSetup} {loading}>Enable 2FA</Button>
  </div>
{:else if phase === 'qr'}
  <p class="tint--type-ui description">
    Scan this QR code with your authenticator app, then enter the verification
    code below.
  </p>

  {#if globalError}
    <MessageBox icon={IconWarning} onclose={resetErrors}>
      <p>{globalError}</p>
    </MessageBox>
  {/if}

  <div class="qr-container">
    <img src={qrCodeDataUrl} alt="TOTP QR Code" class="qr-code" />
  </div>

  <div class="secret-display">
    <p class="tint--type-ui">Or enter this key manually:</p>
    <code class="secret-text">{totpSecret}</code>
  </div>

  <form
    onsubmit={(e) => {
      e.preventDefault()
      confirmSetup()
    }}
  >
    <TextField
      id="totp-verify"
      type="text"
      label="Verification code"
      autocomplete="one-time-code"
      inputmode="numeric"
      bind:value={verifyCode}
      disabled={loading}
    />
    <div class="form-actions">
      <Button
        small
        variant="secondary"
        onclick={cancelSetup}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button small submit={true} {loading}>Verify and enable</Button>
    </div>
  </form>
{:else if phase === 'recovery' || phase === 'regenerate-recovery'}
  <MessageBox icon={IconDone}>
    <p>
      {phase === 'recovery'
        ? 'Two-factor authentication has been enabled.'
        : 'Recovery codes have been regenerated.'}
    </p>
  </MessageBox>

  <p class="tint--type-ui description warning">
    Save these recovery codes in a safe place. They will not be shown again.
    Each code can only be used once.
  </p>

  <div class="recovery-codes">
    {#each recoveryCodes as code (code)}
      <code class="recovery-code">{code}</code>
    {/each}
  </div>

  <div class="form-actions">
    <Button variant="secondary" onclick={copyRecoveryCodes}>Copy</Button>
    <Button variant="secondary" onclick={downloadRecoveryCodes}>
      Download
    </Button>
    <Button variant="primary" onclick={doneWithRecoveryCodes}>Done</Button>
  </div>
{:else if phase === 'idle' && totpStatus.enabled}
  <MessageBox icon={IconDone}>
    <p>
      <span class="tint--type-ui-bold"
        >Two-factor authentication is enabled.</span
      >
      {totpStatus.recoveryCodesRemaining} recovery
      {totpStatus.recoveryCodesRemaining === 1 ? 'code' : 'codes'} remaining.
    </p>
  </MessageBox>
  {#if globalError}
    <MessageBox icon={IconWarning} onclose={resetErrors}>
      <p>{globalError}</p>
    </MessageBox>
  {/if}

  <div class="actions">
    <Button small variant="secondary" onclick={() => (phase = 'regenerate')}>
      Regenerate codes
    </Button>
    <Button small variant="secondary" onclick={() => (phase = 'disable')}>
      Disable
    </Button>
  </div>
{:else if phase === 'disable'}
  <p class="tint--type-ui description">
    Enter your password and a TOTP code to disable two-factor authentication.
  </p>

  {#if globalError}
    <MessageBox icon={IconWarning} onclose={resetErrors}>
      <p>{globalError}</p>
    </MessageBox>
  {/if}

  <form
    onsubmit={(e) => {
      e.preventDefault()
      disableTotp()
    }}
  >
    <TextField
      id="disable-password"
      type="password"
      label="Password"
      autocomplete="current-password"
      bind:value={formPassword}
      disabled={loading}
    />
    <TextField
      id="disable-code"
      type="text"
      label="TOTP code or recovery code"
      autocomplete="one-time-code"
      inputmode="numeric"
      bind:value={formCode}
      disabled={loading}
    />
    <div class="form-actions">
      <Button
        variant="secondary"
        onclick={() => {
          phase = 'idle'
          formPassword = ''
          formCode = ''
          resetErrors()
        }}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button submit={true} {loading}>Disable 2FA</Button>
    </div>
  </form>
{:else if phase === 'regenerate'}
  <p class="tint--type-ui description">
    Enter your password and a TOTP code to regenerate recovery codes. This will
    invalidate all existing recovery codes.
  </p>

  {#if globalError}
    <MessageBox icon={IconWarning} onclose={resetErrors}>
      <p>{globalError}</p>
    </MessageBox>
  {/if}

  <form
    onsubmit={(e) => {
      e.preventDefault()
      regenerateCodes()
    }}
  >
    <TextField
      id="regen-password"
      type="password"
      label="Password"
      autocomplete="current-password"
      bind:value={formPassword}
      disabled={loading}
    />
    <TextField
      id="regen-code"
      type="text"
      label="TOTP code"
      autocomplete="one-time-code"
      inputmode="numeric"
      bind:value={formCode}
      disabled={loading}
    />
    <div class="form-actions">
      <Button
        variant="secondary"
        onclick={() => {
          phase = 'idle'
          formPassword = ''
          formCode = ''
          resetErrors()
        }}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button submit={true} {loading}>Regenerate codes</Button>
    </div>
  </form>
{/if}

<style lang="sass">
  .description
    color: var(--tint-text-secondary)
    margin: 0
    margin-block-start: calc(-1 * tint.$size-8)

  .warning
    font-weight: 600
    color: var(--tint-text-warning, var(--tint-text-secondary))

  .actions
    display: flex
    gap: tint.$size-12
    justify-content: center
    flex-wrap: wrap

  .qr-container
    display: flex
    justify-content: center

  .qr-code
    width: 200px
    height: 200px
    border-radius: tint.$size-8
    background: white
    padding: tint.$size-8

  .secret-display
    display: flex
    flex-direction: column
    gap: tint.$size-4

  .secret-text
    font-family: monospace
    font-size: 0.85em
    word-break: break-all
    background: var(--tint-bg-secondary, var(--tint-bg))
    padding: tint.$size-8
    border-radius: tint.$size-4

  .recovery-codes
    display: grid
    grid-template-columns: repeat(2, 1fr)
    gap: tint.$size-4

  .recovery-code
    font-family: monospace
    font-size: 0.9em
    padding: tint.$size-4 tint.$size-8
    background: var(--tint-bg-secondary, var(--tint-bg))
    border-radius: tint.$size-4
    text-align: center

  form
    width: 100%
    display: flex
    flex-direction: column
    align-items: stretch
    gap: tint.$size-8

  .form-actions
    display: flex
    gap: tint.$size-12
    justify-content: center
    align-items: center
    flex-wrap: wrap
</style>
