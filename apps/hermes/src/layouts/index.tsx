import { Navigate, useParams } from 'react-router-dom'
import {
  AppWindow,
  Gauge,
  ScrollText,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { OperationsShell, type OperationsNavItem } from '@atlas/ui/operations-shell'
import { UserMenu } from '@atlas/ui/user-menu'
import { DomainContext } from '@/contexts/DomainContext'
import { DomainSwitcher } from '@/components/DomainSwitcher'
import styles from './index.module.scss'

function buildNav(base: string): OperationsNavItem[] {
  return [
    { label: '域概览', path: base, icon: <Gauge />, section: '当前域', end: true },
    { label: '应用', path: `${base}/applications`, icon: <AppWindow /> },
    { label: '服务', path: `${base}/services`, icon: <Server /> },
    { label: '用户组', path: `${base}/groups`, icon: <Users /> },
    {
      label: '权限关系',
      path: `${base}/relationships`,
      icon: <ShieldCheck />,
      section: '访问控制',
    },
    { label: '域与身份源', path: `${base}/settings`, icon: <Settings2 /> },
    { label: '用户查询', path: `${base}/users`, icon: <Search />, section: '观测' },
    { label: '审计信息', path: `${base}/audit`, icon: <ScrollText /> },
  ]
}

export function HermesLayout() {
  const { domainId } = useParams<{ domainId: string }>()
  if (!domainId) return <Navigate to="/" replace />
  const base = `/d/${encodeURIComponent(domainId)}`
  return (
    <DomainContext.Provider value={domainId}>
      <OperationsShell
        appName="Hermes"
        appDescription="身份与访问控制"
        brandMark={<img src="/hermes.svg" alt="" aria-hidden="true" />}
        environment={domainId}
        navItems={buildNav(base)}
        userMenu={
          <div className={styles.contextActions}>
            <DomainSwitcher currentDomainId={domainId} />
            <UserMenu brandColor="#d66b2c" showDocs />
          </div>
        }
      />
    </DomainContext.Provider>
  )
}
