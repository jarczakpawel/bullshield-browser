import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { i18n } from '~/i18n'
import { popupText } from '~/entrypoints/popup/shared/text'
import { UiLanguageSelect } from '~/shared/components/ui-language-select'
import {
  type UiLanguagePreference,
  getBrowserUiLocale,
  getCachedUiLanguagePreference,
  resolveUiLocale,
  setUiLanguagePreference,
  setUiLocaleOverride,
  watchUiLanguagePreference,
} from '~/shared'
import { pathTo, RouteIDs, useCurrentRouteID } from '../routes'
import styles from './layout.module.css'

const githubUrl = 'https://github.com/jarczakpawel/bullshield-browser'
const version = chrome.runtime.getManifest().version

function normalizeWheelDelta(event: WheelEvent, content: HTMLElement): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    const lineHeight = Number.parseFloat(getComputedStyle(content).lineHeight)
    return event.deltaY * (Number.isFinite(lineHeight) ? lineHeight : 16)
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * content.clientHeight
  }

  return event.deltaY
}

export default function Layout(): React.JSX.Element {
  const currentRouteID = useCurrentRouteID()
  const [uiLanguage, setUiLanguage] = useState<UiLanguagePreference>(getCachedUiLanguagePreference())
  const mainRef = useRef<HTMLElement>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLElement>(null)

  useEffect(() => {
    return watchUiLanguagePreference((preference) => {
      setUiLocaleOverride(resolveUiLocale(preference))
      setUiLanguage(preference)
    })
  }, [])

  useEffect(() => {
    const main = mainRef.current

    if (!main) {
      return
    }

    const handleWheel = (event: WheelEvent) => {
      if (window.innerWidth <= 860 || event.ctrlKey) {
        return
      }

      const target = event.target
      const navigation = navigationRef.current
      const content = contentRef.current

      if (!(target instanceof Node) || !navigation || !content) {
        return
      }

      if (navigation.contains(target)) {
        return
      }

      if (
        target instanceof Element &&
        target.closest('select, textarea, input, [contenteditable="true"]')
      ) {
        return
      }

      const maxScrollTop = content.scrollHeight - content.clientHeight

      if (maxScrollTop <= 0) {
        return
      }

      const deltaY = normalizeWheelDelta(event, content)
      const nextScrollTop = Math.min(maxScrollTop, Math.max(0, content.scrollTop + deltaY))

      if (nextScrollTop === content.scrollTop) {
        return
      }

      if (event.cancelable) {
        event.preventDefault()
      }

      content.scrollTop = nextScrollTop
    }

    main.addEventListener('wheel', handleWheel, { capture: true, passive: false })

    return () => {
      main.removeEventListener('wheel', handleWheel, true)
    }
  }, [])

  const handleUiLanguageChange = async (preference: UiLanguagePreference) => {
    setUiLocaleOverride(resolveUiLocale(preference))
    setUiLanguage(preference)
    await setUiLanguagePreference(preference)
  }

  const menuItems = [
    { routeID: RouteIDs.GENERAL, title: i18n('general_settings') },
    { routeID: RouteIDs.FINGERPRINT, title: i18n('fingerprint_settings') },
    { routeID: RouteIDs.GENERATOR, title: i18n('generator_settings') },
    { routeID: RouteIDs.BLACKLIST, title: i18n('blacklist_settings') },
  ]

  return (
    <main ref={mainRef} className={styles.main}>
      <section className={styles.container}>
        <nav ref={navigationRef} className={styles.navigation}>
          <div className={styles.sidebarTop}>
            <UiLanguageSelect
              browserLocale={getBrowserUiLocale()}
              label={popupText('language')}
              value={uiLanguage}
              onChange={handleUiLanguageChange}
              className={styles.languageSelect}
            />
          </div>
          <div className={styles.sidebarDivider} />
          <ul className={styles.navList}>
            {menuItems.map(({ routeID, title }) => (
              <li key={routeID} className={routeID === currentRouteID ? styles.selectedPage : undefined}>
                <Link to={pathTo(routeID)}>{title}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <aside ref={contentRef} className={styles.content}>
          <Outlet />
        </aside>
      </section>
      <footer className={styles.footer}>
        <div>
          <span>Bullshield v{version}</span>
          <span className={styles.footerSeparator}>-</span>
          <a href={githubUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </main>
  )
}
