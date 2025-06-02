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
  postData: PostItemType,
) {
  const post = writable<PostItemType>(postData)
  const data = writable<PostUpdate | undefined>(undefined)
  const loading = writable(false)
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
              const newPost = { ...currentPost }

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

  // Start subscription on initialization if there are processing items
  startProcessingSubscription()

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
    loading.set(true)

    const postObject = get(post)
    const hasNewFiles = Object.keys($data.uploadItems || {}).length > 0

    try {
      let uploadId: string | undefined
      let uploadController: UploadController | undefined
      const headers: Record<string, string> = {}

      if (hasNewFiles) {
        ;[uploadId, uploadController] = createUploadController()
        headers[UPLOAD_ID_HEADER] = uploadId!
        // Store the upload controller in the data only if uploading files
        data.update((current) => {
          if (current) {
            current.uploadController = uploadController
            current.isUploading = true
          }
          return current
        })
      } else {
        // No files to upload, so not uploading
        data.update((current) => {
          if (current) {
            current.uploadController = undefined
            current.isUploading = false
          }
          return current
        })
      }

      const updateResult = await sdk.editPost(
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

      if (getOperationResultError(updateResult)) {
        console.error(updateResult)
        data.update((current) => {
          if (current) {
            current.title.error = getOperationResultError(updateResult)
            current.isUploading = false
            current.uploadController = undefined
          }
          return current
        })
        return
      }

      data.set(undefined)
      post.set(updateResult.data.editPost as PostItemType)

      // Restart subscription for any new processing items
      startProcessingSubscription()
    } catch (err) {
      data.update((current) => {
        console.error(err)
        if (current) {
          current.title.error = getOperationResultError(err)
          current.isUploading = false
          current.uploadController = undefined
        }
        return current
      })
    } finally {
      loading.set(false)
    }
  }

  const restartSubscription = () => {
    startProcessingSubscription()
  }

  return {
    post,
    data,
    loading,
    startEdit,
    cancelEdit,
    addFile,
    submitEdit,
    setOpenDialog,
    cancelUpload,
    restartSubscription,
  }
}
