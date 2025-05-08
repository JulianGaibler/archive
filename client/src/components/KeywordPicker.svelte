<script lang="ts">
  import AttributePicker from 'tint/components/AttributePicker.svelte'
  import {
    getSdk,
    type KeywordSearchQuery,
    type KeywordSearchQueryVariables,
  } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import { getOperationResultError } from '@src/utils'

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
    console.log('searchKeywords', search)
    const result = await sdk.keywordSearch({
      input: search,
    } as KeywordSearchQueryVariables)

    if (!result || 'errors' in result) {
      error = 'Error fetching keywords.'
      return {
        items: [],
        allowAdd: false,
      }
    }

    items = [
      ...items,
      ...(result.data.keywords?.edges
        ?.map((edge) => ({
          id: edge?.node?.id ?? '', // Ensure id is a string
          name: edge?.node?.name ?? '',
        }))
        .filter((item) => item.id !== '') ?? []), // Filter out invalid items
    ]
    error = undefined
    return {
      items:
        result.data.keywords?.edges?.map((edge) => ({
          value: edge?.node?.id,
          label: edge?.node?.name ?? '',
        })) ?? [],
      allowAdd: true,
    }
  }

  async function onitemadded(label: string) {
    const result = await sdk
      .createKeyword({
        name: label,
      })
      .catch((err) => {
        error = getOperationResultError(err)
      })
    if (!result) {
      return
    }
    if (getOperationResultError(result)) {
      error = getOperationResultError(result)
      return
    }
    items = [
      ...items,
      {
        id: result.data.createKeyword.id,
        name: result.data.createKeyword.name,
      },
    ]
    // add to the list of items
    value.push(result.data.createKeyword.id)
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
