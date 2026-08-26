import { useRequest } from 'ahooks'
import { AppWindow, Info, Plus, Server } from 'lucide-react'
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
  const serviceColumns: DataTableColumn<Service>[] = [
    {
      key: 'service_id',
      header: '服务 ID',
      width: 160,
      render: service => (
        <button
          className="text-primary hover:underline"
          onClick={() => navigate(`/services/${service.service_id}`)}
        >
          {service.service_id}
        </button>
      ),
    },
    { key: 'name', header: '名称', width: 180, render: service => service.name },
    {
      key: 'token',
      header: 'Token 有效期',
      render: service => (
        <div className={styles.tokenExpiry}>
          <div className={styles.tokenRow}>
            <span>Access:</span>
            <span>{formatDuration(service.access_token_expires_in)}</span>
          </div>
        </div>
      ),
    },
  ]
  const appColumns: DataTableColumn<Application>[] = [
    {
      key: 'app_id',
      header: '应用 ID',
      width: 180,
      render: app => (
        <button
          className="text-primary hover:underline"
          onClick={() => navigate(`/applications/${app.app_id}`)}
        >
          {app.app_id}
        </button>
      ),
    },
    { key: 'name', header: '名称', width: 180, render: app => app.name },
    { key: 'created_at', header: '创建时间', render: app => formatDateTime(app.created_at) },
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
          <CardContent>
            <Tabs defaultValue="info" className={styles.tabs}>
              <TabsList>
                <TabsTrigger value="info">
                  <Info />
                  基本信息
                </TabsTrigger>
                <TabsTrigger value="services">
                  <Server />
                  服务列表
                  {serviceRows.length ? (
                    <Badge variant="secondary">{serviceRows.length}</Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="applications">
                  <AppWindow />
                  应用列表
                  {applicationRows.length ? (
                    <Badge variant="secondary">{applicationRows.length}</Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="info">
                <DescriptionList
                  className={styles.descriptions}
                  items={[
                    { label: '域 ID', value: <code>{data.domain_id}</code> },
                    { label: '名称', value: data.name },
                    {
                      label: '描述',
                      value: data.description || <span className="text-muted-foreground">—</span>,
                      wide: true,
                    },
                  ]}
                />
              </TabsContent>
              <TabsContent value="services">
                <div className={styles.relationshipsTab}>
                  <div className={styles.tabHeader}>
                    <span className="text-sm text-muted-foreground">该域下的所有服务</span>
                    <Button onClick={() => navigate('/services', { state: { openCreate: true } })}>
                      <Plus />
                      新建服务
                    </Button>
                  </div>
                  {servicesLoading ? (
                    <div className="flex min-h-40 items-center justify-center">
                      <Spinner />
                    </div>
                  ) : serviceRows.length ? (
                    <DataTable columns={serviceColumns} data={serviceRows} rowKey="service_id" />
                  ) : (
                    <EmptyState title="暂无服务" />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="applications">
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
                    <DataTable columns={appColumns} data={applicationRows} rowKey="app_id" />
                  ) : (
                    <EmptyState title="暂无应用" />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
