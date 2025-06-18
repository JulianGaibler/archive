import { get, writable } from 'svelte/store'
import {
  Language,
  type getSdk,
  type PostQuery,
  TaskStatus,
  TaskUpdatesDocument,
  type TaskUpdatesSubscription,
} from '@src/generated/graphql'
import { print } from 'graphql'
import { getOperationResultError } from '@src/utils'
import type { OpenDialog } from 'tint/components/Dialog.svelte'
import { webSubscriptionsClient } from '@src/gql-client'
import {
  createUploadController,
  UPLOAD_ID_HEADER,
  type UploadController,
} from './custom-fetch'

type PostItemType = NonNullable<PostQuery['node']> & { __typename: 'Post' }

interface UpdateValue<T> {
  value: T
  error?: string
}

export type UploadItem = {
  id: string
  file: File
  keywords: UpdateValue<string[]>
  description: UpdateValue<string>
  caption: UpdateValue<string> | undefined
  language: UpdateValue<Language>
}

export type PostUpdate = {
  title: UpdateValue<string>
  language: UpdateValue<Language>
  keywords: UpdateValue<string[]>
  items: Record<
    string,
    {
      description: UpdateValue<string>
      caption: UpdateValue<string> | undefined
      position: UpdateValue<number>
    }
  >
  uploadItems: Record<string, UploadItem>
  uploadController?: UploadController
  isUploading: boolean
}

export function createEditManager(
  sdk: ReturnType<typeof getSdk>,
  postData: PostItemType | undefined,
  isNewPost: boolean = false,
) {
  const post = writable<PostItemType | undefined>(postData)
  const data = writable<PostUpdate | undefined>(undefined)
  const loading = writable(false)
  const isInNewPostMode = writable(isNewPost) // Track new-post mode as reactive store
  let openDialog: OpenDialog | undefined = undefined
  let subscriptionUnsubscribe: (() => void) | undefined = undefined

  // Function to get processing items that need to be monitored
  const getProcessingItemIds = (postData: PostItemType): string[] => {
    const processingIds: string[] = []

    postData.items.edges?.forEach((edge) => {
      const item = edge?.node
      if (item && item.__typename === 'ProcessingItem') {
        // Monitor items that are not FAILED or DONE
        if (
          item.taskStatus !== TaskStatus.Failed &&
          item.taskStatus !== TaskStatus.Done
        ) {
          processingIds.push(item.id)
        }
      }
    })

    return processingIds
  }

  // Function to start subscription for processing items
  const startProcessingSubscription = () => {
    const currentPost = get(post)
    if (!currentPost) return

    const processingIds = getProcessingItemIds(currentPost)

    if (processingIds.length === 0 || !webSubscriptionsClient) {
      return
    }

    // Clean up existing subscription
    if (subscriptionUnsubscribe) {
      subscriptionUnsubscribe()
      subscriptionUnsubscribe = undefined
    }

    console.log('Starting subscription for processing items:', processingIds)

    // Set up new subscription
    const subscription = webSubscriptionsClient.iterate({
      query: print(TaskUpdatesDocument),
      variables: { ids: processingIds },
    })

    // Process subscription results
    const processSubscription = async () => {
      console.log('Processing subscription for item updates...')
      try {
        for await (const result of subscription) {
          console.log('Received update for item:', result.data)
          if (result.errors) {
            console.error('Subscription errors:', result.errors)
          }
          const subscriptionData = result.data as
            | TaskUpdatesSubscription
            | undefined
          if (subscriptionData?.taskUpdates?.item) {
            const updatedItem = subscriptionData.taskUpdates.item

            // Update the post data with the new item information
            post.update((currentPost) => {
              if (!currentPost) return currentPost

              const newPost = { ...currentPost }
              newPost.items = { ...newPost.items }

              if (newPost.items.edges) {
                newPost.items.edges = newPost.items.edges.map((edge) => {
                  if (edge?.node?.id === updatedItem.id) {
                    return {
                      ...edge,
                      node: updatedItem,
                    }
                  }
                  return edge
                })
              }

              return newPost
            })

            // Check if we should stop the subscription
            const updatedPost = get(post)
            if (updatedPost) {
              const remainingProcessingIds = getProcessingItemIds(updatedPost)

              if (remainingProcessingIds.length === 0) {
                // No more processing items, stop subscription
                if (subscriptionUnsubscribe) {
                  subscriptionUnsubscribe()
                  subscriptionUnsubscribe = undefined
                }
                break
              }
            }
          }
        }
      } catch (error) {
        console.error('Subscription error:', error)
        // Clean up on error
        if (subscriptionUnsubscribe) {
          subscriptionUnsubscribe()
          subscriptionUnsubscribe = undefined
        }
      }
    }

    // Start processing subscription in the background
    processSubscription()

    // Create unsubscribe function
    subscriptionUnsubscribe = () => {
      subscription.return?.()
    }
  }

  // Start subscription on initialization if there are processing items and it's not a new post
  if (!get(isInNewPostMode)) {
    startProcessingSubscription()
  }

  const cancelEdit = () => {
    // Cancel any ongoing upload
    const $data = get(data)
    if ($data?.uploadController && $data.isUploading) {
      $data.uploadController.abort()
    }

    // Clean up subscription
    if (subscriptionUnsubscribe) {
      subscriptionUnsubscribe()
      subscriptionUnsubscribe = undefined
    }

    // For new posts, redirect to home instead of just canceling
    if (get(isInNewPostMode)) {
      window.location.href = '/'
      return
    }

    data.set(undefined)
    loading.set(false)
  }

  const setOpenDialog = (dialog: OpenDialog | undefined) => {
    openDialog = dialog
  }

  const createUpdateValue = <T>(value: T): UpdateValue<T> => ({
    value,
    error: undefined,
  })

  const startEdit = () => {
    const postObject = get(post)

    if (get(isInNewPostMode)) {
      // For new posts, start with empty/default values
      data.set({
        title: createUpdateValue(''),
        language: createUpdateValue(Language.English),
        keywords: createUpdateValue([]),
        items: {},
        uploadItems: {},
        uploadController: undefined,
        isUploading: false,
      })
    } else {
      // For existing posts, use current values
      if (!postObject) return

      data.set({
        title: createUpdateValue(postObject.title),
        language: createUpdateValue(postObject.language),
        keywords: createUpdateValue(
          postObject.keywords.map((keyword) => keyword.id),
        ),
        items:
          postObject.items.edges?.reduce(
            (acc, item) => {
              const node = item?.node
              if (node) {
                acc[node.id] = {
                  description: createUpdateValue(node.description),
                  caption:
                    'caption' in node
                      ? createUpdateValue(node.caption)
                      : undefined,
                  position: createUpdateValue(node.position),
                }
              }
              return acc
            },
            {} as PostUpdate['items'],
          ) || {},
        uploadItems: {},
        uploadController: undefined,
        isUploading: false,
      })
    }
  }

  const addFile = (file: File) => {
    if (get(loading)) return
    const type = file.type.split('/')[0]
    if (type !== 'image' && type !== 'video') {
      openDialog?.({
        heading: 'Unsupported file type',
        children: `The file type${file.type && ` "${file.type}"`} is not supported for upload.`,
      })
      return
    }
    data.update((current) => {
      if (!current) return current
      current.uploadItems[file.name] = {
        id: file.name,
        file,
        keywords: createUpdateValue([]),
        description: createUpdateValue(''),
        caption: createUpdateValue(''),
        language: createUpdateValue(Language.English),
      }
      return current
    })
  }

  const cancelUpload = () => {
    const $data = get(data)
    if ($data?.uploadController && $data.isUploading) {
      $data.uploadController.abort()
      data.update((current) => {
        if (current) {
          current.isUploading = false
          current.uploadController = undefined
        }
        return current
      })
    }
  }

  const submitEdit = async () => {
    const $data = get(data)
    if (!$data) return

    const hasNewFiles = Object.keys($data.uploadItems || {}).length > 0

    // For new posts, require at least one file
    if (get(isInNewPostMode) && !hasNewFiles) {
      openDialog?.({
        heading: 'No items to upload',
        children: 'Please add at least one file before creating a post.',
      })
      return
    }

    loading.set(true)

    // Helper function to handle errors and cleanup
    const handleError = (error: unknown) => {
      console.error(error)
      data.update((current) => {
        if (current) {
          current.title.error = getOperationResultError(error)
          current.isUploading = false
          current.uploadController = undefined
        }
        return current
      })
    }

    try {
      // Step 1: If we're in new post mode, create the post first
      if (get(isInNewPostMode)) {
        const createResult = await sdk.createPost({
          title: $data.title.value,
          language: $data.language.value,
          keywords: $data.keywords.value,
        })

        if (getOperationResultError(createResult)) {
          handleError(createResult)
          return
        }

        const newPost = createResult.data.createPost as PostItemType
        post.set(newPost)

        // Transition out of new-post mode since the post was successfully created
        isInNewPostMode.set(false)

        // Update the URL to reflect the new post without reloading the page
        if (typeof window !== 'undefined' && window.history) {
          window.history.pushState(null, '', `/${newPost.id}`)
        }
      }

      // Step 2: Now proceed with regular edit flow (for both new and existing posts)
      const postObject = get(post)
      if (!postObject) return

      let uploadId: string | undefined
      let uploadController: UploadController | undefined
      const headers: Record<string, string> = {}

      // Set up upload controller if we have files to upload
      if (hasNewFiles) {
        ;[uploadId, uploadController] = createUploadController()
        headers[UPLOAD_ID_HEADER] = uploadId!
        data.update((current) => {
          if (current) {
            current.uploadController = uploadController
            current.isUploading = true
          }
          return current
        })
      }

      const editResult = await sdk.editPost(
        {
          id: postObject.id,
          title: $data.title.value,
          language: $data.language.value,
          keywords: $data.keywords.value,
          items: Object.entries($data.items || {}).map(([id, item]) => ({
            id,
            description: item.description.value,
            caption: item.caption?.value,
          })),
          newItems: Object.values($data.uploadItems || {}).map(
            (uploadItem) => ({
              file: uploadItem.file,
              description: uploadItem.description.value,
              caption: uploadItem.caption?.value,
            }),
          ),
        },
        headers,
      )

      if (getOperationResultError(editResult)) {
        handleError(editResult)
        // Don't return here - we want to restart subscription
        // since the post might have been created successfully
      } else {
        post.set(editResult.data.editPost as PostItemType)
        // Clear edit data since update was successful
        data.set(undefined)
      }

      // Restart subscription for any new processing items
      startProcessingSubscription()
    } catch (err) {
      handleError(err)
    } finally {
      loading.set(false)
    }
  }

  const restartSubscription = () => {
    startProcessingSubscription()
  }

  const deleteItem = async (itemId: string) => {
    // Use browser confirm dialog for simplicity
    const confirmed = await openDialog?.({
      variant: 'transaction',
      heading: 'Delete item',
      children:
        'Are you sure you want to delete this item? This action cannot be undone.',
      actionLabel: 'Delete',
    })

    if (!confirmed) return false

    try {
      loading.set(true)
      const result = await sdk.deleteItem({ deleteItemId: itemId })

      if (getOperationResultError(result)) {
        console.error(result)
        openDialog?.({
          heading: 'Error',
          children: 'Failed to delete item. Please try again.',
        })
        return false
      }

      // Update the post data by removing the deleted item
      post.update((currentPost) => {
        if (!currentPost) return currentPost

        const newPost = { ...currentPost }
        newPost.items = { ...newPost.items }

        if (newPost.items.edges) {
          newPost.items.edges = newPost.items.edges.filter(
            (edge) => edge?.node?.id !== itemId,
          )
        }
        return newPost
      })

      return true
    } catch (err) {
      console.error(err)
      openDialog?.({
        heading: 'Error',
        children: 'Failed to delete item. Please try again.',
      })
      return false
    } finally {
      loading.set(false)
    }
  }

  const deletePost = async () => {
    const postObject = get(post)
    if (!postObject) return false

    const confirmed = await openDialog?.({
      variant: 'transaction',
      heading: 'Delete post',
      children:
        'Are you sure you want to delete this post? This action cannot be undone.',
      actionLabel: 'Delete',
    })

    if (!confirmed) return false

    try {
      loading.set(true)
      const result = await sdk.deletePost({ deletePostId: postObject.id })

      if (getOperationResultError(result)) {
        console.error(result)
        openDialog?.({
          heading: 'Error',
          children: 'Failed to delete post. Please try again.',
        })
        return false
      }

      return true
    } catch (err) {
      console.error(err)
      openDialog?.({
        heading: 'Error',
        children: 'Failed to delete post. Please try again.',
      })
      return false
    } finally {
      loading.set(false)
    }
  }

  const reorderItems = async (itemIds: string[]) => {
    const postObject = get(post)
    if (!postObject) return false

    try {
      loading.set(true)
      const result = await sdk.reorderItem({
        itemIds,
        postId: postObject.id,
      })

      if (getOperationResultError(result)) {
        console.error(result)
        openDialog?.({
          heading: 'Error',
          children: 'Failed to reorder items. Please try again.',
        })
        return false
      }

      // Update the post data by reordering the items locally
      post.update((currentPost) => {
        if (!currentPost) return currentPost

        const newPost = { ...currentPost }
        newPost.items = { ...newPost.items }

        if (newPost.items.edges) {
          // Create a map of existing items by ID for easy lookup
          const itemMap = new Map()
          newPost.items.edges.forEach((edge) => {
            if (edge?.node) {
              itemMap.set(edge.node.id, edge)
            }
          })

          // Reorder the edges based on the provided itemIds array
          const reorderedEdges = itemIds
            .map((id) => itemMap.get(id))
            .filter(Boolean) // Remove any undefined items

          // Add any items that weren't in the reorder list at the end
          const reorderedIds = new Set(itemIds)
          const remainingEdges = newPost.items.edges.filter(
            (edge) => edge?.node && !reorderedIds.has(edge.node.id),
          )

          newPost.items.edges = [...reorderedEdges, ...remainingEdges]
        }

        return newPost
      })

      return true
    } catch (err) {
      console.error(err)
      openDialog?.({
        heading: 'Error',
        children: 'Failed to reorder items. Please try again.',
      })
      return false
    } finally {
      loading.set(false)
    }
  }

  const mergePost = async (targetPostId: string, mergeKeywords: boolean) => {
    const postObject = get(post)
    if (!postObject) return false

    const confirmed = await openDialog?.({
      variant: 'transaction',
      heading: 'Merge post',
      children:
        'Are you sure you want to merge this post? This action cannot be undone.',
      actionLabel: 'Merge',
    })

    if (!confirmed) return false

    try {
      loading.set(true)
      const result = await sdk.mergePost({
        sourcePostId: postObject.id,
        targetPostId,
        mergeKeywords,
      })

      if (getOperationResultError(result)) {
        console.error(result)
        openDialog?.({
          heading: 'Error',
          children: 'Failed to merge post. Please try again.',
        })
        return false
      }

      return true
    } catch (err) {
      console.error(err)
      openDialog?.({
        heading: 'Error',
        children: 'Failed to merge post. Please try again.',
      })
      return false
    } finally {
      loading.set(false)
    }
  }

  const moveItem = async (
    itemId: string,
    targetPostId: string,
    keepEmptyPost: boolean = false,
  ) => {
    const confirmed = await openDialog?.({
      variant: 'transaction',
      heading: 'Move item',
      children: 'Are you sure you want to move this item to another post?',
      actionLabel: 'Move',
    })

    if (!confirmed) return false

    try {
      loading.set(true)
      const result = await sdk.moveItem({
        itemId,
        targetPostId,
        keepEmptyPost,
      })

      if (getOperationResultError(result)) {
        console.error(result)
        openDialog?.({
          heading: 'Error',
          children: 'Failed to move item. Please try again.',
        })
        return false
      }

      // Update the post data by removing the moved item
      post.update((currentPost) => {
        if (!currentPost) return currentPost

        const newPost = { ...currentPost }
        newPost.items = { ...newPost.items }

        if (newPost.items.edges) {
          newPost.items.edges = newPost.items.edges.filter(
            (edge) => edge?.node?.id !== itemId,
          )
        }
        return newPost
      })

      return true
    } catch (err) {
      console.error(err)
      openDialog?.({
        heading: 'Error',
        children: 'Failed to move item. Please try again.',
      })
      return false
    } finally {
      loading.set(false)
    }
  }

  return {
    post,
    data,
    loading,
    isInNewPostMode,
    startEdit,
    cancelEdit,
    addFile,
    submitEdit,
    setOpenDialog,
    cancelUpload,
    restartSubscription,
    deleteItem,
    deletePost,
    reorderItems,
    mergePost,
    moveItem,
  }
}
