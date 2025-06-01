import { get, writable } from 'svelte/store'
import { Language, type getSdk, type PostQuery } from '@src/generated/graphql'
import { getOperationResultError } from '@src/utils'
import type { OpenDialog } from 'tint/components/Dialog.svelte'

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
}

export function createEditManager(
  sdk: ReturnType<typeof getSdk>,
  postData: PostItemType,
) {
  const post = writable<PostItemType>(postData)
  const data = writable<PostUpdate | undefined>(undefined)
  const loading = writable(false)
  let openDialog: OpenDialog | undefined = undefined

  const cancelEdit = () => {
    console.log('cancelEdit', get(data))
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
    })
  }

  const addFile = (file: File) => {
    if (get(loading)) return
    const type = file.type.split('/')[0]
    if (type !== 'image' && type !== 'video') {
      openDialog?.()
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

  const submitEdit = async () => {
    const $data = get(data)
    if (!$data) return
    loading.set(true)

    const postObject = get(post)

    try {
      const updateResult = await sdk.editPost({
        id: postObject.id,
        title: $data.title.value,
        language: $data.language.value,
        keywords: $data.keywords.value,
        items: Object.entries($data.items || {}).map(([id, item]) => ({
          id,
          description: item.description.value,
          caption: item.caption?.value,
        })),
      })

      if (getOperationResultError(updateResult)) {
        console.error(updateResult)
        data.update((current) => {
          if (current) {
            current.title.error = getOperationResultError(updateResult)
          }
          return current
        })
        return
      }

      data.set(undefined)
      post.set(updateResult.data.editPost as PostItemType)
    } catch (err) {
      data.update((current) => {
        console.error(err)
        if (current) {
          current.title.error = getOperationResultError(err)
        }
        return current
      })
    } finally {
      loading.set(false)
    }
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
  }
}
