import { useResourcesQuery } from '@src/generated/graphql'
import React from 'react'

export default function useResources() {
  const { loading, error, data } = useResourcesQuery()

  return React.useMemo(() => {
    if (loading || error || !data || !data.resources) return null
    return `//${data.resources.resourceDomain}/${data.resources.resourcePath}`
  }, [data, error, loading])
}
