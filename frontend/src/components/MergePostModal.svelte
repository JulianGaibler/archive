<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import Modal from 'tint/components/Modal.svelte'
  import Autocomplete from 'tint/components/Autocomplete.svelte'
  import LabeledToggleable from 'tint/components/LabeledToggleable.svelte'
  import { getSdk } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'

  type PostItem = {
    id: string
    title: string
  }

  interface Props {
    open: boolean
    loading?: boolean
    currentPostId?: string
    onCancel: () => void
    onSubmit: (targetPostId: string, secondaryOption: boolean) => void
    mode?: 'merge' | 'move'
  }

  let {
    open,
    loading = false,
    currentPostId,
    onCancel,
    onSubmit,
    mode = 'merge',
  }: Props = $props()

  // Derived values for dynamic copy based on mode
  const modalTitle = $derived(mode === 'move' ? 'Move Item' : 'Merge Post')
  const modalDescription = $derived(
    mode === 'move'
      ? 'Select a target post to move this item to. This action cannot be undone.'
      : 'Select a target post to merge this post into. This action cannot be undone.',
  )
  const autocompleteLabel = $derived(
    mode === 'move' ? 'Target post' : 'Target post',
  )
  const autocompleteHelperText = $derived(
    mode === 'move'
      ? 'Search for a post to move the item to'
      : 'Search for a post to merge into',
  )
  const checkboxLabel = $derived(
    mode === 'move'
      ? 'Keep post even if empty after moving'
      : 'Merge keywords from both posts',
  )
  const submitButtonText = $derived(
    mode === 'move' ? 'Move Item' : 'Merge Post',
  )

  let selectedPostId = $state<string | undefined>(undefined)
  let secondaryOption = $state(false)

  let posts = $state<PostItem[]>([])
  let convertedPosts = $derived(
    posts.map((post) => ({
      value: post.id,
      label: post.title,
    })),
  )

  const sdk = getSdk(webClient)

  async function searchPosts(search: string) {
    if (!search.trim()) {
      return { items: convertedPosts, allowAdd: false }
    }

    try {
      const result = await sdk.PostsTextOnly({ byContent: search })

      const searchResults: PostItem[] = (result.data.posts?.edges || [])
        .map((edge) => {
          if (edge?.node) {
            return {
              id: edge.node.id,
              title: edge.node.title,
            }
          }
          return null
        })
        .filter((item): item is PostItem => item !== null)

      // Merge new search results with existing posts (avoid duplicates)
      const existingIds = new Set(posts.map((post) => post.id))
      const newPosts = searchResults.filter((post) => !existingIds.has(post.id))
      posts = [...posts, ...newPosts]

      const items = searchResults
        .map((post) => ({
          value: post.id,
          label: post.title,
        }))
        .filter(
          (item) => item.value !== currentPostId, // Exclude current post if it exists
        )

      return {
        items,
        allowAdd: false,
      }
    } catch (error) {
      console.error('Error searching posts:', error)
      return { items: convertedPosts, allowAdd: false }
    }
  }

  function handleSubmit() {
    if (!selectedPostId) return
    onSubmit(selectedPostId, secondaryOption)
  }

  function handleCancel() {
    // Reset form state
    selectedPostId = undefined
    secondaryOption = false
    onCancel()
  }

  // Reset form when modal opens/closes
  $effect(() => {
    if (!open) {
      selectedPostId = undefined
      secondaryOption = false
    }
  })

  // Ensure selected post is always in the posts array
  $effect(() => {
    if (selectedPostId && !posts.find((p) => p.id === selectedPostId)) {
      // Fetch post details for the selected post
      fetchPostDetails(selectedPostId)
    }
  })

  async function fetchPostDetails(postId: string) {
    try {
      // In a real implementation, you'd want a specific query to get post details by ID
      // For now, we'll use the search with a placeholder
      const placeholderPost: PostItem = {
        id: postId,
        title: `Post ${postId}`, // Placeholder title
      }
      posts = [placeholderPost, ...posts]
    } catch (error) {
      console.error('Error fetching post details:', error)
    }
  }
</script>

<Modal {open} onclose={handleCancel}>
  <div class="merge-post-modal">
    <h2 class="tint--type-title-serif-3">{modalTitle}</h2>
    <p class="tint--type-body">
      {modalDescription}
    </p>

    <div class="form-section">
      <Autocomplete
        id="target-post"
        label={autocompleteLabel}
        helperText={autocompleteHelperText}
        bind:value={selectedPostId}
        items={convertedPosts}
        dynamicItems={searchPosts}
      />
      <LabeledToggleable
        bind:checked={secondaryOption}
        id="secondary-option"
        type="checkbox"
        label={checkboxLabel}
      />
    </div>

    <div class="actions">
      <Button onclick={handleCancel} disabled={loading}>Cancel</Button>
      <Button
        onclick={handleSubmit}
        variant="primary"
        {loading}
        disabled={loading || !selectedPostId}
      >
        {submitButtonText}
      </Button>
    </div>
  </div>
</Modal>

<style lang="sass">
.merge-post-modal
  box-sizing: border-box
  width: min(500px, calc(100vw - tint.$size-32))
  display: flex
  flex-direction: column
  padding: tint.$size-32

  h2
    margin: 0

  p
    margin: 0
    color: var(--tint-text-secondary)

.actions
  display: flex
  gap: tint.$size-12
  justify-content: flex-end
  border-block-start: 1px solid var(--tint-border)


.form-section
  display: flex
  flex-direction: column
  gap: tint.$size-16
  margin-block: tint.$size-24
</style>
