<script lang="ts">
  import { onMount } from 'svelte'
  import SegmentedControl from 'tint/components/SegmentedControl.svelte'
  import LabeledToggleable from 'tint/components/LabeledToggleable.svelte'

  import {
    captionPrefs,
    type CaptionFontFamily,
    type CaptionFontSize,
    type CaptionBackground,
  } from '@src/utils/caption-preferences.svelte'

  const fontItems = [
    { value: 'sans-serif' as CaptionFontFamily, label: 'Sans-serif' },
    { value: 'serif' as CaptionFontFamily, label: 'Serif' },
    { value: 'monospace' as CaptionFontFamily, label: 'Mono' },
  ]

  const sizeItems = [
    { value: 'smaller' as CaptionFontSize, label: 'XS' },
    { value: 'small' as CaptionFontSize, label: 'S' },
    { value: 'default' as CaptionFontSize, label: 'M' },
    { value: 'large' as CaptionFontSize, label: 'L' },
    { value: 'larger' as CaptionFontSize, label: 'XL' },
  ]

  const bgItems = [
    { value: 'dark' as CaptionBackground, label: 'Light' },
    { value: 'darker' as CaptionBackground, label: 'Dark' },
    { value: 'solid' as CaptionBackground, label: 'Solid' },
  ]

  let ready = $state(false)
  let fontFamily = $state<CaptionFontFamily | undefined>(undefined)
  let fontSize = $state<CaptionFontSize | undefined>(undefined)
  let backgroundColor = $state<CaptionBackground | undefined>(undefined)
  let showVoiceLabels = $state(false)

  onMount(() => {
    fontFamily = captionPrefs.value.fontFamily
    fontSize = captionPrefs.value.fontSize
    backgroundColor = captionPrefs.value.backgroundColor
    showVoiceLabels = captionPrefs.value.showVoiceLabels
    ready = true
  })

  function update() {
    captionPrefs.value = {
      ...captionPrefs.value,
      fontFamily: fontFamily!,
      fontSize: fontSize!,
      backgroundColor: backgroundColor!,
      showVoiceLabels,
    }
  }
</script>

<div class="controls">
  <div class="control">
    <span class="tint--type-input-small" id="caption-font-label">Font</span>
    <SegmentedControl
      id="caption-font"
      aria-labelledby="caption-font-label"
      small
      disabled={!ready}
      items={fontItems}
      bind:value={fontFamily}
      onchange={() => update()}
    />
  </div>

  <div class="control">
    <span class="tint--type-input-small" id="caption-size-label">Size</span>
    <SegmentedControl
      id="caption-size"
      aria-labelledby="caption-size-label"
      small
      disabled={!ready}
      items={sizeItems}
      bind:value={fontSize}
      onchange={() => update()}
    />
  </div>

  <div class="control">
    <span class="tint--type-input-small" id="caption-bg-label">Background</span>
    <SegmentedControl
      id="caption-bg"
      aria-labelledby="caption-bg-label"
      small
      disabled={!ready}
      items={bgItems}
      bind:value={backgroundColor}
      onchange={() => update()}
    />
  </div>

  <LabeledToggleable
    id="caption-voice-labels"
    type="switch"
    disabled={!ready}
    checked={showVoiceLabels}
    onchange={() => {
      showVoiceLabels = !showVoiceLabels
      update()
    }}
  >
    Show speaker names
  </LabeledToggleable>
</div>

<style lang="sass">
.controls
  display: flex
  flex-direction: column
  gap: tint.$size-12
  width: 100%

.control
  display: flex
  flex-direction: column
  gap: tint.$size-4
</style>
