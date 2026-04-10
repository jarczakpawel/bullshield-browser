import type React from 'react'
import { i18n } from '~/i18n'
import { popupText } from '../../shared/text'
import styles from './component.module.css'

export default function Header({ isExtensionEnabled }: { isExtensionEnabled: boolean }): React.JSX.Element {
  return (
    <header className={styles.header}>
      <div className={styles.caption}>{i18n('active_user_agent')}</div>
      <div className={`${styles.status} ${isExtensionEnabled ? styles.enabled : styles.disabled}`}>
        <span className={styles.dot} />
        <span>{popupText(isExtensionEnabled ? 'active_status' : 'inactive_status')}</span>
      </div>
    </header>
  )
}
