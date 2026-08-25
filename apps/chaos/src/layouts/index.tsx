import { useNavigate, useLocation } from 'react-router-dom'
import { FileText, LayoutDashboard, ScrollText, Settings, UploadCloud } from 'lucide-react'
import { Breadcrumb } from '@atlas/ui/breadcrumb'
import { PRODUCT_BRAND_COLORS } from '@atlas/ui/brand-colors'
import { Header } from '@atlas/ui/header'
import { MainLayout } from '@atlas/ui/main-layout'
import { Sidebar, type SidebarMenuItem } from '@atlas/ui/sidebar'
import { UserMenu } from '@atlas/ui/user-menu'

const BRAND_COLOR = PRODUCT_BRAND_COLORS.chaos

const chaosMenus: SidebarMenuItem[] = [
  { key: 'dashboard', label: '概览', icon: <LayoutDashboard />, path: '/dashboard' },
  {
    key: 'templates',
    label: '邮件模板',
    icon: <FileText />,
    path: '/templates',
    section: '内容管理',
  },
  { key: 'files', label: '文件管理', icon: <UploadCloud />, path: '/files' },
  {
    key: 'logs',
    label: '日志检索',
    icon: <ScrollText />,
    path: '/logs',
    section: '可观测性',
  },
  { key: 'settings', label: '设置', icon: <Settings />, path: '/settings', bottom: true },
]

const chaosLogo = {
  text: 'Chaos',
}

const breadcrumbConfig = {
  appName: 'Chaos',
  defaultPath: '/dashboard',
  routeNameMap: {
    templates: '邮件模板',
    files: '文件管理',
    logs: '日志检索',
    settings: '设置',
  },
}

export function ChaosLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <MainLayout
      renderSidebar={collapsed => (
        <Sidebar
          collapsed={collapsed}
          menus={chaosMenus}
          logo={chaosLogo}
          brandColor={BRAND_COLOR}
          onLogoClick={() => navigate('/dashboard')}
          selectedKeys={[location.pathname]}
          onMenuClick={key => navigate(key)}
        />
      )}
      header={
        <Header
          left={<Breadcrumb config={breadcrumbConfig} />}
          right={<UserMenu brandColor={BRAND_COLOR} />}
        />
      }
    />
  )
}
