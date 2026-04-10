import React, { useCallback, useEffect, useState } from 'react'
import { i18n } from '~/i18n'
import { send } from '~/shared/messaging'
import { type SettingsGeneratorType } from '~/shared/types'
import { allSettingsGeneratorTypes } from '~/shared'
import { throwIfErr } from '../../shared'
import { Grid, Switch } from '../../shared/components'
import { useTitle, useSaveSettings, useRenewUserAgent } from '../../shared/hooks'
import styles from './page.module.css'

export default function Generator(): React.JSX.Element {
  useTitle(i18n('generator_settings'))

  const saveSettings = useSaveSettings()
  const renewUserAgent = useRenewUserAgent()
  const [current, setCurrent] = useState<Array<SettingsGeneratorType>>([])
  const [syncOsWithHost, setSyncOsWithHost] = useState(false)

  /** Refresh settings */
  const refresh = useCallback(() => {
    send({ settings: undefined }).then(({ settings }) => {
      if (settings instanceof Error) {
        throw settings
      }

      setCurrent([...settings.generator.types])
      setSyncOsWithHost(Boolean(settings.generator.syncOsWithHost))
    })
  }, [setCurrent])

  /** Handle checkbox change */
  const handleCheckboxChange = useCallback(
    (append: boolean, type: SettingsGeneratorType) => {
      setCurrent((prev) => {
        const newTypes = [...new Set(append ? [...prev, type] : prev.filter((t) => t !== type))].sort()

        saveSettings({ generator: { types: newTypes } }, 200)
          .then(() => renewUserAgent().catch(throwIfErr))
          .catch(throwIfErr)

        return newTypes
      })
    },
    [setCurrent, saveSettings, renewUserAgent]
  )

  const handleSyncOsChange = useCallback(
    (enabled: boolean) => {
      setSyncOsWithHost(enabled)

      saveSettings({ generator: { syncOsWithHost: enabled } }, 200)
        .then(() => renewUserAgent().catch(throwIfErr))
        .catch(throwIfErr)
    },
    [saveSettings, renewUserAgent]
  )

  // on component mount
  useEffect(() => {
    // refresh immediately
    refresh()

    if (chrome && chrome?.storage?.onChanged) {
      // add listener for changes
      chrome.storage.onChanged.addListener(refresh)

      // remove listener on component unmount
      return () => chrome.storage.onChanged.removeListener(refresh)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <h1>{i18n('generator_settings')}</h1>
      <p>{i18n('generator_settings_hint')}:</p>

      <Grid>
        <Grid.Row>
          <Grid.Column>
            <div className={styles.syncOsRow}>
              <Switch id="sync-os-with-host" checked={syncOsWithHost} onChange={handleSyncOsChange} />
              <label htmlFor="sync-os-with-host">{i18n('sync_useragent_with_host_os')}</label>
            </div>
            <ul className={styles.list}>
              {allSettingsGeneratorTypes.map((type): React.ReactNode => {
                return (
                  <li key={type}>
                    <Switch
                      id={type}
                      checked={current.includes(type)}
                      onChange={(isChecked) => handleCheckboxChange(isChecked, type)}
                    />
                    <label htmlFor={type}>{i18n(type)}</label>
                  </li>
                )
              })}
            </ul>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </>
  )
}
