import React from 'react'
import { Link, To } from 'react-router-dom'
import s from './Button.module.sass'

export enum ButtonKind {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  SECONDARY_TINTBAR = 'secondary_tintbar',
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
        className={`${s.button} ${s[kind]} ${large ? s.large : ''} ${
          icon && !children ? s.icon : ''
        } ${className}`}
      >
        {icon && icon}
        {children && children}
      </Link>
    ) : (
      <button
        ref={ref as unknown as React.Ref<HTMLButtonElement>}
        {...other}
        className={`${s.button} ${s[kind]} ${large ? s.large : ''} ${
          icon && !children ? s.icon : ''
        } ${className}`}
      >
        {icon && icon}
        {children && children}
      </button>
    )
  },
)
Button.displayName = 'Button'

export default Button
