import React from 'react'
import { Link, To } from 'react-router-dom'
import './Button.sass'

export enum ButtonKind {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  SECONDARY_TINTBAR = 'secondary-tintbar',
  DESTRUCTIVE = 'destructive',
}

interface Props extends React.ButtonHTMLAttributes<HTMLElement> {
  kind?: ButtonKind
  large?: boolean
  children?: React.ReactNode
  icon?: React.ReactNode
  className?: string
  to?: To | null
}

const defaultValues = {
  kind: ButtonKind.SECONDARY,
  large: false,
  to: null,
}

const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(
  (props, ref) => {
    const { kind, large, children, icon, className, to, ...other } = {
      ...defaultValues,
      ...props,
    }

    return to !== null ? (
      <Link
        ref={ref as unknown as React.Ref<HTMLAnchorElement>}
        to={to}
        {...other}
        className={`archive--button archive--button--${kind} ${
          large ? 'archive--button--large' : ''
        } ${icon && !children ? 'archive--button--icon' : ''} ${className}`}
      >
        {icon && icon}
        {children && children}
      </Link>
    ) : (
      <button
        ref={ref as unknown as React.Ref<HTMLButtonElement>}
        {...other}
        className={`archive--button archive--button--${kind} ${
          large ? 'archive--button--large' : ''
        } ${icon && !children ? 'archive--button--icon' : ''} ${className}`}
      >
        {icon && icon}
        {children && children}
      </button>
    )
  },
)
Button.displayName = 'Button'

export default Button
