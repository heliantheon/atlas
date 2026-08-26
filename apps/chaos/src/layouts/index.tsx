import { FileText, Gauge, ScrollText, UploadCloud } from 'lucide-react'
import { OperationsShell, type OperationsNavItem } from '@atlas/ui/operations-shell'
import { UserMenu } from '@atlas/ui/user-menu'

const navItems: OperationsNavItem[] = [
  { label: '运行概览', path: '/dashboard', icon: <Gauge />, section: '运行态', end: true },
  { label: '日志检索', path: '/logs', icon: <ScrollText />, end: true },
  { label: '邮件模板', path: '/templates', icon: <FileText />, section: '投递资产' },
  { label: '对象上传', path: '/files', icon: <UploadCloud />, end: true },
]

export function ChaosLayout() {
  return (
    <OperationsShell
      appName="Chaos"
      appDescription="投递与对象存储"
      brandMark={<img src="/chaos.svg" alt="" aria-hidden="true" />}
      navItems={navItems}
      userMenu={<UserMenu brandColor="#68a7ff" showNotifications={false} />}
    />
  )
}
