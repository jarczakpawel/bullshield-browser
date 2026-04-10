import React, { useEffect, useId, useState } from 'react'
import { i18n } from '~/i18n'
import { send } from '~/shared/messaging'
import { Grid, Input, Switch } from '../../shared/components'
import { useTitle, useSaveSettings } from '../../shared/hooks'

export default function General(): React.JSX.Element {
  useTitle(i18n('general_settings'))

  const saveSettings = useSaveSettings()

  const [enabled, setEnabled] = useState<boolean>()
  const [renewEnabled, setRenewEnabled] = useState<boolean>()
  const [renewIntervalSec, setRenewIntervalSec] = useState<number>()
  const [renewOnStartup, setRenewOnStartup] = useState<boolean>()
  const [jsProtectionEnabled, setJsProtectionEnabled] = useState<boolean>()

  const enabledId = useId()
  const renewIntervalSecId = useId()
  const renewOnStartupId = useId()
  const jsProtectionEnabledId = useId()

  useEffect(() => {
    send({ settings: undefined }).then(({ settings }) => {
      if (settings instanceof Error) throw settings
      setEnabled(settings.enabled)
      setRenewEnabled(settings.renew.enabled)
      setRenewIntervalSec(Math.round(settings.renew.intervalMillis / 1000))
      setRenewOnStartup(settings.renew.onStartup)
      setJsProtectionEnabled(settings.jsProtection.enabled)
    })
  }, [])

  const delayFor = { switch: 350, input: 550 }

  return (
    <>
      <h1>{i18n('general_settings')}</h1>
      <p>{i18n('general_settings_hint')}:</p>

      <Grid>
        <Grid.Row>
          <Grid.Column>
            <label htmlFor={enabledId}>{i18n('enable_switcher')}</label>
          </Grid.Column>
          <Grid.Column>
            <Switch id={enabledId} checked={enabled} onChange={async (value) => {
              setEnabled(value)
              await saveSettings({ enabled: value }, delayFor.switch)
            }} />
          </Grid.Column>
        </Grid.Row>

        <Grid.Row>
          <Grid.Column>
            <label htmlFor={renewIntervalSecId}>{i18n('auto_renew')}</label>
            <Grid.Hint>{i18n('auto_renew_interval')}:</Grid.Hint>
            <Input.Number
              disabled={!renewEnabled}
              value={renewIntervalSec}
              min={30}
              max={86400}
              step={10}
              size={8}
              placeholder="60"
              onChange={async (value) => {
                setRenewIntervalSec(value)
                await saveSettings({ renew: { intervalMillis: Math.round(value * 1000) } }, delayFor.input)
              }}
            />
          </Grid.Column>
          <Grid.Column>
            <Switch id={renewIntervalSecId} checked={renewEnabled} onChange={async (value) => {
              setRenewEnabled(value)
              await saveSettings({ renew: { enabled: value } }, delayFor.switch)
            }} />
          </Grid.Column>
        </Grid.Row>

        <Grid.Row>
          <Grid.Column>
            <label htmlFor={renewOnStartupId}>{i18n('auto_renew_on_startup')}</label>
          </Grid.Column>
          <Grid.Column>
            <Switch id={renewOnStartupId} checked={renewOnStartup} onChange={async (value) => {
              setRenewOnStartup(value)
              await saveSettings({ renew: { onStartup: value } }, delayFor.switch)
            }} />
          </Grid.Column>
        </Grid.Row>

        <Grid.Row>
          <Grid.Column>
            <label htmlFor={jsProtectionEnabledId}>{i18n('js_protection')}</label>
          </Grid.Column>
          <Grid.Column>
            <Switch id={jsProtectionEnabledId} checked={jsProtectionEnabled} onChange={async (value) => {
              setJsProtectionEnabled(value)
              await saveSettings({ jsProtection: { enabled: value } }, delayFor.switch)
            }} />
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </>
  )
}
