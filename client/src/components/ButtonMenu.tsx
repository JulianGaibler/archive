import s from './ButtonMenu.module.sass'
import React from 'react'
import ReactDOM from 'react-dom'

const WINDOW_PADDING = 8

type ButtonMenuProps = {
  children: React.ReactNode
  ctx: MenuContext
  className?: string
}

type MenuContext = {
  show: boolean
  anchorRef: React.MutableRefObject<HTMLElement | null>
  trigger: () => void
  hide: () => void
}

/** Menu hook */
export const useContextMenu = (): MenuContext => {
  const [show, setShow] = React.useState<boolean>(false)
  const anchorRef = React.useRef<HTMLElement | null>(null)
  const focusElement = React.useRef<HTMLElement | null>(null)

  const trigger = () => {
    focusElement.current = document.activeElement as HTMLElement
    setShow(true)
  }
  const hide = () => {
    focusElement.current?.focus()
    setShow(false)
  }

  return {
    show,
    trigger,
    hide,
    anchorRef,
  }
}

export const ButtonMenu = (props: ButtonMenuProps): JSX.Element => {
  const [position, setPosition] = React.useState<{
    x: number
    y: number
    height: number | undefined
  }>({
    x: -1000,
    y: -1000,
    height: undefined,
  })
  const menuRef = React.useRef<HTMLDivElement | null>(null)

  const setMenuRef = React.useCallback(
    (ref: HTMLDivElement | null) => {
      menuRef.current = ref
      if (!props.ctx.anchorRef.current || !ref) return
      ref.focus()
      const position = calculatePosition(
        props.ctx.anchorRef.current?.getBoundingClientRect(),
        ref?.getBoundingClientRect(),
      )
      setPosition(position)
    },
    [props.ctx.anchorRef],
  )

  React.useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        props.ctx.hide()
      }
    }
    const handleResize = () => {
      if (!props.ctx.anchorRef.current || !menuRef.current) return
      const position = calculatePosition(
        props.ctx.anchorRef.current?.getBoundingClientRect(),
        menuRef.current?.getBoundingClientRect(),
      )
      setPosition(position)
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [props.ctx, props.ctx.anchorRef])

  if (!props.ctx.show) {
    return <></>
  }

  // create portal with child in it
  return ReactDOM.createPortal(
    <>
      <div onClick={() => props.ctx.hide()} className={s.overlay}></div>
      <div
        ref={setMenuRef}
        role="menu"
        tabIndex={-1}
        className={`${s.menu} ${props.className || ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          height: position.height ? `${position.height}px` : 'auto',
        }}
      >
        {props.children}
      </div>
    </>,
    document.body,
  )
}

function calculatePosition(parentItemRect: DOMRect, menuRect: DOMRect) {
  const coords: {
    x: number
    y: number
    height: number | undefined
  } = {
    x: 0,
    y: 0,
    height: undefined,
  }

  coords.x = parentItemRect.x - 1
  coords.y = parentItemRect.y + parentItemRect.height
  if (coords.x + menuRect.width > window.innerWidth - WINDOW_PADDING) {
    coords.x =
      window.innerWidth -
      menuRect.width -
      parentItemRect.width / 2 -
      WINDOW_PADDING +
      1
  }

  // Check if window overflows at the bottom
  if (coords.y + menuRect.height > window.innerHeight - WINDOW_PADDING) {
    coords.y = window.innerHeight - menuRect.height - WINDOW_PADDING
    // Check if window overflows at the top
    if (coords.y < WINDOW_PADDING) {
      coords.height = window.innerHeight - coords.y - WINDOW_PADDING * 2
    }
  }

  if (coords.y < WINDOW_PADDING) {
    coords.y = WINDOW_PADDING
    // Check if window overflows at the bottom
    if (coords.y + menuRect.height > window.innerHeight - WINDOW_PADDING) {
      coords.height = window.innerHeight - coords.y - WINDOW_PADDING * 3
    }
  }

  return coords
}
