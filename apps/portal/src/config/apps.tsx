import type { ReactNode } from 'react'
import {
  AppWindow,
  BookOpen,
  Building2,
  CloudUpload,
  FileText,
  Flame,
  Heart,
  Server,
  Tags,
  Users,
} from 'lucide-react'
import { PRODUCT_BRAND_COLORS } from '@atlas/ui/brand-colors'

export interface AtlasCapability {
  id: string
  name: string
  path: string
  icon: ReactNode
  keywords?: string[]
}

export interface AtlasAppManifest {
  id: string
  name: string
  category: string
  mood: string
  description: string
  logo: string
  origin: string
  homePath: string
  color: string
  tint: string
  capabilities: AtlasCapability[]
}

export interface AtlasLaunchTarget {
  key: string
  appId: string
  appName: string
  name: string
  description: string
  href: string
  color: string
  tint: string
  icon?: ReactNode
  keywords: string[]
}

export interface RecentLaunch {
  key: string
  visitedAt: number
}

export const atlasApps: AtlasAppManifest[] = [
  {
    id: 'hermes',
    name: 'Hermes',
    category: '身份与权限',
    mood: '秩序、信任与边界',
    description: '管理身份、应用、服务与访问关系',
    logo: '/hermes.svg',
    origin: 'https://hermes.heliannuuthus.com',
    homePath: '/',
    color: PRODUCT_BRAND_COLORS.hermes,
    tint: '#fff1e8',
    capabilities: [
      { id: 'domains', name: '选择域', path: '/', icon: <Building2 /> },
      {
        id: 'services',
        name: '服务管理',
        path: '/?next=services',
        icon: <Server />,
      },
      {
        id: 'applications',
        name: '应用管理',
        path: '/?next=applications',
        icon: <AppWindow />,
      },
      { id: 'groups', name: '组管理', path: '/?next=groups', icon: <Users /> },
    ],
  },
  {
    id: 'chaos',
    name: 'Chaos',
    category: '消息与文件',
    mood: '在混乱中建立结构',
    description: '集中处理消息模板、发送任务与文件',
    logo: '/chaos.svg',
    origin: 'https://chaos.heliannuuthus.com',
    homePath: '/dashboard',
    color: PRODUCT_BRAND_COLORS.chaos,
    tint: '#f0f2f5',
    capabilities: [
      { id: 'templates', name: '邮件模板', path: '/templates', icon: <FileText /> },
      { id: 'files', name: '对象上传', path: '/files', icon: <CloudUpload /> },
    ],
  },
  {
    id: 'zwei',
    name: 'Zwei',
    category: '内容与推荐',
    mood: '温暖、鲜活、有食欲',
    description: '运营菜谱、内容标签与个性化推荐',
    logo: '/zwei.svg',
    origin: 'https://zwei.heliannuuthus.com',
    homePath: '/',
    color: PRODUCT_BRAND_COLORS.zwei,
    tint: '#fff0ee',
    capabilities: [
      { id: 'recipes', name: '菜谱管理', path: '/recipes', icon: <BookOpen /> },
      { id: 'favorites', name: '收藏管理', path: '/favorites', icon: <Heart /> },
      { id: 'recommend', name: '推荐系统', path: '/recommend', icon: <Flame /> },
      { id: 'tags', name: '标签管理', path: '/tags', icon: <Tags /> },
    ],
  },
]

export const launchTargets: AtlasLaunchTarget[] = atlasApps.flatMap(app => [
  {
    key: `${app.id}:home`,
    appId: app.id,
    appName: app.name,
    name: app.name,
    description: app.description,
    href: `${app.origin}${app.homePath}`,
    color: app.color,
    tint: app.tint,
    keywords: [app.name, app.description],
  },
  ...app.capabilities.map(capability => ({
    key: `${app.id}:${capability.id}`,
    appId: app.id,
    appName: app.name,
    name: capability.name,
    description: `${app.name} · ${app.description}`,
    href: `${app.origin}${capability.path}`,
    color: app.color,
    tint: app.tint,
    icon: capability.icon,
    keywords: [app.name, capability.name, ...(capability.keywords ?? [])],
  })),
])

const RECENT_STORAGE_KEY = 'atlas:recent-launches'

export function getRecentLaunches(): RecentLaunch[] {
  try {
    const value = window.localStorage.getItem(RECENT_STORAGE_KEY)
    if (!value) return []
    const parsed = JSON.parse(value) as RecentLaunch[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function openLaunchTarget(target: AtlasLaunchTarget) {
  recordLaunchTarget(target)
  window.location.assign(target.href)
}

export function recordLaunchTarget(target: AtlasLaunchTarget) {
  const recent = getRecentLaunches().filter(item => item.key !== target.key)
  const next = [{ key: target.key, visitedAt: Date.now() }, ...recent].slice(0, 6)

  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Navigation should still work when storage is unavailable.
  }
}

export function getTargetByKey(key: string) {
  return launchTargets.find(target => target.key === key)
}
