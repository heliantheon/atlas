import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Button, Kbd } from '@heliannuuthus/ui'
import { Grid3X3, Search, X } from 'lucide-react'
import { UserMenu } from '@atlas/ui/user-menu'
import { AppLauncher } from '@/components/AppLauncher'
import { SystemDrawer } from '@/components/SystemDrawer'
import styles from './index.module.scss'

export interface PortalOutletContext {
  openLauncher: () => void
  openSystems: () => void
}

export function PortalLayout() {
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [systemMenuOpen, setSystemMenuOpen] = useState(false)
  const systemButtonRef = useRef<HTMLButtonElement | null>(null)
  const closeSystems = useCallback(() => {
    setSystemMenuOpen(false)
    requestAnimationFrame(() => systemButtonRef.current?.focus())
  }, [])
  const openLauncher = useCallback(() => {
    setSystemMenuOpen(false)
    setLauncherOpen(true)
  }, [])

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openLauncher()
      }
    }
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [openLauncher])

  return (
    <div className={styles.layout}>
      <a className={styles.skipLink} href="#atlas-main">
        跳到主要内容
      </a>
      <header className={styles.header}>
        <div className={styles.leading}>
          <Button
            ref={systemButtonRef}
            variant="ghost"
            size="icon"
            aria-label={systemMenuOpen ? '关闭系统菜单' : '打开系统菜单'}
            aria-expanded={systemMenuOpen}
            onClick={() => setSystemMenuOpen(open => !open)}
          >
            {systemMenuOpen ? <X aria-hidden="true" /> : <Grid3X3 aria-hidden="true" />}
          </Button>
          <a href="/" className={styles.brand}>
            <img src="/atlas.svg" alt="" aria-hidden="true" />
            <span>
              <strong>ATLAS</strong>
              <small>OPERATIONS DIRECTORY</small>
            </span>
          </a>
        </div>
        <button type="button" className={styles.searchTrigger} onClick={openLauncher}>
          <Search aria-hidden="true" />
          <span>搜索系统与管理功能</span>
          <Kbd>⌘ K</Kbd>
        </button>
        <div className={styles.headerEnd}>
          <span className={styles.environment}>PRODUCTION</span>
          <UserMenu brandColor="#2467a6" compact={false} showNotifications={false} />
        </div>
      </header>

      {systemMenuOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          onClick={closeSystems}
          aria-label="关闭系统菜单"
        />
      ) : null}
      <SystemDrawer open={systemMenuOpen} onClose={closeSystems} />

      <main id="atlas-main" className={styles.content} tabIndex={-1}>
        <Outlet
          context={
            {
              openLauncher,
              openSystems: () => setSystemMenuOpen(true),
            } satisfies PortalOutletContext
          }
        />
      </main>
      <AppLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} />
    </div>
  )
}
