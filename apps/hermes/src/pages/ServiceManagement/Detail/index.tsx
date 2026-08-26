import type { ReactNode } from 'react'
import { useRequest } from 'ahooks'
import { Boxes, GitBranch, Info, Plus, Share2, ShieldCheck } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button, Card, Empty, Spinner, Table, Tabs, Tag, toast } from '@heliannuuthus/ui'
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
  const appColumns: Table.Column<ServiceApplicationRelation>[] = [
    {
      key: 'app_id',
      header: '应用',
      width: 190,
      render: (_value, relation) => (
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
  ]
  const relationColumns: Table.Column<Relationship>[] = [
    {
      key: 'subject',
      header: '主体',
      width: 210,
      render: (_value, relation) => (
        <div className={styles.entityCell}>
          <Tag type="info">{subjectLabels[relation.subject_type] || relation.subject_type}</Tag>
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
      render: (_value, relation) => <Tag type="primary">{relation.relation}</Tag>,
    },
    {
      key: 'object',
      header: '对象',
      width: 210,
      render: (_value, relation) => (
        <div className={styles.entityCell}>
          <Tag>{relation.object_type}</Tag>
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
      render: (_value, relation) =>
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
  const detailItems: Array<{ label: string; value: ReactNode; wide?: boolean }> = [
    { label: '服务 ID', value: <code>{data.service_id}</code> },
    { label: '名称', value: data.name },
    { label: '域 ID', value: <code>{data.domain_id}</code> },
    {
      label: '描述',
      value: data.description || <span className="text-muted-foreground">—</span>,
      wide: true,
    },
    { label: 'Access Token 有效期', value: formatDuration(data.access_token_expires_in) },
    { label: '创建时间', value: formatDateTime(data.created_at) },
    { label: '更新时间', value: formatDateTime(data.updated_at) },
  ]
  return (
    <div className={styles.container}>
      <PageHeader
        title={data.name || '服务详情'}
        onBack={() => navigate('/services')}
        extra={<Button onClick={() => navigate(`/services/${serviceId}/edit`)}>编辑服务</Button>}
      />
      <div className={styles.content}>
        <Card className={styles.mainCard}>
          <Tabs
            defaultValue="info"
            className={styles.tabs}
            items={[
              {
                value: 'info',
                label: (
                  <>
                    <Info />
                    基本信息
                  </>
                ),
                content: (
                  <dl className="grid overflow-hidden rounded-lg border bg-border md:grid-cols-2">
                    {detailItems.map(item => (
                      <div
                        key={item.label}
                        className={`grid grid-cols-[minmax(7rem,0.35fr)_1fr] gap-px bg-background ${item.wide ? 'md:col-span-full' : ''}`}
                      >
                        <dt className="bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                          {item.label}
                        </dt>
                        <dd className="min-w-0 px-4 py-3 text-sm">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                ),
              },
              {
                value: 'granted-apps',
                label: (
                  <>
                    <Boxes />
                    已授权应用
                    {applicationRows.length ? (
                      <Tag type="info">{applicationRows.length}</Tag>
                    ) : null}
                  </>
                ),
                content: (
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
                      <Table
                        columns={appColumns}
                        data={applicationRows}
                        rowKey="app_id"
                        pagination={false}
                      />
                    ) : (
                      <Empty title="暂无已授权应用" />
                    )}
                  </div>
                ),
              },
              {
                value: 'relationships',
                label: (
                  <>
                    <Share2 />
                    关联关系
                    {relationRows.length ? <Tag type="info">{relationRows.length}</Tag> : null}
                  </>
                ),
                content: (
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
                      <Table
                        columns={relationColumns}
                        data={relationRows}
                        pagination={false}
                        rowKey={relation =>
                          `${relation.service_id}:${relation.subject_id}:${relation.relation}:${relation.object_id}`
                        }
                      />
                    ) : (
                      <Empty title="暂无关联关系" />
                    )}
                  </div>
                ),
              },
              {
                value: 'challenges',
                label: (
                  <>
                    <ShieldCheck />
                    Challenge 策略
                  </>
                ),
                content: <ChallengeSettingsPanel domainId={domainId!} serviceId={serviceId!} />,
              },
            ]}
          />
        </Card>
      </div>
    </div>
  )
}
