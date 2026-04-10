import type React from 'react'
import { popupText } from '../../shared/text'
import styles from './component.module.css'

export default function ActiveUserAgent({
  userAgent,
  isLoading = false,
}: {
  userAgent?: string
  isLoading?: boolean
}): React.JSX.Element {
  const text = userAgent || (isLoading ? popupText('loading_active_profile') : popupText('no_active_profile'))
  return <div className={styles.active}>{text}</div>
}
