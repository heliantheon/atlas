import { lazy, memo, Suspense, useMemo, useState } from 'react'
import { Network, Table2 } from 'lucide-react'
import { Alert, Button, Empty, Spinner, Table, Tag } from '@heliannuuthus/ui'
import type { ApplicationServiceRelation } from '@/types'
import styles from '../index.module.scss'

export interface ServicePermissionsViewProps {
  appId: string
  appName?: string
  appLogoUrl?: string
  data: ApplicationServiceRelation[]
  loading?: boolean
  error?: Error
  onRetry?: () => void
  onNavigateToService?: (serviceId: string) => void
  onRelationsChange?: () => void
}
const LazyPermissionsGraph = lazy(() =>
  import('./PermissionsGraph').then(module => ({ default: module.PermissionsGraph }))
)

export const ServicePermissionsView = memo(function ServicePermissionsView({
  appId,
  appName,
  appLogoUrl,
  data,
  loading,
  error,
  onRetry,
  onNavigateToService,
  onRelationsChange,
}: ServicePermissionsViewProps) {
  const [view, setView] = useState<'table' | 'graph'>('table')
  const columns = useMemo<Table.Column<ApplicationServiceRelation>[]>(
    () => [
      {
        key: 'service_id',
        header: '服务',
        width: 190,
        render: (_value, relation) =>
          onNavigateToService ? (
            <button
              className="text-primary hover:underline"
              onClick={() => onNavigateToService(relation.service_id)}
            >
              {relation.service_id}
            </button>
          ) : (
            relation.service_id
          ),
      },
      {
        key: 'relations',
        header: '授予的权限',
        render: (_value, relation) => (
          <div className="flex flex-wrap gap-1">
            {relation.relations.map(value => (
              <Tag key={value} type="primary">
                {value}
              </Tag>
            ))}
          </div>
        ),
      },
    ],
    [onNavigateToService]
  )
  return (
    <div className={styles.permissionsTab}>
      <div className={styles.permissionsViewSwitch}>
        <div className="inline-flex rounded-lg bg-muted p-1">
          <Button
            size="icon-sm"
            variant={view === 'table' ? 'secondary' : 'ghost'}
            aria-label="表格视图"
            onClick={() => setView('table')}
          >
            <Table2 />
          </Button>
          <Button
            size="icon-sm"
            variant={view === 'graph' ? 'secondary' : 'ghost'}
            aria-label="图谱视图"
            onClick={() => setView('graph')}
          >
            <Network />
          </Button>
        </div>
      </div>
      {error ? (
        <Alert
          variant="error"
          title="服务授权加载失败"
          action={onRetry ? <Button onClick={onRetry}>重试</Button> : undefined}
        />
      ) : view === 'table' ? (
        loading ? (
          <div className="flex min-h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : data.length ? (
          <Table columns={columns} data={data} rowKey="service_id" pagination={false} />
        ) : (
          <Empty title="暂无服务授予的权限" />
        )
      ) : (
        <Suspense
          fallback={
            <div className={styles.permissionsGraphLoading}>
              <Spinner />
            </div>
          }
        >
          <LazyPermissionsGraph
            appId={appId}
            appName={appName}
            appLogoUrl={appLogoUrl}
            data={data}
            className={styles.permissionsGraph}
            onRelationsChange={onRelationsChange}
          />
        </Suspense>
      )}
    </div>
  )
})
