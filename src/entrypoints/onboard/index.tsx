import type React from 'react'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { i18n } from '~/i18n'
import { UiLanguageSelect } from '~/shared/components/ui-language-select'
import {
  type UiLanguagePreference,
  askForPermissions,
  checkPermissions,
  getBrowserUiLocale,
  getUiLanguagePreference,
  hasSeenOnboarding,
  markOnboardingSeen,
  resolveUiLocale,
  setUiLanguagePreference,
  setUiLocaleOverride,
  watchUiLanguagePreference,
} from '~/shared'
import detectBrowser from '~/shared/detect-browser'
import { popupText } from '../popup/shared/text'
import Button from './components/button'
import Container from './components/container'
import '~/theme/theme.css'
import './index.css'

const permissionItems = (): string[] => [
  i18n('onboarding_permission_all_urls'),
  i18n('onboarding_permission_scripting'),
  i18n('onboarding_permission_dnr'),
  i18n('onboarding_permission_debugger'),
  i18n('onboarding_permission_cookies'),
  i18n('onboarding_permission_web_navigation'),
  i18n('onboarding_permission_storage'),
  i18n('onboarding_permission_tabs'),
  i18n('onboarding_permission_alarms'),
]

const doesNotItems = (): string[] => [
  i18n('onboarding_does_not_sell_data'),
  i18n('onboarding_does_not_ads'),
  i18n('onboarding_does_not_account'),
  i18n('onboarding_does_not_remote_code'),
]

const browser = detectBrowser()

type AppProps = {
  initialUiLanguage: UiLanguagePreference
}

const App = ({ initialUiLanguage }: AppProps): React.JSX.Element => {
  const [uiLanguage, setUiLanguage] = useState<UiLanguagePreference>(initialUiLanguage)
  const [alreadySeen, setAlreadySeen] = useState(true)
  const [acknowledged, setAcknowledged] = useState(false)
  const [hasPermissions, setHasPermissions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let mounted = true

    Promise.all([hasSeenOnboarding(), checkPermissions()])
      .then(([seen, granted]) => {
        if (!mounted) {
          return
        }

        setAlreadySeen(seen)
        setAcknowledged(seen)
        setHasPermissions(granted)
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    return watchUiLanguagePreference((preference) => {
      setUiLocaleOverride(resolveUiLocale(preference))
      setUiLanguage(preference)
    })
  }, [])

  const title = alreadySeen ? i18n('onboarding_returning_title') : i18n('onboarding_first_run_title')
  const subtitle = alreadySeen ? i18n('onboarding_returning_lead') : i18n('onboarding_first_run_lead')

  useEffect(() => {
    document.title = `${i18n('manifest_name', 'Bullshield')} - ${title}`
  }, [title])

  const handleUiLanguageChange = async (preference: UiLanguagePreference) => {
    setUiLocaleOverride(resolveUiLocale(preference))
    setUiLanguage(preference)
    await setUiLanguagePreference(preference)
  }

  const handleContinue = async () => {
    setError(undefined)
    setRequesting(true)

    try {
      if (!alreadySeen) {
        await markOnboardingSeen()
        setAlreadySeen(true)
        setAcknowledged(true)
      }

      if (hasPermissions) {
        window.close()
        return
      }

      if (browser === 'firefox' && (await askForPermissions())) {
        window.close()
        return
      }

      if (browser !== 'firefox') {
        window.close()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRequesting(false)
    }
  }

  return (
    <Container
      title={title}
      subtitle={subtitle}
      toolbar={
        <UiLanguageSelect
          browserLocale={getBrowserUiLocale()}
          label={popupText('language')}
          value={uiLanguage}
          onChange={handleUiLanguageChange}
        />
      }
    >
      <div className="onboardCard">
        {!alreadySeen && <div className="onboardBadge">{i18n('onboarding_first_run_badge')}</div>}

        <div className="onboardSection">
          <h2 className="onboardSectionTitle">{i18n('onboarding_permissions_title')}</h2>
          <ul>
            {permissionItems().map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="onboardSection">
          <h2 className="onboardSectionTitle">{i18n('onboarding_does_not_title')}</h2>
          <ul>
            {doesNotItems().map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="onboardSection">
          <h2 className="onboardSectionTitle">{i18n('onboarding_local_data_title')}</h2>
          <p>{i18n('onboarding_local_data_text')}</p>
        </div>

        {!hasPermissions && browser === 'chrome' && (
          <div className="onboardSection">
            <h2 className="onboardSectionTitle">{i18n('onboarding_site_access_title')}</h2>
            <p>{i18n('onboarding_site_access_chrome')}</p>
          </div>
        )}

        {!alreadySeen && !loading && (
          <label className="onboardCheckbox">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
            <span>{i18n('onboarding_acknowledge')}</span>
          </label>
        )}

        <div className="onboardActions">
          <Button title={i18n(hasPermissions || browser !== 'firefox' ? 'onboarding_continue_button' : 'grant_permission_button')} onClick={handleContinue} disabled={loading || requesting || !acknowledged} />
          <Button title={i18n('onboarding_not_now')} onClick={() => window.close()} variant="secondary" disabled={requesting} />
        </div>

        {error && <div className="onboardError">{error}</div>}

        <div className="onboardFootnote">{i18n('onboarding_notice')}</div>
      </div>
    </Container>
  )
}

const mount = async (): Promise<void> => {
  const initialUiLanguage = await getUiLanguagePreference()
  setUiLocaleOverride(resolveUiLocale(initialUiLanguage))

  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <App initialUiLanguage={initialUiLanguage} />
    </StrictMode>
  )
}

void mount()
