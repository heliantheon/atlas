import { useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { Boxes, Search, User, Users } from 'lucide-react'
import { Empty, Input, Tag } from '@heliannuuthus/ui'
import type { Application, Group } from '@/types'
import styles from './index.module.scss'

interface EntityItem {
  type: string
  id: string
  label?: string
}

interface AddNodesProps {
  users: string[]
  groups: Group[]
  applications: Application[]
  onDragStart: (event: DragEvent, nodeType: 'subject' | 'object', data: EntityItem) => void
}

function EntitySection({
  title,
  icon,
  items,
  onDragStart,
}: {
  title: string
  icon: ReactNode
  items: EntityItem[]
  onDragStart: (event: DragEvent, item: EntityItem) => void
}) {
  return (
    <details open className="border-b">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/35">
        {icon}
        <span>{title}</span>
        <Tag type="info" className="ml-auto">
          {items.length}
        </Tag>
      </summary>
      {items.length ? (
        <div className={styles.entityList}>
          {items.map(item => (
            <div
              key={`${item.type}:${item.id}`}
              className={styles.entityItem}
              draggable
              onDragStart={event => onDragStart(event, item)}
            >
              <span className={styles.entityIcon}>{icon}</span>
              <div className={styles.entityInfo}>
                <span className={styles.entityId} title={item.id}>
                  {item.id}
                </span>
                {item.label ? (
                  <span className={styles.entityLabel} title={item.label}>
                    {item.label}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="暂无数据" className="m-3 min-h-24 border-0 p-4" />
      )}
    </details>
  )
}

export function AddNodes({ users, groups, applications, onDragStart }: AddNodesProps) {
  const [query, setQuery] = useState('')
  const sections = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const filter = (items: EntityItem[]) =>
      normalized
        ? items.filter(
            item =>
              item.id.toLowerCase().includes(normalized) ||
              item.label?.toLowerCase().includes(normalized)
          )
        : items
    return [
      {
        key: 'users',
        title: '用户',
        icon: <User />,
        items: filter(users.map(id => ({ type: 'user', id }))),
      },
      {
        key: 'groups',
        title: '组',
        icon: <Users />,
        items: filter(
          groups.map(group => ({ type: 'group', id: group.group_id, label: group.name }))
        ),
      },
      {
        key: 'applications',
        title: '应用',
        icon: <Boxes />,
        items: filter(
          applications.map(app => ({ type: 'application', id: app.app_id, label: app.name }))
        ),
      },
    ]
  }, [applications, groups, query, users])

  return (
    <aside className={styles.addNodes} aria-label="节点面板">
      <div className={styles.addNodesHeader}>
        <strong className="text-sm">节点面板</strong>
      </div>
      <div className={styles.searchWrapper}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="搜索节点"
            className="pl-9"
            placeholder="搜索节点"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </div>
      </div>
      <p className={styles.hint}>拖拽节点到画布建立关系</p>
      <div className={styles.collapseWrapper}>
        {sections.map(({ key, ...section }) => (
          <EntitySection
            key={key}
            {...section}
            onDragStart={(event, item) => onDragStart(event, 'subject', item)}
          />
        ))}
      </div>
    </aside>
  )
}
