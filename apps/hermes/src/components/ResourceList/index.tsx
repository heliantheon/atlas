import type { CSSProperties, ReactNode } from 'react'
import { CalendarDays, Eye, Trash2 } from 'lucide-react'
import { formatDateTime } from '@atlas/shared'
import { Button, Card } from '@heliannuuthus/ui'
import styles from './index.module.scss'

export interface ResourceListItem {
  id: string
  name: string
  description?: string
  logoUrl?: string
  createdAt?: string
  fallbackIcon: ReactNode
}

interface ResourceListProps {
  items: ResourceListItem[]
  resourceLabel: string
  onView: (item: ResourceListItem) => void
  onDelete: (item: ResourceListItem) => void
}

export function ResourceList({ items, resourceLabel, onView, onDelete }: ResourceListProps) {
  return (
    <ol className={styles.list}>
      {items.map((item, index) => (
        <li key={item.id} style={{ '--item-index': Math.min(index, 10) } as CSSProperties}>
          <Card variant="outline" className={styles.item}>
            <div className={styles.identity}>
              <span className={styles.logo} aria-hidden="true">
                {item.logoUrl ? <img src={item.logoUrl} alt="" /> : item.fallbackIcon}
              </span>
              <div className={styles.summary}>
                <div className={styles.titleLine}>
                  <button type="button" className={styles.name} onClick={() => onView(item)}>
                    {item.name}
                  </button>
                  <code className={styles.id} translate="no" title={item.id}>
                    {item.id}
                  </code>
                </div>
                <p className={styles.description}>
                  {item.description || `尚未添加${resourceLabel}描述。`}
                </p>
              </div>
            </div>

            <div className={styles.createdAt}>
              <CalendarDays aria-hidden="true" />
              <span>
                <small>创建时间</small>
                <time dateTime={item.createdAt}>
                  {item.createdAt ? formatDateTime(item.createdAt) : '未知'}
                </time>
              </span>
            </div>

            <div className={styles.actions}>
              <Button type="button" variant="outline" size="sm" onClick={() => onView(item)}>
                <Eye aria-hidden="true" />
                查看详情
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={styles.deleteButton}
                onClick={() => onDelete(item)}
              >
                <Trash2 aria-hidden="true" />
                删除
              </Button>
            </div>
          </Card>
        </li>
      ))}
    </ol>
  )
}
