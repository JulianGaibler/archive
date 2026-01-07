import { get, writable, derived } from 'svelte/store'
import {
  Language,
  FileType,
  FileProcessingStatus,
  type getSdk,
  type PostQuery,
  FileProcessingUpdatesDocument,
  type FileProcessingUpdatesSubscription,
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
import {
  createUploadController,
  UPLOAD_ID_HEADER,
  type UploadController,
} from './custom-fetch'
import { webSubscriptionsClient } from '@src/gql-client'

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
  fileType: FileType // Store the determined file type
  fileId?: string // File ID returned from uploadItemFile
  isUploading: boolean
  isQueued: boolean // Whether the item is queued for upload
  uploadError?: string
  uploadController?: UploadController // Upload controller for progress and cancellation
  keywords: UpdateValue<string[]>
  description: UpdateValue<string>
  caption: UpdateValue<string> | undefined
  language: UpdateValue<Language>
  // Processing information (set after upload when monitoring file processing)
  processingStatus?: FileProcessingStatus
  processingProgress?: number | null
  processingNotes?: string | null
  // Complete file data when processing is done (for display purposes)
  processedFile?: FileProcessingUpdatesSubscription['fileProcessingUpdates']['file']
}

export type EditableItem = ExistingItem | UploadItem

export type PostUpdate = {
  title: UpdateValue<string>
  language: UpdateValue<Language>
  keywords: UpdateValue<string[]>
  items: Record<string, EditableItem>
  uploadQueue: string[] // Queue of upload item IDs waiting to be uploaded
  currentUploadId?: string // ID of the file currently being uploaded
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
            'caption' in node && typeof node.caption === 'string'
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

  // Function to start subscription for processing files
  const startProcessingSubscription = () => {
    const currentPost = get(post)
    const currentData = get(data)

    // Get processing IDs from both post data and edit data
    const processingIds: string[] = []

    // Add file IDs from existing items that are still processing
    if (currentPost) {
      currentPost.items.nodes?.forEach((item) => {
        if (item && 'file' in item && item.file) {
          // Monitor files that are not FAILED or DONE
          if (
            item.file.processingStatus !== FileProcessingStatus.Failed &&
            item.file.processingStatus !== FileProcessingStatus.Done
          ) {
            processingIds.push(item.file.id)
          }
        }
      })
    }

    // Add file IDs from uploaded items in edit data
    if (currentData) {
      Object.values(currentData.items).forEach((item) => {
        if (item.type === 'upload' && item.fileId && !item.uploadError) {
          // Only add if we don't already have it from the post data
          if (!processingIds.includes(item.fileId)) {
            processingIds.push(item.fileId)
          }
        }
      })
    }

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
      query: print(FileProcessingUpdatesDocument),
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
            | FileProcessingUpdatesSubscription
            | undefined
          if (subscriptionData?.fileProcessingUpdates?.file) {
            const updatedFile = subscriptionData.fileProcessingUpdates.file

            // Update the post data with the new file information
            post.update((currentPost) => {
              if (!currentPost) return currentPost

              const newPost = { ...currentPost }
              newPost.items = { ...newPost.items }

              if (newPost.items.nodes) {
                newPost.items.nodes = newPost.items.nodes.map((node) => {
                  if (
                    node &&
                    'file' in node &&
                    node.file &&
                    node.file.id === updatedFile.id
                  ) {
                    // Update only the processing-related fields and paths that can change
                    const updatedNode = { ...node }
                    const nodeFile = (updatedNode as { file: typeof node.file })
                      .file

                    // Update core processing fields
                    nodeFile.processingStatus = updatedFile.processingStatus
                    nodeFile.processingProgress = updatedFile.processingProgress
                    nodeFile.processingNotes = updatedFile.processingNotes

                    // Update paths if they exist in the updated file
                    if (
                      'originalPath' in nodeFile &&
                      'originalPath' in updatedFile
                    ) {
                      nodeFile.originalPath = updatedFile.originalPath
                    }
                    if (
                      'compressedPath' in nodeFile &&
                      'compressedPath' in updatedFile
                    ) {
                      nodeFile.compressedPath = updatedFile.compressedPath
                    }
                    if (
                      'thumbnailPath' in nodeFile &&
                      'thumbnailPath' in updatedFile
                    ) {
                      nodeFile.thumbnailPath = updatedFile.thumbnailPath
                    }
                    if (
                      'posterThumbnailPath' in nodeFile &&
                      'posterThumbnailPath' in updatedFile
                    ) {
                      nodeFile.posterThumbnailPath =
                        updatedFile.posterThumbnailPath
                    }
                    if (
                      'compressedGifPath' in nodeFile &&
                      'compressedGifPath' in updatedFile
                    ) {
                      nodeFile.compressedGifPath = updatedFile.compressedGifPath
                    }
                    if (
                      'relativeHeight' in nodeFile &&
                      'relativeHeight' in updatedFile
                    ) {
                      nodeFile.relativeHeight = updatedFile.relativeHeight
                    }
                    if ('waveform' in nodeFile && 'waveform' in updatedFile) {
                      nodeFile.waveform = updatedFile.waveform
                    }
                    if (
                      'waveformThumbnail' in nodeFile &&
                      'waveformThumbnail' in updatedFile
                    ) {
                      nodeFile.waveformThumbnail = updatedFile.waveformThumbnail
                    }

                    return updatedNode
                  }
                  return node
                })
              }
              return newPost
            })

            // Also update edit data if it exists
            data.update((currentData) => {
              if (!currentData) return currentData

              // Find the item with this file and update it
              Object.values(currentData.items).forEach((item) => {
                if (
                  item.type === 'existing' &&
                  'file' in item.data &&
                  item.data.file &&
                  item.data.file.id === updatedFile.id
                ) {
                  // Update the file data with new processing information and paths
                  const itemFile = item.data.file

                  // Update core processing fields
                  itemFile.processingStatus = updatedFile.processingStatus
                  itemFile.processingProgress = updatedFile.processingProgress
                  itemFile.processingNotes = updatedFile.processingNotes

                  // Update paths if they exist in the updated file
                  if (
                    'originalPath' in itemFile &&
                    'originalPath' in updatedFile
                  ) {
                    itemFile.originalPath = updatedFile.originalPath
                  }
                  if (
                    'compressedPath' in itemFile &&
                    'compressedPath' in updatedFile
                  ) {
                    itemFile.compressedPath = updatedFile.compressedPath
                  }
                  if (
                    'thumbnailPath' in itemFile &&
                    'thumbnailPath' in updatedFile
                  ) {
                    itemFile.thumbnailPath = updatedFile.thumbnailPath
                  }
                  if (
                    'posterThumbnailPath' in itemFile &&
                    'posterThumbnailPath' in updatedFile
                  ) {
                    itemFile.posterThumbnailPath =
                      updatedFile.posterThumbnailPath
                  }
                  if (
                    'compressedGifPath' in itemFile &&
                    'compressedGifPath' in updatedFile
                  ) {
                    itemFile.compressedGifPath = updatedFile.compressedGifPath
                  }
                  if (
                    'relativeHeight' in itemFile &&
                    'relativeHeight' in updatedFile
                  ) {
                    itemFile.relativeHeight = updatedFile.relativeHeight
                  }
                  if ('waveform' in itemFile && 'waveform' in updatedFile) {
                    itemFile.waveform = updatedFile.waveform
                  }
                  if (
                    'waveformThumbnail' in itemFile &&
                    'waveformThumbnail' in updatedFile
                  ) {
                    itemFile.waveformThumbnail = updatedFile.waveformThumbnail
                  }
                } else if (
                  item.type === 'upload' &&
                  item.fileId === updatedFile.id
                ) {
                  // Update uploaded item processing status and store complete file data
                  const uploadItem = item as UploadItem
                  uploadItem.processingStatus = updatedFile.processingStatus
                  uploadItem.processingProgress = updatedFile.processingProgress
                  uploadItem.processingNotes = updatedFile.processingNotes

                  // When processing is complete, store the complete file data for display
                  if (
                    updatedFile.processingStatus === FileProcessingStatus.Done
                  ) {
                    uploadItem.processedFile = updatedFile
                  }
                }
              })

              return currentData
            })

            // Check if we should stop the subscription
            const updatedPost = get(post)
            const updatedData = get(data)

            // Calculate remaining processing IDs using the same logic as startProcessingSubscription
            const remainingProcessingIds: string[] = []

            // Add file IDs from existing items that are still processing
            if (updatedPost) {
              updatedPost.items.nodes?.forEach((item) => {
                if (item && 'file' in item && item.file) {
                  // Monitor files that are not FAILED or DONE
                  if (
                    item.file.processingStatus !==
                      FileProcessingStatus.Failed &&
                    item.file.processingStatus !== FileProcessingStatus.Done
                  ) {
                    remainingProcessingIds.push(item.file.id)
                  }
                }
              })
            }

            // Add file IDs from uploaded items in edit data
            if (updatedData) {
              Object.values(updatedData.items).forEach((item) => {
                if (
                  item.type === 'upload' &&
                  item.fileId &&
                  !item.uploadError
                ) {
                  // Only add if we don't already have it from the post data
                  if (!remainingProcessingIds.includes(item.fileId)) {
                    remainingProcessingIds.push(item.fileId)
                  }
                }
              })
            }

            if (remainingProcessingIds.length === 0) {
              // No more processing files, stop subscription
              if (subscriptionUnsubscribe) {
                subscriptionUnsubscribe()
                subscriptionUnsubscribe = undefined
              }
              break
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

  // Add beforeunload handler to warn about processing items
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    const $data = get(data)
    const hasProcessingItems =
      $data &&
      Object.values($data.items).some(
        (item) =>
          (item.type === 'upload' &&
            (item.isUploading ||
              item.isQueued ||
              (item.processingStatus &&
                item.processingStatus !== FileProcessingStatus.Done &&
                item.processingStatus !== FileProcessingStatus.Failed))) ||
          (item.type === 'existing' &&
            'file' in item.data &&
            item.data.file &&
            item.data.file.processingStatus !== FileProcessingStatus.Done &&
            item.data.file.processingStatus !== FileProcessingStatus.Failed),
      )

    if (hasProcessingItems) {
      event.preventDefault()
      event.returnValue =
        'Files are still uploading or processing. Are you sure you want to leave?'
      return 'Files are still uploading or processing. Are you sure you want to leave?'
    }
  }

  // Add event listener when edit mode starts
  let beforeUnloadAdded = false

  const cancelEdit = () => {
    const $data = get(data)

    // Check if there are any processing items or active uploads
    const hasProcessingItems =
      $data &&
      Object.values($data.items).some(
        (item) =>
          (item.type === 'upload' &&
            (item.isUploading ||
              item.isQueued ||
              (item.processingStatus &&
                item.processingStatus !== FileProcessingStatus.Done &&
                item.processingStatus !== FileProcessingStatus.Failed))) ||
          (item.type === 'existing' &&
            'file' in item.data &&
            item.data.file &&
            item.data.file.processingStatus !== FileProcessingStatus.Done &&
            item.data.file.processingStatus !== FileProcessingStatus.Failed),
      )

    if (hasProcessingItems) {
      const confirmed = openDialog?.({
        variant: 'transaction',
        heading: 'Cancel while processing?',
        children:
          'Some files are still uploading or processing. Are you sure you want to cancel? This will stop all uploads and you may lose progress.',
        actionLabel: 'Yes, cancel anyway',
      })

      if (!confirmed) {
        return false
      }
    }

    // Cancel any ongoing uploads
    if ($data?.isUploading) {
      cancelUpload()
    }

    // Cancel all queued uploads
    if ($data && $data.uploadQueue.length > 0) {
      $data.uploadQueue.forEach((itemId) => {
        const item = $data.items[itemId] as UploadItem
        if (item?.uploadController) {
          item.uploadController.abort()
        }
      })
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

    // Remove beforeunload handler
    if (typeof window !== 'undefined' && beforeUnloadAdded) {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      beforeUnloadAdded = false
    }
  }

  const setOpenDialog = (dialog: OpenDialog | undefined) => {
    openDialog = dialog
  }

  const startEdit = () => {
    post.update((current) => {
      if (!current) return current
      return clearValidationErrors(current)
    })

    // Add beforeunload handler
    if (typeof window !== 'undefined' && !beforeUnloadAdded) {
      window.addEventListener('beforeunload', handleBeforeUnload)
      beforeUnloadAdded = true
    }

    const postObject = get(post)

    if (get(isInNewPostMode)) {
      // For new posts, start with empty/default values
      data.set({
        title: createUpdateValue(''),
        language: createUpdateValue(Language.English),
        keywords: createUpdateValue([]),
        items: {},
        uploadQueue: [],
        currentUploadId: undefined,
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
              'caption' in node && typeof node.caption === 'string'
                ? { value: node.caption, error: undefined }
                : undefined,
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
        uploadQueue: [],
        currentUploadId: undefined,
        isUploading: false,
      })
    }
  }

  const addFile = async (file: File) => {
    if (get(loading)) return

    const type = file.type.split('/')[0]
    if (type !== 'image' && type !== 'video' && type !== 'audio') {
      openDialog?.({
        heading: 'Unsupported file type',
        children: `The file type${file.type && ` "${file.type}"`} is not supported for upload.`,
      })
      return
    }

    // For video files, ask the user how they want to treat it
    let fileType: FileType
    if (type === 'video') {
      fileType = FileType.Video
    } else if (type === 'audio') {
      fileType = FileType.Audio
    } else if (file.type === 'image/gif') {
      fileType = FileType.Gif
    } else {
      fileType = FileType.Image
    }

    // Create upload item and add to queue
    const uploadId = crypto.randomUUID()
    data.update((current) => {
      if (!current) return current

      // Create the upload item
      current.items[uploadId] = {
        type: 'upload',
        id: uploadId,
        file,
        fileType,
        fileId: undefined,
        isUploading: false,
        isQueued: true,
        uploadError: undefined,
        uploadController: undefined,
        keywords: createUpdateValue([]),
        description: createUpdateValue(''),
        caption:
          fileType === FileType.Image ||
          fileType === FileType.Video ||
          fileType === FileType.Audio ||
          fileType === FileType.Gif
            ? createUpdateValue('')
            : undefined,
        language: createUpdateValue(Language.English),
      }

      // Add to queue
      current.uploadQueue.push(uploadId)

      return current
    })

    // Start processing the queue
    processUploadQueue()
  }

  // Process the upload queue - upload one file at a time
  const processUploadQueue = async () => {
    const currentData = get(data)
    if (!currentData || currentData.uploadQueue.length === 0) {
      return
    }

    // If we think we're uploading but there's no current upload ID, reset the state
    if (currentData.isUploading && !currentData.currentUploadId) {
      data.update((current) => {
        if (current) {
          current.isUploading = false
        }
        return current
      })
    }

    // Don't start a new upload if one is already in progress
    if (currentData.isUploading) {
      return
    }

    const uploadId = currentData.uploadQueue[0]
    const uploadItem = currentData.items[uploadId] as UploadItem

    if (!uploadItem || uploadItem.type !== 'upload') {
      // Remove invalid item from queue and continue
      data.update((current) => {
        if (current) {
          current.uploadQueue.shift()
        }
        return current
      })
      processUploadQueue()
      return
    }

    // Create upload controller
    const [uploadIdHeader, uploadController] = createUploadController()

    // Update item to uploading state
    data.update((current) => {
      if (!current) return current

      const item = current.items[uploadId] as UploadItem
      item.isUploading = true
      item.isQueued = false
      item.uploadController = uploadController
      current.currentUploadId = uploadId
      current.isUploading = true

      return current
    })

    try {
      // Prepare headers for upload
      const headers: Record<string, string> = {}
      if (uploadIdHeader) {
        headers[UPLOAD_ID_HEADER] = uploadIdHeader
      }

      // Upload the file
      const result = await sdk.uploadItemFile(
        {
          file: uploadItem.file,
          type: uploadItem.fileType,
        },
        headers,
      )

      const error = getOperationResultError(result)
      if (error) {
        throw new Error(error.message)
      }

      const fileId = result.data.uploadItemFile

      // Update the upload item with the file ID and mark as completed
      data.update((current) => {
        if (!current || !current.items[uploadId]) return current

        const item = current.items[uploadId] as UploadItem
        item.fileId = fileId
        item.isUploading = false
        item.uploadController = undefined

        // Remove from queue
        current.uploadQueue = current.uploadQueue.filter(
          (id) => id !== uploadId,
        )
        current.currentUploadId = undefined
        current.isUploading = false

        return current
      })

      // Start monitoring the uploaded file for processing updates
      startProcessingSubscription()

      // Continue processing queue
      processUploadQueue()
    } catch (error) {
      console.error('Upload failed:', error)

      // Check if it was aborted
      if (uploadController.signal.aborted) {
        // Remove aborted item completely
        data.update((current) => {
          if (!current) return current

          delete current.items[uploadId]
          current.uploadQueue = current.uploadQueue.filter(
            (id) => id !== uploadId,
          )
          current.currentUploadId = undefined
          current.isUploading = false

          return current
        })
      } else {
        // Update the upload item with error
        data.update((current) => {
          if (!current || !current.items[uploadId]) return current

          const item = current.items[uploadId] as UploadItem
          item.isUploading = false
          item.uploadError =
            error instanceof Error ? error.message : 'Upload failed'
          item.uploadController = undefined

          // Remove from queue
          current.uploadQueue = current.uploadQueue.filter(
            (id) => id !== uploadId,
          )
          current.currentUploadId = undefined
          current.isUploading = false

          return current
        })
      }

      // Continue processing queue even after error
      processUploadQueue()
    }
  }

  const cancelUpload = () => {
    const $data = get(data)
    if ($data?.isUploading && $data.currentUploadId) {
      const uploadItem = $data.items[$data.currentUploadId] as UploadItem
      if (uploadItem?.uploadController) {
        uploadItem.uploadController.abort()
      }
    }
  }

  const cancelUploadItem = (itemId: string) => {
    data.update((current) => {
      if (!current) return current

      const item = current.items[itemId]
      if (item?.type === 'upload') {
        if (item.isUploading && item.uploadController) {
          // Cancel active upload
          item.uploadController.abort()
          // Reset global upload state immediately to prevent race conditions
          if (current.currentUploadId === itemId) {
            current.currentUploadId = undefined
            current.isUploading = false
          }
        } else if (item.isQueued) {
          // Remove from queue
          current.uploadQueue = current.uploadQueue.filter(
            (id) => id !== itemId,
          )
          delete current.items[itemId]
        } else {
          // Just remove the item
          delete current.items[itemId]
        }
      }

      return current
    })

    // After cancelling, continue processing the queue in case there are other items waiting
    processUploadQueue()
  }

  const submitEdit = async () => {
    const $data = get(data)
    if (!$data) return

    // Don't allow submit while uploading
    if ($data.isUploading) {
      openDialog?.({
        heading: 'Upload in progress',
        children:
          'Please wait for the current upload to complete before submitting.',
      })
      return
    }

    // Check if all upload items have file IDs and no errors
    const uploadItems = Object.values($data.items).filter(
      (item): item is UploadItem => item.type === 'upload',
    )
    const hasIncompleteUploads = uploadItems.some(
      (item) => !item.fileId || item.uploadError,
    )

    if (hasIncompleteUploads) {
      openDialog?.({
        heading: 'Upload errors',
        children:
          'Some files failed to upload. Please remove them or try uploading again.',
      })
      return
    }

    // Serialize the edit data for API consumption
    const serializedData = serializeEditData($data)

    // For new posts, require at least one file
    if (get(isInNewPostMode) && serializedData.uploadItems.length === 0) {
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

          const errorResult = getOperationResultError(error)

          if (!errorResult) return current

          if ('issues' in errorResult) {
            // serialize current data to preserve UpdateValue wrappers
            const serializedWithValidation =
              serializeEditDataWithValidation(current)
            const { validationTarget, unassignableErrors } =
              setValidationErrors(serializedWithValidation, errorResult.issues)
            const deserializedData = deserializeEditDataWithValidation(
              validationTarget,
              postData,
              current,
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

      // Extract core values for API call using the utility function
      const coreValues = extractValues({
        title: $data.title,
        language: $data.language,
        keywords: $data.keywords,
      })

      const editResult = await sdk.editPost({
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
          fileId: uploadItem.fileId,
          description: uploadItem.description,
          caption: uploadItem.caption,
        })),
      })

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

      // Restart subscription after edit (whether successful or not)
      // This ensures we monitor any files that were added to the post
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
            (node) => node && node.id !== itemId,
          )
        }
        return newPost
      })

      // Also update edit data if it exists
      data.update((currentData) => {
        if (!currentData) return currentData

        // Remove the item from edit data if it exists
        if (currentData.items[itemId]) {
          const updatedData = { ...currentData }
          updatedData.items = { ...updatedData.items }
          delete updatedData.items[itemId]
          return updatedData
        }
        return currentData
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

  const duplicateItem = async (itemId: string) => {
    try {
      loading.set(true)
      const result = await sdk.duplicateItem({
        itemId,
      })

      const error = getOperationResultError(result)
      if (error) {
        console.error(result)
        openDialog?.({
          heading: 'Duplication Error',
          children: `Failed to duplicate item: ${error}`,
        })
        return false
      }

      // Refetch the post to get the updated item list
      const postObject = get(post)
      if (!postObject) return false

      const postResult = await sdk.Post({ id: postObject.id })
      const postError = getOperationResultError(postResult)
      if (postError) {
        console.error(postResult)
        return false
      }

      const updatedPost = postResult.data.node as PostItemType
      post.set(updatedPost)

      // If we're in edit mode, update the edit data as well
      data.update((currentData) => {
        if (!currentData) return currentData

        // Clear edit data to force refresh from the new post data
        return undefined
      })

      return true
    } catch (err) {
      console.error(err)
      openDialog?.({
        heading: 'Duplication Error',
        children: 'Failed to duplicate item. Please try again.',
      })
      return false
    } finally {
      loading.set(false)
    }
  }

  const convertItem = async (itemId: string, targetType: FileType) => {
    try {
      loading.set(true)
      const result = await sdk.convertItem({
        itemId,
        targetType,
      })

      const error = getOperationResultError(result)
      if (error) {
        console.error(result)
        openDialog?.({
          heading: 'Conversion Error',
          children: `Failed to start conversion: ${error}`,
        })
        return false
      }

      // Show success message
      openDialog?.({
        heading: 'Conversion Started',
        children:
          'The conversion has been queued and will begin shortly. You will see progress updates here.',
      })

      // Restart subscription to monitor the conversion process
      startProcessingSubscription()

      return true
    } catch (err) {
      console.error(err)
      openDialog?.({
        heading: 'Conversion Error',
        children: 'Failed to start conversion. Please try again.',
      })
      return false
    } finally {
      loading.set(false)
    }
  }

  const cropItem = async (
    itemId: string,
    crop: { left: number; top: number; right: number; bottom: number },
  ) => {
    try {
      loading.set(true)
      const result = await sdk.cropItem({
        itemId,
        crop,
      })

      const error = getOperationResultError(result)
      if (error) {
        console.error(result)
        openDialog?.({
          heading: 'Crop Error',
          children: `Failed to start cropping: ${error}`,
        })
        return false
      }

      // Show success message
      openDialog?.({
        heading: 'Cropping Started',
        children:
          'The cropping has been queued and will begin shortly. You will see progress updates here.',
      })

      // Restart subscription to monitor the cropping process
      startProcessingSubscription()

      return true
    } catch (err) {
      console.error(err)
      openDialog?.({
        heading: 'Crop Error',
        children: 'Failed to start cropping. Please try again.',
      })
      return false
    } finally {
      loading.set(false)
    }
  }

  const trimItem = async (
    itemId: string,
    trim: { startTime: number; endTime: number },
  ) => {
    try {
      loading.set(true)
      const result = await sdk.trimItem({
        itemId,
        trim,
      })

      const error = getOperationResultError(result)
      if (error) {
        console.error(result)
        openDialog?.({
          heading: 'Trim Error',
          children: `Failed to start trimming: ${error}`,
        })
        return false
      }

      // Show success message
      openDialog?.({
        heading: 'Trimming Started',
        children:
          'The trimming has been queued and will begin shortly. You will see progress updates here.',
      })

      // Restart subscription to monitor the trimming process
      startProcessingSubscription()

      return true
    } catch (err) {
      console.error(err)
      openDialog?.({
        heading: 'Trim Error',
        children: 'Failed to start trimming. Please try again.',
      })
      return false
    } finally {
      loading.set(false)
    }
  }

  const modifyItem = async (
    itemId: string,
    params: {
      crop?: { left: number; top: number; right: number; bottom: number }
      trim?: { startTime: number; endTime: number }
    },
  ) => {
    try {
      loading.set(true)
      const result = await sdk.modifyItem({
        itemId,
        crop: params.crop || null,
        trim: params.trim || null,
      })

      const error = getOperationResultError(result)
      if (error) {
        console.error(result)
        const operations = []
        if (params.crop) operations.push('cropping')
        if (params.trim) operations.push('trimming')
        openDialog?.({
          heading: 'Modification Error',
          children: `Failed to start ${operations.join(' and ')}: ${error}`,
        })
        return false
      }

      // Show success message
      const operations = []
      if (params.crop) operations.push('Crop')
      if (params.trim) operations.push('Trim')
      openDialog?.({
        heading: 'Processing Started',
        children: `The ${operations.join(' and ')} ${operations.length > 1 ? 'have' : 'has'} been queued and will begin shortly. You will see progress updates here.`,
      })

      // Restart subscription to monitor the process
      startProcessingSubscription()

      return true
    } catch (err) {
      console.error(err)
      openDialog?.({
        heading: 'Modification Error',
        children: 'Failed to apply modifications. Please try again.',
      })
      return false
    } finally {
      loading.set(false)
    }
  }

  const removeModifications = async (
    itemId: string,
    modifications: string[],
    clearAllModifications: boolean = false,
  ) => {
    try {
      loading.set(true)
      const result = await sdk.removeModifications({
        itemId,
        removeModifications: modifications,
        clearAllModifications,
      })

      const error = getOperationResultError(result)
      if (error) {
        console.error(result)
        openDialog?.({
          heading: 'Revert Error',
          children: `Failed to revert modifications: ${error}`,
        })
        return false
      }

      // Show success message
      const message = clearAllModifications
        ? 'Reverting to original file...'
        : `Removing ${modifications.length} modification(s)...`

      openDialog?.({
        heading: 'Revert Started',
        children: `${message} You will see progress updates here.`,
      })

      // Restart subscription to monitor the revert process
      startProcessingSubscription()

      return true
    } catch (err) {
      console.error(err)
      openDialog?.({
        heading: 'Revert Error',
        children: 'Failed to revert modifications. Please try again.',
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
        if (current.items[itemId].fileId) {
          sdk
            .deleteTemporaryFile({
              fileId: current.items[itemId].fileId,
            })
            .catch((error) => {
              console.warn('Failed to delete temporary file:', error)
            })
        }
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
    items,
    startEdit,
    cancelEdit,
    addFile,
    removeUploadItem,
    cancelUploadItem,
    submitEdit,
    setOpenDialog,
    cancelUpload,
    restartSubscription,
    deleteItem,
    deletePost,
    reorderItems,
    mergePost,
    moveItem,
    duplicateItem,
    convertItem,
    cropItem,
    trimItem,
    modifyItem,
    removeModifications,
  }
}

// Serialized formats for API communication
export type SerializedEditItem = {
  id: string
  description: string
  caption?: string
}

export type SerializedUploadItem = {
  fileId: string
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
  fileId: UpdateValue<string>
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
    .filter(
      (item): item is UploadItem => item.type === 'upload' && !!item.fileId,
    )
    .map(
      (item): SerializedUploadItem => ({
        fileId: item.fileId!,
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

  // Note: Upload items are not included in deserialization because they're
  // created during the upload process, not from saved data

  return {
    title: createUpdateValue(serialized.title),
    language: createUpdateValue(serialized.language),
    keywords: createUpdateValue(serialized.keywords),
    items,
    uploadQueue: [],
    currentUploadId: undefined,
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
    .filter(
      (item): item is UploadItem => item.type === 'upload' && !!item.fileId,
    )
    .map(
      (item): SerializedUploadItemWithValidation => ({
        fileId: createUpdateValue(item.fileId!),
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
 * @param currentData - Current PostUpdate data to preserve upload items
 * @returns PostUpdate - Complex structure with validation errors preserved
 */
export function deserializeEditDataWithValidation(
  serialized: SerializedEditDataWithValidation,
  postData?: PostItemType,
  currentData?: PostUpdate,
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

  // Convert new items (upload items) by finding them in current data and applying validation errors
  if (currentData) {
    serialized.newItems.forEach((serializedNewItem) => {
      const fileId = serializedNewItem.fileId.value
      // Find the corresponding upload item in current data by fileId
      const currentUploadItem = Object.values(currentData.items).find(
        (item): item is UploadItem =>
          item.type === 'upload' && item.fileId === fileId,
      )

      if (currentUploadItem) {
        // Preserve the original upload item but update the fields that have validation errors
        items[currentUploadItem.id] = {
          ...currentUploadItem,
          description: serializedNewItem.description,
          caption: serializedNewItem.caption,
          keywords: serializedNewItem.keywords,
          language: serializedNewItem.language,
        }
      }
    })

    // Also preserve any upload items that don't have fileIds yet (still uploading or queued)
    Object.values(currentData.items).forEach((item) => {
      if (item.type === 'upload' && !item.fileId) {
        items[item.id] = item
      }
    })
  }

  return {
    title: serialized.title,
    language: serialized.language,
    keywords: serialized.keywords,
    items,
    uploadQueue: currentData?.uploadQueue || [],
    currentUploadId: currentData?.currentUploadId,
    isUploading: currentData?.isUploading || false,
  }
}
