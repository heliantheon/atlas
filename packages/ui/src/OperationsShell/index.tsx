import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Button, cn } from '@heliannuuthus/ui'
import { ChevronRight, Menu, X } from 'lucide-react'
import styles from './index.module.scss'

export interface OperationsNavItem {
  label: string
  path: string
  icon: ReactNode
  section?: string
  end?: boolean
}

export interface OperationsShellProps {
  appName: string
  appDescription: string
  brandMark?: ReactNode
  environment?: string
  navItems: OperationsNavItem[]
  status?: 'healthy' | 'degraded' | 'unknown'
  userMenu?: ReactNode
}

const statusLabels = {
  healthy: '运行正常',
  degraded: '部分降级',
  unknown: '状态未知',
} as const

export function OperationsShell({
  appName,
  appDescription,
  brandMark,
  environment = 'Production',
  navItems,
  status = 'unknown',
  userMenu,
}: OperationsShellProps) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeItem =
    [...navItems]
      .sort((left, right) => right.path.length - left.path.length)
      .find(item =>
        item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
      ) ?? navItems[0]

  useEffect(() => setMobileOpen(false), [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  let currentSection = ''

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#operations-main">
        跳到主要内容
      </a>

      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <Button
            className={styles.mobileTrigger}
            variant="ghost"
            size="icon"
            aria-label="打开导航"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu aria-hidden="true" />
          </Button>
          <a className={styles.atlasLink} href="https://atlas.heliannuuthus.com">
            <span className={styles.atlasWord}>ATLAS</span>
            <span className={styles.productDivider} aria-hidden="true" />
            <span className={styles.productName}>{appName}</span>
          </a>
        </div>

        <div className={styles.contextRail} aria-label="当前操作上下文">
          <span className={styles.environment}>{environment}</span>
          <ChevronRight aria-hidden="true" />
          <span>{activeItem?.label ?? '概览'}</span>
          <span className={styles.health} data-status={status}>
            <i aria-hidden="true" />
            {statusLabels[status]}
          </span>
        </div>

        <div className={styles.headerEnd}>{userMenu}</div>
      </header>

      <aside className={cn(styles.sidebar, mobileOpen && styles.sidebarOpen)}>
        <div className={styles.sidebarHead}>
          <div className={styles.brandMark}>{brandMark ?? appName.slice(0, 1)}</div>
          <div>
            <strong>{appName}</strong>
            <span>{appDescription}</span>
          </div>
          <Button
            className={styles.closeTrigger}
            variant="ghost"
            size="icon"
            aria-label="关闭导航"
            onClick={() => setMobileOpen(false)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        <nav className={styles.navigation} aria-label={`${appName} 主导航`}>
          {navItems.map(item => {
            const showSection = item.section && item.section !== currentSection
            if (item.section) currentSection = item.section
            return (
              <div key={item.path} className={styles.navGroup}>
                {showSection ? <div className={styles.navSection}>{item.section}</div> : null}
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => cn(styles.navItem, isActive && styles.navItemActive)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                  <ChevronRight className={styles.navArrow} aria-hidden="true" />
                </NavLink>
              </div>
            )
          })}
        </nav>

        <div className={styles.sidebarFoot}>
          <span>CONTROL PLANE</span>
          <strong>{environment}</strong>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="关闭导航"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <main id="operations-main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
