<script lang="ts">
  import Button from 'tint/components/Button.svelte'

  interface Props {
    title: string
    cancelLabel?: string
    submitLabel?: string
    loading?: boolean
    submitDisabled?: boolean
    cancelDisabled?: boolean
    oncancel: () => void
    onsubmit: () => void
  }

  let {
    title,
    cancelLabel = 'Cancel',
    submitLabel = 'Save',
    loading = false,
    submitDisabled = false,
    cancelDisabled = false,
    oncancel,
    onsubmit,
  }: Props = $props()
</script>

<div class="modal-header">
  <h2 class="tint--type-title-serif-3">{title}</h2>
  <div class="action-buttons">
    <Button small onclick={oncancel} disabled={cancelDisabled || loading}>
      {cancelLabel}
    </Button>
    <Button
      small
      variant="primary"
      onclick={onsubmit}
      {loading}
      disabled={submitDisabled || loading}
    >
      {submitLabel}
    </Button>
  </div>
</div>

<style lang="sass">
  .modal-header
    box-sizing: border-box
    display: flex
    align-items: center
    justify-content: space-between
    flex-wrap: wrap
    gap: tint.$size-12

  .action-buttons
    display: flex
    gap: tint.$size-8
</style>
