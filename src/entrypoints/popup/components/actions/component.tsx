import type React from 'react'
import { i18n } from '~/i18n'
import Icon, { type IconProps } from '~/shared/components/icon'
import { HistoryIcon, PauseIcon, RefreshIcon, UnpauseIcon } from '~/shared/assets/icons'
import { popupText } from '../../shared/text'
import styles from './component.module.css'

export default function Actions({
  isExtensionEnabled,
  onPauseResumeClick,
  onRefreshClick,
  onAddToHistoryClick,
}: {
  isExtensionEnabled: boolean
  onPauseResumeClick?: (newEnabled: boolean) => void
  onRefreshClick?: () => void
  onAddToHistoryClick?: () => void
}): React.JSX.Element {
  const iconProps: Omit<IconProps, 'src'> = { size: '1.89em', clickable: true }

  return (
    <>
      <div
        className={styles.action + (isExtensionEnabled ? '' : ` ${styles.blinkingBackground}`)}
        onClick={(): void => onPauseResumeClick?.(!isExtensionEnabled)}
      >
        <div className={styles.icon}>
          <Icon src={isExtensionEnabled ? PauseIcon : UnpauseIcon} {...iconProps} />
        </div>
        <span>
          {i18n(
            isExtensionEnabled ? 'pause_switcher' : 'unpause_switcher',
            isExtensionEnabled ? 'Pause protection' : 'Resume protection'
          )}
        </span>
      </div>
      <div className={styles.action} onClick={onRefreshClick}>
        <div className={styles.icon}>
          <Icon src={RefreshIcon} {...iconProps} />
        </div>
        <span>{i18n('get_new_agent')}</span>
      </div>
      <div className={styles.action} onClick={onAddToHistoryClick}>
        <div className={styles.icon}>
          <Icon src={HistoryIcon} {...iconProps} />
        </div>
        <span>{popupText('add_to_history')}</span>
      </div>
    </>
  )
}
