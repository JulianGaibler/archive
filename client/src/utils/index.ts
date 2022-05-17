/* eslint-disable @typescript-eslint/ban-types */

export const attachHandlerProps = (
  handlers: Record<string, Function>,
  props: Record<string, Function>,
) => {
  if (!props) return handlers
  const result: Record<string, Function> = {}
  for (const handlerName of Object.keys(handlers)) {
    const handler = handlers[handlerName]
    const propHandler = props[handlerName]
    let attachedHandler
    if (typeof propHandler === 'function') {
      attachedHandler = (e: Event) => {
        propHandler(e)
        handler(e)
      }
    } else {
      attachedHandler = handler
    }
    result[handlerName] = attachedHandler
  }

  return result
}
