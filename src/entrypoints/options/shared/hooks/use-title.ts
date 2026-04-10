import { useEffect } from 'react'
import { i18n } from '~/i18n'

/** Sets the title of the current page and restores the previous title on unmount. */
export default function (title: string): void {
  useEffect((): undefined | (() => void) => {
    const originalTitle: Readonly<string> = document.title
    const appTitle = i18n('manifest_name', 'Bullshield')

    document.title = `${appTitle} - ${title}`

    return (): void => {
      document.title = originalTitle
    }
  }, [title])
}
