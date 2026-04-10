import type React from 'react'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import {
  type UiLanguagePreference,
  getUiLanguagePreference,
  resolveUiLocale,
  setUiLocaleOverride,
  watchUiLanguagePreference,
} from '~/shared'
import { routes } from './routes'
import ErrorBoundary, { NotificationProvider, useNotification } from './shared/hooks'
import '~/theme/theme.css'
import './index.css'

const App = ({ initialUiLanguage }: { initialUiLanguage: UiLanguagePreference }): React.JSX.Element => {
  const { show } = useNotification()
  const [uiLanguage, setUiLanguage] = useState(initialUiLanguage)

  useEffect(() => {
    return watchUiLanguagePreference((preference) => {
      setUiLocaleOverride(resolveUiLocale(preference))
      setUiLanguage(preference)
    })
  }, [])

  return (
    <ErrorBoundary
      onError={async (err) => {
        show({ type: 'error', message: err.message, delay: 30 * 1000 })
      }}
    >
      <RouterProvider key={uiLanguage} router={createHashRouter(routes)} />
    </ErrorBoundary>
  )
}

const mount = async (): Promise<void> => {
  const initialUiLanguage = await getUiLanguagePreference()
  setUiLocaleOverride(resolveUiLocale(initialUiLanguage))

  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <NotificationProvider>
        <App initialUiLanguage={initialUiLanguage} />
      </NotificationProvider>
    </StrictMode>
  )
}

void mount()
