import type React from 'react'
import { useId } from 'react'
import type { LocaleCode } from '~/i18n'
import {
  type UiLanguagePreference,
  getUiLocaleCodeLabel,
  getUiLocaleLabel,
  supportedUiLocales,
} from '~/shared/ui-language'
import styles from './component.module.css'

export default function UiLanguageSelect({
  browserLocale,
  label,
  value,
  onChange,
  className,
}: {
  browserLocale: LocaleCode
  label: string
  value: UiLanguagePreference
  onChange: (value: UiLanguagePreference) => void
  className?: string
}): React.JSX.Element {
  const selectId = useId()

  return (
    <label className={[styles.wrapper, className].filter(Boolean).join(' ')} htmlFor={selectId}>
      <span className={styles.label}>{label}</span>
      <select
        id={selectId}
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as UiLanguagePreference)}
      >
        <option value="auto">↺ {getUiLocaleLabel(browserLocale)} ({getUiLocaleCodeLabel(browserLocale)})</option>
        {supportedUiLocales.map((locale) => (
          <option key={locale} value={locale}>
            {getUiLocaleLabel(locale)} ({getUiLocaleCodeLabel(locale)})
          </option>
        ))}
      </select>
    </label>
  )
}
