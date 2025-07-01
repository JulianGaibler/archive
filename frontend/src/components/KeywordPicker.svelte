<script lang="ts">
  import AttributePicker from 'tint/components/AttributePicker.svelte'
  import {
    getSdk,
    type KeywordSearchQueryVariables,
  } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import { getOperationResultError } from '@src/graphql-errors'

  const sdk = getSdk(webClient)

  type KeywordItem = {
    id: string
    name: string
  }

  interface Props {
    id: string
    value: string[]
    initialItems: KeywordItem[]
    disabled?: boolean
  }

  let { id, value = $bindable(), initialItems, disabled }: Props = $props()

  let items = $state(initialItems)
  let convertedItems = $derived(
    items.map((item) => ({
      value: item.id,
      label: item.name,
    })),
  )
  let error = $state<string | undefined>(undefined)

  async function searchKeywords(search: string) {
    const trimmedSearch = search.trim().toLowerCase()
    const result = await sdk.keywordSearch({
      input: search,
    } as KeywordSearchQueryVariables)

    if (!result || ('errors' in result && result.errors !== undefined)) {
      error = 'Error fetching keywords.'
      return {
        items: [],
        allowAdd: false,
      }
    }

    const fetchedItems =
      result.data.keywords?.nodes
        ?.map((node) => ({
          id: node.id ?? '',
          name: node.name ?? '',
        }))
        .filter((item) => item.id !== '') ?? []

    items = [...items, ...fetchedItems]
    error = undefined

    const exists = fetchedItems.some(
      (item) => item.name.trim().toLowerCase() === trimmedSearch,
    )

    return {
      items: fetchedItems.map((item) => ({
        value: item.id,
        label: item.name,
      })),
      allowAdd: !exists && trimmedSearch.length > 2,
    }
  }

  async function onitemadded(label: string) {
    const result = await sdk
      .createKeyword({
        name: label,
      })
      .catch((err) => {
        error = getOperationResultError(err)?.message
      })
    if (!result) {
      return
    }
    const potentialError = getOperationResultError(result)
    if (potentialError) {
      error = potentialError.message
      return
    }
    items = [
      ...items,
      {
        id: result.data.createKeyword.id,
        name: result.data.createKeyword.name,
      },
    ]
    value = [...value, result.data.createKeyword.id]
  }
</script>

<AttributePicker
  {id}
  label="Keywords"
  placeholder="Select keyword..."
  {disabled}
  bind:value
  items={convertedItems}
  dynamicItems={searchKeywords}
  {onitemadded}
  {error}
/>
