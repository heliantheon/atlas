import { useRequest } from 'ahooks'
import { AppWindow, Info, Plus, Server } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button, Card, Empty, Spinner, Table, Tabs, Tag, toast } from '@heliannuuthus/ui'
import { PageHeader, formatDateTime, formatDuration } from '@atlas/shared'
import { useAppNavigate } from '@/contexts/DomainContext'
import { applicationApi, domainApi, serviceApi } from '@/services'
import type { Application, Service } from '@/types'
import styles from './index.module.scss'

export function Detail() {
  const { domainId } = useParams<{ domainId: string }>()
  const navigate = useAppNavigate()
  const { data, loading } = useRequest(() => domainApi.getDetail(domainId!), {
    ready: Boolean(domainId),
    onError: () => toast.error('获取域信息失败'),
  })
  const { data: services, loading: servicesLoading } = useRequest(
    () => serviceApi.getList(domainId!),
    { ready: Boolean(domainId) }
  )
  const { data: applications, loading: appsLoading } = useRequest(
    () => applicationApi.getList(domainId!),
    { ready: Boolean(domainId) }
  )
  const serviceRows = services?.items ?? []
  const applicationRows = applications?.items ?? []
  const serviceColumns: Table.Column<Service>[] = [
    {
      key: 'service_id',
      header: '服务 ID',
      width: 160,
      render: (_value, service) => (
        <button
          className="text-primary hover:underline"
          onClick={() => navigate(`/services/${service.service_id}`)}
        >
          {service.service_id}
        </button>
      ),
    },
    { key: 'name', header: '名称', width: 180, render: (_value, service) => service.name },
    {
      key: 'token',
      header: 'Token 有效期',
      render: (_value, service) => (
        <div className={styles.tokenExpiry}>
          <div className={styles.tokenRow}>
            <span>Access:</span>
            <span>{formatDuration(service.access_token_expires_in)}</span>
          </div>
        </div>
      ),
    },
  ]
  const appColumns: Table.Column<Application>[] = [
    {
      key: 'app_id',
      header: '应用 ID',
      width: 180,
      render: (_value, app) => (
        <button
          className="text-primary hover:underline"
          onClick={() => navigate(`/applications/${app.app_id}`)}
        >
          {app.app_id}
        </button>
      ),
    },
    { key: 'name', header: '名称', width: 180, render: (_value, app) => app.name },
    {
      key: 'created_at',
      header: '创建时间',
      render: (_value, app) => formatDateTime(app.created_at),
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
      <PageHeader title={data.name || '域详情'} onBack={() => navigate('/')} />
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
                    {[
                      ['域 ID', <code key="domain-id">{data.domain_id}</code>],
                      ['名称', data.name],
                      [
                        '描述',
                        data.description || (
                          <span key="empty" className="text-muted-foreground">
                            —
                          </span>
                        ),
                      ],
                    ].map(([label, value], index) => (
                      <div
                        key={String(label)}
                        className={`grid grid-cols-[minmax(7rem,0.35fr)_1fr] gap-px bg-background ${index === 2 ? 'md:col-span-full' : ''}`}
                      >
                        <dt className="bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="min-w-0 px-4 py-3 text-sm">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ),
              },
              {
                value: 'services',
                label: (
                  <>
                    <Server />
                    服务列表
                    {serviceRows.length ? <Tag type="info">{serviceRows.length}</Tag> : null}
                  </>
                ),
                content: (
                  <div className={styles.relationshipsTab}>
                    <div className={styles.tabHeader}>
                      <span className="text-sm text-muted-foreground">该域下的所有服务</span>
                      <Button
                        onClick={() => navigate('/services', { state: { openCreate: true } })}
                      >
                        <Plus />
                        新建服务
                      </Button>
                    </div>
                    {servicesLoading ? (
                      <div className="flex min-h-40 items-center justify-center">
                        <Spinner />
                      </div>
                    ) : serviceRows.length ? (
                      <Table
                        columns={serviceColumns}
                        data={serviceRows}
                        rowKey="service_id"
                        pagination={false}
                      />
                    ) : (
                      <Empty title="暂无服务" />
                    )}
                  </div>
                ),
              },
              {
                value: 'applications',
                label: (
                  <>
                    <AppWindow />
                    应用列表
                    {applicationRows.length ? (
                      <Tag type="info">{applicationRows.length}</Tag>
                    ) : null}
                  </>
                ),
                content: (
                  <div className={styles.relationshipsTab}>
                    <div className={styles.tabHeader}>
                      <span className="text-sm text-muted-foreground">该域下的所有应用</span>
                      <Button
                        onClick={() => navigate('/applications', { state: { openCreate: true } })}
                      >
                        <Plus />
                        新建应用
                      </Button>
                    </div>
                    {appsLoading ? (
                      <div className="flex min-h-40 items-center justify-center">
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
                      <Empty title="暂无应用" />
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  )
}
