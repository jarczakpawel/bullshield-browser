import type React from 'react'
import styles from './component.module.css'

type Props = {
  title: string
  onClick: () => void | Promise<void>
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export default function Button({ title, onClick, variant = 'primary', disabled = false }: Props): React.JSX.Element {
  return (
    <button className={`${styles.button} ${variant === 'secondary' ? styles.secondary : ''}`} onClick={onClick} disabled={disabled}>
      {title}
    </button>
  )
}
