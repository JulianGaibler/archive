const idCounter = {}

function uniqueId(prefix = ''): string {
  if (!idCounter[prefix]) {
    idCounter[prefix] = 0
  }

  const id = ++idCounter[prefix]
  if (prefix === '') {
    return `${id}`
  }

  return `${prefix}${id}`
}

export default uniqueId
