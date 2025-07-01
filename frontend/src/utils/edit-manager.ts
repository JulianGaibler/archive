import { get, writable, derived } from 'svelte/store'
import {
  Language,
  type getSdk,
  type PostQuery,
  TaskStatus,
  TaskUpdatesDocument,
  type TaskUpdatesSubscription,
} from '@src/generated/graphql'
import { print } from 'graphql'
import { getOperationResultError } from '@src/graphql-errors'
import {
  clearValidationErrors,
  createUpdateValue,
  extractValues,
  setValidationErrors,
  type UpdateValue,
} from './edit-utils'
import type { OpenDialog } from 'tint/components/Dialog.svelte'
import { webSubscriptionsClient } from '@src/gql-client'
import {
  createUploadController,
  UPLOAD_ID_HEADER,
  type UploadController,
} from './custom-fetch'

type PostItemType = NonNullable<PostQuery['node']> & { __typename: 'Post' }

export type ExistingItem = {
  type: 'existing'
  id: string
  data: NonNullable<PostItemType['items']['nodes']>[number] // The actual item data from GraphQL
  description: UpdateValue<string>
  caption: UpdateValue<string> | undefined
  position: UpdateValue<number>
}

export type UploadItem = {
  type: 'upload'
  id: string
  file: File
  keywords: UpdateValue<string[]>
  description: UpdateValue<string>
  caption: UpdateValue<string> | undefined
  language: UpdateValue<Language>
}

export type EditableItem = ExistingItem | UploadItem

export type PostUpdate = {
  title: UpdateValue<string>
  language: UpdateValue<Language>
  keywords: UpdateValue<string[]>
  items: Record<string, EditableItem>
  uploadController?: UploadController
  isUploading: boolean
}

export type GlobalError = {
  message: string
  validationErrors?: string[]
}

export function createEditManager(
  sdk: ReturnType<typeof getSdk>,
  postData: PostItemType | undefined,
  isNewPost: boolean = false,
) {
  const post = writable<PostItemType | undefined>(postData)
  const data = writable<PostUpdate | undefined>(undefined)
  const loading = writable(false)
  const globalError = writable<GlobalError | undefined>(undefined) // Global error store for edit manager
  const isInNewPostMode = writable(isNewPost) // Track new-post mode as reactive store

  // Derived store that provides reactive access to all items
  const items = derived([post, data], ([postData, editData]) => {
    if (editData) {
      // In edit mode, return editable items
      return Object.values(editData.items)
    } else if (postData) {
      // In view mode, return post items wrapped as display items
      return (
        postData.items.nodes?.filter(Boolean).map((node) => ({
          type: 'existing' as const,
          id: node.id,
          data: node,
          description: { value: node.description, error: undefined },
          caption:
            'caption' in node
              ? { value: node.caption, error: undefined }
              : undefined,
          position: { value: node.position, error: undefined },
        })) || []
      )
    }
    return []
  })

  let openDialog: OpenDialog | undefined = undefined
  let subscriptionUnsubscribe: (() => void) | undefined = undefined

  // Function to get processing items that need to be monitored
  const getProcessingItemIds = (postData: PostItemType): string[] => {
    const processingIds: string[] = []

    postData.items.nodes?.forEach((item) => {
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

    // Set up new subscription
    const subscription = webSubscriptionsClient.iterate({
      query: print(TaskUpdatesDocument),
      variables: { ids: processingIds },
    })

    // Process subscription results
    const processSubscription = async () => {
      try {
        for await (const result of subscription) {
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

              if (newPost.items.nodes) {
                newPost.items.nodes = newPost.items.nodes.map((node) => {
                  if (node && node.id === updatedItem.id) {
                    return updatedItem
                  }
                  return node
                })
              }
              return newPost
            })

            // Also update edit data if it exists
            data.update((currentData) => {
              if (!currentData) return currentData

              if (
                currentData.items[updatedItem.id] &&
                currentData.items[updatedItem.id].type === 'existing'
              ) {
                const existingItem = currentData.items[
                  updatedItem.id
                ] as ExistingItem
                existingItem.data = updatedItem
              }

              return currentData
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
    globalError.set(undefined)
  }

  const setOpenDialog = (dialog: OpenDialog | undefined) => {
    openDialog = dialog
  }

  const startEdit = () => {
    post.update((current) => {
      if (!current) return current
      return clearValidationErrors(current)
    })

    const postObject = get(post)

    if (get(isInNewPostMode)) {
      // For new posts, start with empty/default values
      data.set({
        title: createUpdateValue(''),
        language: createUpdateValue(Language.English),
        keywords: createUpdateValue([]),
        items: {},
        uploadController: undefined,
        isUploading: false,
      })
    } else {
      // For existing posts, use current values
      if (!postObject) return

      const existingItems: Record<string, EditableItem> = {}

      postObject.items.nodes?.forEach((node) => {
        if (node) {
          existingItems[node.id] = {
            type: 'existing',
            id: node.id,
            data: node,
            description: createUpdateValue(node.description),
            caption:
              'caption' in node ? createUpdateValue(node.caption) : undefined,
            position: createUpdateValue(node.position),
          }
        }
      })

      data.set({
        title: createUpdateValue(postObject.title),
        language: createUpdateValue(postObject.language),
        keywords: createUpdateValue(
          postObject.keywords.map((keyword) => keyword.id),
        ),
        items: existingItems,
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
      current.items[file.name] = {
        type: 'upload',
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

    // Serialize the edit data for API consumption
    const serializedData = serializeEditData($data)
    const hasNewFiles = serializedData.uploadItems.length > 0

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
          current = clearValidationErrors(current)
          current.isUploading = false
          current.uploadController = undefined

          const errorResult = getOperationResultError(error)

          if (!errorResult) return current

          if ('issues' in errorResult) {
            // serialize current data to preserve UpdateValue wrappers
            const serializedWithValidation =
              serializeEditDataWithValidation(current)
            console.log(
              'Serialized data with validation:',
              serializedWithValidation,
            )
            const { validationTarget, unassignableErrors } =
              setValidationErrors(serializedWithValidation, errorResult.issues)
            const deserializedData = deserializeEditDataWithValidation(
              validationTarget,
              postData,
            )

            // set the globalError store. If there are no unassignableErrors, just say there were errors, otherwise also show them. If it is more than one, show a list.

            if (unassignableErrors.length > 0) {
              globalError.set({
                message: `There were errors when trying to edit`,
                validationErrors: unassignableErrors,
              })
            } else {
              globalError.set({
                message: 'There were errors when trying to edit the post.',
              })
            }

            return deserializedData
          } else {
            globalError.set({
              message: errorResult.message,
            })
          }
        }
        return current
      })
    }

    try {
      // Step 1: If we're in new post mode, create the post first
      if (get(isInNewPostMode)) {
        // Extract core values for API call using the utility function
        const coreValues = extractValues({
          title: $data.title,
          language: $data.language,
          keywords: $data.keywords,
        })

        const createResult = await sdk.createPost({
          title: coreValues.title,
          language: coreValues.language,
          keywords: coreValues.keywords,
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

      // Extract core values for API call using the utility function
      const coreValues = extractValues({
        title: $data.title,
        language: $data.language,
        keywords: $data.keywords,
      })

      // Serialize the edit data for API consumption
      const serializedData = serializeEditData($data)

      const editResult = await sdk.editPost(
        {
          id: postObject.id,
          title: coreValues.title,
          language: coreValues.language,
          keywords: coreValues.keywords,
          items: serializedData.existingItems.map((item) => ({
            id: item.id,
            description: item.description,
            caption: item.caption,
          })),
          newItems: serializedData.uploadItems.map((uploadItem) => ({
            file: uploadItem.file,
            description: uploadItem.description,
            caption: uploadItem.caption,
          })),
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
        globalError.set(undefined)
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

      const error = getOperationResultError(result)
      if (error) {
        console.error(result)
        openDialog?.({
          heading: 'Error',
          children: `Failed to delete item: ${error}`,
        })
        return false
      }

      // Update the post data by removing the deleted item
      post.update((currentPost) => {
        if (!currentPost) return currentPost

        const newPost = { ...currentPost }
        newPost.items = { ...newPost.items }

        if (newPost.items.nodes) {
          newPost.items.nodes = newPost.items.nodes.filter(
            (node) => node.id !== itemId,
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

      const error = getOperationResultError(result)
      if (error) {
        console.error(result)
        openDialog?.({
          heading: 'Error',
          children: `Failed to delete post: ${error}`,
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

        if (newPost.items.nodes) {
          // Create a map of existing items by ID for easy lookup
          const itemMap = new Map()
          newPost.items.nodes.forEach((node) => {
            if (node) {
              itemMap.set(node.id, node)
            }
          })

          // Reorder the nods based on the provided itemIds array
          const reorderedNodes = itemIds
            .map((id) => itemMap.get(id))
            .filter(Boolean) // Remove any undefined items

          // Add any items that weren't in the reorder list at the end
          const reorderedIds = new Set(itemIds)
          const remainingNodes = newPost.items.nodes.filter(
            (node) => node && !reorderedIds.has(node.id),
          )

          newPost.items.nodes = [...reorderedNodes, ...remainingNodes]
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

        if (newPost.items.nodes) {
          newPost.items.nodes = newPost.items.nodes.filter(
            (node) => node.id !== itemId,
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

  const removeUploadItem = (itemId: string) => {
    data.update((current) => {
      if (!current) return current
      if (current.items[itemId] && current.items[itemId].type === 'upload') {
        delete current.items[itemId]
      }
      return current
    })
  }

  return {
    post,
    data,
    loading,
    globalError,
    isInNewPostMode,
    items, // Expose the items derived store
    startEdit,
    cancelEdit,
    addFile,
    removeUploadItem,
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

// Serialized formats for API communication
export type SerializedEditItem = {
  id: string
  description: string
  caption?: string
}

export type SerializedUploadItem = {
  file: File
  description: string
  caption?: string
  keywords: string[]
  language: Language
}

export type SerializedEditData = {
  title: string
  language: Language
  keywords: string[]
  existingItems: SerializedEditItem[]
  uploadItems: SerializedUploadItem[]
}

// Serialized formats with UpdateValue wrappers for validation
export type SerializedEditItemWithValidation = {
  id: UpdateValue<string>
  description: UpdateValue<string>
  caption?: UpdateValue<string>
}

export type SerializedUploadItemWithValidation = {
  file: UpdateValue<File>
  description: UpdateValue<string>
  caption?: UpdateValue<string>
  keywords: UpdateValue<string[]>
  language: UpdateValue<Language>
}

export type SerializedEditDataWithValidation = {
  title: UpdateValue<string>
  language: UpdateValue<Language>
  keywords: UpdateValue<string[]>
  items: SerializedEditItemWithValidation[]
  newItems: SerializedUploadItemWithValidation[]
}

/**
 * Serialize edit data to API format (removes UpdateValue wrappers and flattens
 * structure)
 *
 * Transforms the complex edit manager structure into the flat format expected
 * by the API. This function is used when sending data to the server for
 * persistence.
 *
 * @param data - The PostUpdate data with complex item structure and UpdateValue
 *   wrappers
 * @returns SerializedEditData - Flat structure suitable for API consumption
 */
export function serializeEditData(data: PostUpdate): SerializedEditData {
  const existingItems = Object.values(data.items)
    .filter((item): item is ExistingItem => item.type === 'existing')
    .map(
      (item): SerializedEditItem => ({
        id: item.id,
        description: item.description.value,
        caption: item.caption?.value,
      }),
    )

  const uploadItems = Object.values(data.items)
    .filter((item): item is UploadItem => item.type === 'upload')
    .map(
      (item): SerializedUploadItem => ({
        file: item.file,
        description: item.description.value,
        caption: item.caption?.value,
        keywords: item.keywords.value,
        language: item.language.value,
      }),
    )

  return {
    title: data.title.value,
    language: data.language.value,
    keywords: data.keywords.value,
    existingItems,
    uploadItems,
  }
}

/**
 * Deserialize API format to edit data (adds UpdateValue wrappers and creates
 * item structure)
 *
 * Transforms flat API data back into the complex edit manager structure. This
 * function is used when receiving data from the server or when reconstructing
 * edit state.
 *
 * @param serialized - The flat SerializedEditData from API or storage
 * @param postData - Optional post data to populate item.data fields for
 *   existing items
 * @returns PostUpdate - Complex structure suitable for edit manager
 */
export function deserializeEditData(
  serialized: SerializedEditData,
  postData?: PostItemType,
): PostUpdate {
  const items: Record<string, EditableItem> = {}

  // Convert existing items
  serialized.existingItems.forEach((serializedItem) => {
    // Find the corresponding data from postData if available
    const itemData = postData?.items.nodes?.find(
      (node) => node?.id === serializedItem.id,
    )

    items[serializedItem.id] = {
      type: 'existing',
      id: serializedItem.id,
      data: itemData!, // This should exist if we're deserializing valid data
      description: createUpdateValue(serializedItem.description),
      caption: serializedItem.caption
        ? createUpdateValue(serializedItem.caption)
        : undefined,
      position: createUpdateValue(itemData?.position || 0),
    }
  })

  // Convert upload items
  serialized.uploadItems.forEach((serializedItem, index) => {
    const id = serializedItem.file.name || `upload-${index}`
    items[id] = {
      type: 'upload',
      id,
      file: serializedItem.file,
      keywords: createUpdateValue(serializedItem.keywords),
      description: createUpdateValue(serializedItem.description),
      caption: serializedItem.caption
        ? createUpdateValue(serializedItem.caption)
        : undefined,
      language: createUpdateValue(serializedItem.language),
    }
  })

  return {
    title: createUpdateValue(serialized.title),
    language: createUpdateValue(serialized.language),
    keywords: createUpdateValue(serialized.keywords),
    items,
    uploadController: undefined,
    isUploading: false,
  }
}

/**
 * Serialize edit data with UpdateValue wrappers preserved for validation error
 * handling
 *
 * Similar to serializeEditData but keeps UpdateValue wrappers intact. This
 * allows validation errors from the server to be applied to the correct fields
 * using the existing error-handling utilities.
 *
 * @param data - The PostUpdate data with complex item structure
 * @returns SerializedEditDataWithValidation - Flat structure with UpdateValue
 *   fields preserved
 */
export function serializeEditDataWithValidation(
  data: PostUpdate,
): SerializedEditDataWithValidation {
  const items = Object.values(data.items)
    .filter((item): item is ExistingItem => item.type === 'existing')
    .map(
      (item): SerializedEditItemWithValidation => ({
        id: createUpdateValue(item.id),
        description: item.description,
        caption: item.caption,
      }),
    )

  const newItems = Object.values(data.items)
    .filter((item): item is UploadItem => item.type === 'upload')
    .map(
      (item): SerializedUploadItemWithValidation => ({
        file: createUpdateValue(item.file),
        description: item.description,
        caption: item.caption,
        keywords: item.keywords,
        language: item.language,
      }),
    )

  return {
    title: data.title,
    language: data.language,
    keywords: data.keywords,
    items,
    newItems,
  }
}

/**
 * Deserialize validation-compatible format back to edit data
 *
 * Transforms the validation-compatible serialized format back into edit manager
 * structure. This function preserves any validation errors that were applied to
 * the serialized data.
 *
 * @param serialized - The SerializedEditDataWithValidation with potential
 *   validation errors
 * @param postData - Optional post data to populate item.data fields for
 *   existing items
 * @returns PostUpdate - Complex structure with validation errors preserved
 */
export function deserializeEditDataWithValidation(
  serialized: SerializedEditDataWithValidation,
  postData?: PostItemType,
): PostUpdate {
  const items: Record<string, EditableItem> = {}

  // Convert existing items
  serialized.items.forEach((serializedItem) => {
    const itemId = serializedItem.id.value
    // Find the corresponding data from postData if available
    const itemData = postData?.items.nodes?.find((node) => node?.id === itemId)

    items[itemId] = {
      type: 'existing',
      id: itemId,
      data: itemData!, // This should exist if we're deserializing valid data
      description: serializedItem.description,
      caption: serializedItem.caption,
      position: createUpdateValue(itemData?.position || 0),
    }
  })

  // Convert upload items
  serialized.newItems.forEach((serializedItem, index) => {
    const id = serializedItem.file.value.name || `upload-${index}`
    items[id] = {
      type: 'upload',
      id,
      file: serializedItem.file.value,
      keywords: serializedItem.keywords,
      description: serializedItem.description,
      caption: serializedItem.caption,
      language: serializedItem.language,
    }
  })

  return {
    title: serialized.title,
    language: serialized.language,
    keywords: serialized.keywords,
    items,
    uploadController: undefined,
    isUploading: false,
  }
}
