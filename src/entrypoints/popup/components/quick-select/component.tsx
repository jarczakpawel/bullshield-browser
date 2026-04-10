import React, { useCallback, useId, useMemo, useState, type ReactNode } from 'react'
import { i18n } from '~/i18n'
import Icon, { type IconProps } from '~/shared/components/icon'
import {
  AndroidIcon,
  ChromeIcon,
  EdgeIcon,
  FirefoxIcon,
  IosIcon,
  LinuxIcon,
  MacosIcon,
  OperaIcon,
  SafariIcon,
  WindowsIcon,
} from '~/shared/assets/icons'
import { type BrowserType, generatorTypesToSets, type OSType, setsToGeneratorTypes } from '~/shared'
import Checkbox from '../../shared/components/checkbox'
import styles from './component.module.css'

export type QuickSelectProps = {
  defaults?: { browsers: Array<BrowserType>; os: Array<OSType>; syncOs: boolean }
  onChange?: ({ browsers, os, syncOs }: { browsers: Array<BrowserType>; os: Array<OSType>; syncOs: boolean }) => void
}

const uniqSorted = <T extends string>(values: ReadonlyArray<T>): Array<T> => Array.from(new Set(values)).sort()

const supportedOsForBrowsers = (browsers: ReadonlyArray<BrowserType>): Array<OSType> => {
  const [, oses] = generatorTypesToSets(setsToGeneratorTypes(browsers.length ? [...browsers] : 'any', 'any'))
  return [...oses]
}

const supportedBrowsersForOs = (os: ReadonlyArray<OSType>): Array<BrowserType> => {
  const [browsers] = generatorTypesToSets(setsToGeneratorTypes('any', os.length ? [...os] : 'any'))
  return [...browsers]
}

const normalizeSelection = (
  browsersInput: ReadonlyArray<BrowserType>,
  osInput: ReadonlyArray<OSType>
): { browsers: Array<BrowserType>; os: Array<OSType> } => {
  let browsers = uniqSorted(browsersInput)
  let os = uniqSorted(osInput)

  if (!browsers.length && os.length) {
    browsers = supportedBrowsersForOs(os)
  }

  if (!browsers.length) {
    browsers = ['chrome']
  }

  const allowedOs = supportedOsForBrowsers(browsers)
  os = os.filter((value) => allowedOs.includes(value))

  if (!os.length) {
    os = [...allowedOs]
  }

  return { browsers, os }
}

export default function QuickSelect({
  defaults = { browsers: [], os: [], syncOs: false },
  onChange = undefined,
}: QuickSelectProps): React.JSX.Element {
  const [browserTypes, setBrowserTypes] = useState<BrowserType[]>(() => normalizeSelection(defaults.browsers || [], defaults.os || []).browsers)
  const [osList, setOsList] = useState<OSType[]>(() => normalizeSelection(defaults.browsers || [], defaults.os || []).os)
  const [syncOs, setSyncOs] = useState<boolean>(defaults?.syncOs || false)

  const supportedOSes = useMemo(() => supportedOsForBrowsers(browserTypes), [browserTypes])

  const handleBrowserChange = useCallback(
    (type: BrowserType) =>
      setBrowserTypes((prev) => {
        const nextBrowsers = prev.includes(type) ? prev.filter((value) => value !== type) : [...prev, type]
        const normalized = normalizeSelection(nextBrowsers, osList)

        setOsList(normalized.os)
        onChange?.({ browsers: normalized.browsers, os: normalized.os, syncOs })

        return normalized.browsers
      }),
    [onChange, osList, syncOs]
  )

  const handleSyncOsChange = useCallback(
    (isChecked: boolean) =>
      setSyncOs(() => {
        onChange?.({ browsers: browserTypes, os: osList, syncOs: isChecked })
        return isChecked
      }),
    [browserTypes, onChange, osList]
  )

  const handleOsChange = useCallback(
    (os: OSType) => {
      if (syncOs) {
        return
      }

      setOsList((prev) => {
        const nextOs = prev.includes(os) ? prev.filter((value) => value !== os) : [...prev, os]
        const normalized = normalizeSelection(browserTypes, nextOs)

        setBrowserTypes(normalized.browsers)
        onChange?.({ browsers: normalized.browsers, os: normalized.os, syncOs })

        return normalized.os
      })
    },
    [browserTypes, onChange, syncOs]
  )

  const syncOsId = useId()
  const iconProps: Omit<IconProps, 'src'> = { size: 24, clickable: true }

  return (
    <div className={styles.quickSelect}>
      <section className={styles.section}>
        <ul className={styles.options}>
          {((items: { type: BrowserType; title: string; icon: IconProps['src'] }[]): ReactNode => {
            return items.map(({ type, title, icon }) => {
              return (
                <li
                  className={[styles.item, browserTypes.includes(type) ? styles.active : null].filter(Boolean).join(' ')}
                  onClick={() => handleBrowserChange(type)}
                  title={title}
                  key={type}
                >
                  <Icon src={icon} {...iconProps} />
                </li>
              )
            })
          })([
            { type: 'chrome', title: 'Chrome', icon: ChromeIcon },
            { type: 'firefox', title: 'Firefox', icon: FirefoxIcon },
            { type: 'safari', title: 'Safari', icon: SafariIcon },
            { type: 'edge', title: 'Edge', icon: EdgeIcon },
            { type: 'opera', title: 'Opera', icon: OperaIcon },
          ])}
        </ul>
      </section>

      <section className={styles.switch}>
        <div className={styles.switchLabel}>
          <label htmlFor={syncOsId}>{i18n('sync_useragent_with_host_os')}</label>
        </div>
        <div className={styles.switchAction}>
          <Checkbox id={syncOsId} checked={syncOs} onChange={handleSyncOsChange} />
        </div>
      </section>

      <section className={styles.section}>
        <ul className={[styles.options, syncOs ? styles.disabledOptions : ''].filter(Boolean).join(' ')}>
          {((items: { os: OSType; title: string; icon: IconProps['src'] }[]): ReactNode => {
            return items.map(({ os, title, icon }) => {
              if (supportedOSes.length && !supportedOSes.includes(os)) {
                return null
              }

              return (
                <li
                  className={[styles.item, osList.includes(os) ? styles.active : null, syncOs ? styles.disabledItem : null].filter(Boolean).join(' ')}
                  onClick={() => handleOsChange(os)}
                  title={syncOs ? `${title} (${i18n('sync_useragent_with_host_os')})` : title}
                  key={os}
                >
                  <Icon src={icon} {...iconProps} />
                </li>
              )
            })
          })([
            { os: 'linux', title: 'Linux', icon: LinuxIcon },
            { os: 'windows', title: 'Windows', icon: WindowsIcon },
            { os: 'macos', title: 'macOS', icon: MacosIcon },
            { os: 'ios', title: 'iOS', icon: IosIcon },
            { os: 'android', title: 'Android', icon: AndroidIcon },
          ])}
        </ul>
      </section>
    </div>
  )
}
