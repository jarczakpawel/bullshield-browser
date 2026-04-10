import type React from 'react'
import logo from '~/shared/assets/logo.webp'
import styles from './component.module.css'

type Props = {
  title: string
  subtitle: string
  toolbar?: React.ReactNode
  children?: React.ReactNode
}

export default function Container({ title, subtitle, toolbar = null, children = null }: Props): React.JSX.Element {
  return (
    <div className={styles.container}>
      <main className={styles.wrapper}>
        <div className={styles.left}>
          <img alt="Bullshield" src={logo} className={styles.logo} />
        </div>
        <div className={styles.right}>
          <div className={styles.header}>
            <div className={styles.headerText}>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.subtitle}>{subtitle}</p>
            </div>
            {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
          </div>
          <div className={styles.content}>{children}</div>
        </div>
      </main>
    </div>
  )
}
