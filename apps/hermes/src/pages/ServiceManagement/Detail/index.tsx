import { useRequest } from 'ahooks'
import { Boxes, GitBranch, Info, Plus, Share2, ShieldCheck } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Badge } from '@atlas/ui/badge'
import { Button } from '@atlas/ui/button'
import { Card, CardContent } from '@atlas/ui/card'
import { DescriptionList } from '@atlas/ui/description-list'
import { EmptyState } from '@atlas/ui/empty-state'
import { Spinner } from '@atlas/ui/spinner'
import { DataTable, type DataTableColumn } from '@atlas/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atlas/ui/tabs'
import { toast } from '@atlas/ui/toast'
import {
  PageHeader,
  formatDateTime,
  formatDuration,
  formatRelativeTime,
  isExpiringSoon,
} from '@atlas/shared'
import { useAppNavigate, useDomainId } from '@/contexts/DomainContext'
import { relationshipApi, serviceApi } from '@/services'
import type { Relationship, ServiceApplicationRelation } from '@/types'
import styles from './index.module.scss'
import { ChallengeSettingsPanel } from './components/ChallengeSettingsPanel'

const subjectLabels: Record<string, string> = { user: '用户', group: '组', application: '应用' }

export function Detail() {
  const { serviceId } = useParams<{ serviceId: string }>()
  const domainId = useDomainId()
  const navigate = useAppNavigate()
  const { data, loading } = useRequest(() => serviceApi.getDetail(domainId!, serviceId!), {
    ready: Boolean(domainId && serviceId),
    onError: () => toast.error('获取服务信息失败'),
  })
  const { data: appRelations, loading: appLoading } = useRequest(
    () => serviceApi.getApplicationRelations(domainId!, serviceId!),
    { ready: Boolean(domainId && serviceId) }
  )
  const { data: relationships, loading: relationsLoading } = useRequest(
    () => relationshipApi.getList({ service_id: serviceId }),
    { ready: Boolean(serviceId) }
  )
  const applicationRows = appRelations ?? []
  const relationRows = relationships?.items ?? []
  const appColumns: DataTableColumn<ServiceApplicationRelation>[] = [
    {
      key: 'app_id',
      header: '应用',
      width: 190,
      render: relation => (
        <button
          className="text-primary hover:underline"
          onClick={() => navigate(`/applications/${relation.app_id}`)}
        >
          {relation.app_id}
        </button>
      ),
    },
    {
      key: 'relations',
      header: '授予的权限',
      render: relation => (
        <div className="flex flex-wrap gap-1">
          {relation.relations.map(value => (
            <Badge key={value}>{value}</Badge>
          ))}
        </div>
      ),
    },
  ]
  const relationColumns: DataTableColumn<Relationship>[] = [
    {
      key: 'subject',
      header: '主体',
      width: 210,
      render: relation => (
        <div className={styles.entityCell}>
          <Badge variant="secondary">
            {subjectLabels[relation.subject_type] || relation.subject_type}
          </Badge>
          <span className="max-w-32 truncate" title={relation.subject_id}>
            {relation.subject_id}
          </span>
        </div>
      ),
    },
    {
      key: 'relation',
      header: '关系',
      width: 120,
      render: relation => <Badge>{relation.relation}</Badge>,
    },
    {
      key: 'object',
      header: '对象',
      width: 210,
      render: relation => (
        <div className={styles.entityCell}>
          <Badge variant="outline">{relation.object_type}</Badge>
          <span className="max-w-32 truncate" title={relation.object_id}>
            {relation.object_id}
          </span>
        </div>
      ),
    },
    {
      key: 'expires',
      header: '过期时间',
      width: 150,
      render: relation =>
        relation.expires_at ? (
          <span className={isExpiringSoon(relation.expires_at) ? 'text-amber-700' : undefined}>
            {formatRelativeTime(relation.expires_at)}
          </span>
        ) : (
          <span className="text-muted-foreground">永久</span>
        ),
    },
  ]
  if (loading)
    return (
      <div className={styles.loading}>
        <Spinner className="size-7" />
      </div>
    )
  if (!data) return null
  return (
    <div className={styles.container}>
      <PageHeader
        title={data.name || '服务详情'}
        onBack={() => navigate('/services')}
        extra={<Button onClick={() => navigate(`/services/${serviceId}/edit`)}>编辑服务</Button>}
      />
      <div className={styles.content}>
        <Card className={styles.mainCard}>
          <CardContent>
            <Tabs defaultValue="info" className={styles.tabs}>
              <TabsList>
                <TabsTrigger value="info">
                  <Info />
                  基本信息
                </TabsTrigger>
                <TabsTrigger value="granted-apps">
                  <Boxes />
                  已授权应用
                  {applicationRows.length ? (
                    <Badge variant="secondary">{applicationRows.length}</Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="relationships">
                  <Share2 />
                  关联关系
                  {relationRows.length ? (
                    <Badge variant="secondary">{relationRows.length}</Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="challenges">
                  <ShieldCheck />
                  Challenge 策略
                </TabsTrigger>
              </TabsList>
              <TabsContent value="info">
                <DescriptionList
                  className={styles.descriptions}
                  items={[
                    { label: '服务 ID', value: <code>{data.service_id}</code> },
                    { label: '名称', value: data.name },
                    { label: '域 ID', value: <code>{data.domain_id}</code> },
                    {
                      label: '描述',
                      value: data.description || <span className="text-muted-foreground">—</span>,
                      wide: true,
                    },
                    {
                      label: 'Access Token 有效期',
                      value: formatDuration(data.access_token_expires_in),
                    },
                    { label: '创建时间', value: formatDateTime(data.created_at) },
                    { label: '更新时间', value: formatDateTime(data.updated_at) },
                  ]}
                />
              </TabsContent>
              <TabsContent value="granted-apps">
                <div className={styles.relationshipsTab}>
                  <div className={styles.tabHeader}>
                    <span className="text-sm text-muted-foreground">
                      本服务已授权给以下应用，具体权限在应用详情中配置。
                    </span>
                  </div>
                  {appLoading ? (
                    <div className={styles.loading}>
                      <Spinner />
                    </div>
                  ) : applicationRows.length ? (
                    <DataTable columns={appColumns} data={applicationRows} rowKey="app_id" />
                  ) : (
                    <EmptyState title="暂无已授权应用" />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="relationships">
                <div className={styles.relationshipsTab}>
                  <div className={styles.tabHeader}>
                    <span className="text-sm text-muted-foreground">
                      该服务下的主体—关系—对象授权关系。
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigate(`/services/${serviceId}/relationships/create`)}
                      >
                        <Plus />
                        配置关系
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/services/${serviceId}/relationships/graph`)}
                      >
                        <GitBranch />
                        图谱查看
                      </Button>
                    </div>
                  </div>
                  {relationsLoading ? (
                    <div className={styles.loading}>
                      <Spinner />
                    </div>
                  ) : relationRows.length ? (
                    <DataTable
                      columns={relationColumns}
                      data={relationRows}
                      rowKey={relation =>
                        `${relation.service_id}:${relation.subject_id}:${relation.relation}:${relation.object_id}`
                      }
                    />
                  ) : (
                    <EmptyState title="暂无关联关系" />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="challenges">
                <ChallengeSettingsPanel domainId={domainId!} serviceId={serviceId!} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
