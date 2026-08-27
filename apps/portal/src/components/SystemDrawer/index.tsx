import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { atlasApps, getTargetByKey, recordLaunchTarget } from '@/config/apps'
import styles from './index.module.scss'

interface SystemDrawerProps {
  open: boolean
  onClose: () => void
}

export function SystemDrawer({ open, onClose }: SystemDrawerProps) {
  const firstSystemRef = useRef<HTMLAnchorElement | null>(null)
  const capabilityCount = atlasApps.reduce((count, app) => count + app.capabilities.length, 0)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => firstSystemRef.current?.focus(), 220)

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose])

  return (
    <section
      className={`${styles.menu} ${open ? styles.open : ''}`}
      aria-label="Atlas 产品与服务"
      aria-hidden={!open}
    >
      <header className={styles.menuHeading}>
        <div>
          <strong>产品与服务</strong>
          <span>{atlasApps.length} 个系统已接入 Atlas</span>
        </div>
      </header>

      <nav className={styles.systemGrid} aria-label="业务系统">
        {atlasApps.map((app, index) => {
          const target = getTargetByKey(`${app.id}:home`)!

          return (
            <a
              ref={index === 0 ? firstSystemRef : undefined}
              key={app.id}
              href={target.href}
              tabIndex={open ? 0 : -1}
              onClick={() => recordLaunchTarget(target)}
              style={
                {
                  '--item-index': index,
                  '--app-color': app.color,
                  '--app-tint': app.tint,
                } as React.CSSProperties
              }
            >
              <span className={styles.systemMark} aria-hidden="true">
                <img src={app.logo} alt="" />
              </span>
              <span className={styles.systemCopy}>
                <span className={styles.systemTitle}>
                  <strong>{app.name}</strong>
                  <small>{app.category}</small>
                </span>
                <em>{app.description}</em>
                <b>{app.capabilities.length} 个功能入口</b>
              </span>
              <ArrowRight aria-hidden="true" />
            </a>
          )
        })}
      </nav>

      <footer className={styles.menuFooter}>
        <span>{atlasApps.length} 个系统</span>
        <span>{capabilityCount} 个功能入口</span>
      </footer>
    </section>
  )
}
