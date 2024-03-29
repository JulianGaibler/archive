import { useUniqueId } from '@src/hooks/useUniqueId'
import React from 'react'
import s from './TextField.module.sass'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
  label: string
  value?: string
  onValue?: (value: string) => void
  helperText?: string
  error?: string
}

const defaultValues = {
  value: '',
}

const TextField = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const { label, helperText, error, value, onValue, className, ...other } = {
    ...defaultValues,
    ...props,
  }
  const id = useUniqueId()
  const helperId = useUniqueId()

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (onValue) {
        onValue(event.target.value)
      }
    },
    [onValue],
  )

  return (
    <div className={`${error ? s.error : ''} ${className}`}>
      <div className={s.box}>
        <input
          id={id}
          ref={ref}
          value={value}
          onChange={handleChange}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={helperText || error ? helperId : undefined}
          className={value?.length > 0 ? s.filled : ''}
          {...other}
        />
        <label htmlFor={id}>{label}</label>
      </div>
      {(helperText || error) && (
        <div id={helperId} className={s.helper_message}>
          {error || helperText}
        </div>
      )}
    </div>
  )
})
TextField.displayName = 'TextField'

export default TextField
