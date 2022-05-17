import { customAlphabet } from 'nanoid/non-secure'
import React from 'react'

const alphabet =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const nanoid = customAlphabet(alphabet, 5)

export const useUniqueId = (): string => {
  const [id] = React.useState(nanoid())
  return id
}
