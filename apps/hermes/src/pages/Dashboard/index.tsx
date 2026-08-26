import { useMemo } from 'react'
import { Alert, Button, Skeleton, Tag } from '@heliannuuthus/ui'
import {
  AppWindow,
  ArrowRight,
  ScrollText,
  Server,
  Workflow,
  Plus,
  ShieldCheck,
  Search,
  ArrowLeftRight,
  Users,
} from 'lucide-react'
import { useRequest } from 'ahooks'
import { formatRelativeTime, isExpiringSoon } from '@atlas/shared'
import { useAppNavigate, useDomainId } from '@/contexts/DomainContext'
import { applicationApi, domainApi, groupApi, relationshipApi, serviceApi } from '@/services'
import type { Application, Group, Relationship, Service } from '@/types'
import { collectCursorPages, collectScopedCursorPages } from '@/utils/pagination'
import styles from './index.module.scss'

type ResourceKind = 'application' | 'service' | 'group' | 'relationship'

interface ActivityRecord {
  id: string
  kind: ResourceKind
  name: string
  time: string
}

const activityLabels: Record<ResourceKind, string> = {
  application: '应用',
  service: '服务',
  group: '用户组',
  relationship: '授权',
}

const activityIcons: Record<ResourceKind, React.ReactNode> = {
  application: <AppWindow />,
  service: <Server />,
  group: <Users />,
  relationship: <ShieldCheck />,
}

function toActivityRecords(
  applications: Application[],
  services: Service[],
  groups: Group[],
  relationships: Relationship[]
) {
  const records: ActivityRecord[] = [
    ...applications.map(item => ({
      id: `app:${item.app_id}`,
      kind: 'application' as const,
      name: item.name || item.app_id,
      time: item.updated_at,
    })),
    ...services.map(item => ({
      id: `service:${item.service_id}`,
      kind: 'service' as const,
      name: item.name || item.service_id,
      time: item.updated_at,
    })),
    ...groups.map(item => ({
      id: `group:${item.group_id}`,
      kind: 'group' as const,
      name: item.name || item.group_id,
      time: item.updated_at,
    })),
    ...relationships.map((item, index) => ({
      id: `relation:${item.service_id}:${item.subject_id}:${item.object_id}:${index}`,
      kind: 'relationship' as const,
      name: `${item.subject_id} → ${item.object_id}`,
      time: item.created_at,
    })),
  ]

  return records
    .filter(record => Boolean(record.time))
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6)
}

export function Dashboard() {
  const domainId = useDomainId()
  const navigate = useAppNavigate()

  const { data, loading, error, refresh } = useRequest(
    async () => {
      const [domain, servicesData, applicationsData] = await Promise.all([
        domainApi.getDetail(domainId!),
        collectCursorPages(token => serviceApi.getList(domainId!, undefined, { token, size: 100 })),
        collectCursorPages(token =>
          applicationApi.getList(domainId!, undefined, { token, size: 100 })
        ),
      ])
      const serviceIds = servicesData.map(service => service.service_id)
      const [groupsData, relationshipsData] = await Promise.all([
        collectScopedCursorPages(serviceIds, (serviceId, token) =>
          groupApi.getList({ service_id: serviceId }, { token, size: 100 })
        ),
        collectScopedCursorPages(serviceIds, (serviceId, token) =>
          relationshipApi.getList({ service_id: serviceId }, { token, size: 100 })
        ),
      ])

      return {
        domain,
        services: servicesData,
        applications: applicationsData,
        groups: groupsData,
        relationships: relationshipsData,
      }
    },
    { ready: Boolean(domainId), refreshDeps: [domainId] }
  )

  const viewModel = useMemo(() => {
    const services = data?.services ?? []
    const applications = data?.applications ?? []
    const groups = data?.groups ?? []
    const relationships = data?.relationships ?? []
    const servicesWithRelations = new Set(relationships.map(relation => relation.service_id))
    const coverage = services.length
      ? Math.round((servicesWithRelations.size / services.length) * 100)
      : 0

    return {
      services,
      applications,
      groups,
      relationships,
      coverage,
      unconfiguredServices: Math.max(services.length - servicesWithRelations.size, 0),
      expiringRelations: relationships.filter(
        relation => relation.expires_at && isExpiringSoon(relation.expires_at)
      ).length,
      activities: toActivityRecords(applications, services, groups, relationships),
    }
  }, [data])

  const metrics = [
    {
      label: '应用',
      value: viewModel.applications.length,
      note: '当前工作域',
      icon: <AppWindow />,
      path: 'applications',
    },
    {
      label: '服务',
      value: viewModel.services.length,
      note: `${viewModel.unconfiguredServices} 个待配置关系`,
      icon: <Server />,
      path: 'services',
    },
    {
      label: '用户组',
      value: viewModel.groups.length,
      note: '已关联当前域服务',
      icon: <Users />,
      path: 'groups',
    },
    {
      label: '授权关系',
      value: viewModel.relationships.length,
      note: `${viewModel.expiringRelations} 条临近到期`,
      icon: <ShieldCheck />,
      path: 'relationships',
    },
  ]

  return (
    <main className={styles.dashboard}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>IDENTITY OPERATIONS / CURRENT DOMAIN</div>
          {loading ? (
            <div className="grid w-full max-w-xl gap-3">
              <Skeleton className="h-10 w-72" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/5" />
            </div>
          ) : (
            <>
              <h1>{data?.domain.name || domainId}</h1>
              <p>
                {data?.domain.description || '在一个工作面上管理身份边界、服务资源与访问关系。'}
              </p>
              <div className={styles.domainMeta}>
                <span className={styles.liveDot} />
                <span>工作域</span>
                <code>{domainId}</code>
              </div>
            </>
          )}
        </div>
        <div className={styles.heroActions}>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeftRight />
            切换工作域
          </Button>
          <Button onClick={() => navigate('applications/create')}>
            <Plus />
            创建应用
          </Button>
        </div>
      </section>

      {error ? (
        <Alert
          variant="warning"
          className={styles.dataAlert}
          title="部分运营数据暂时不可用"
          description="请确认 Hermes 服务连接后重试。"
          action={
            <Button variant="outline" size="sm" onClick={refresh}>
              重新加载
            </Button>
          }
        />
      ) : null}

      <section className={styles.metrics} aria-label="资源统计">
        {metrics.map(metric => (
          <Button
            key={metric.label}
            variant="ghost"
            className={styles.metricCard}
            onClick={() => navigate(metric.path)}
          >
            <span className={styles.metricIcon}>{metric.icon}</span>
            <span className={styles.metricBody}>
              <span className={styles.metricLabel}>{metric.label}</span>
              <strong>{loading ? '—' : metric.value}</strong>
              <span className={styles.metricNote}>{metric.note}</span>
            </span>
            <ArrowRight className={styles.metricArrow} />
          </Button>
        ))}
      </section>

      <section className={styles.primaryGrid}>
        <article className={styles.resourcePanel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelIndex}>01</span>
              <div>
                <h2>资源脉络</h2>
                <p>应用通过服务边界获得能力，授权关系连接身份与资源。</p>
              </div>
            </div>
            <Button variant="link" onClick={() => navigate('relationships')}>
              查看权限关系 <ArrowRight />
            </Button>
          </div>

          <div className={styles.topology}>
            <div className={styles.resourceColumn}>
              <div className={styles.resourceColumnTitle}>
                <AppWindow /> 应用目录
                <span>{viewModel.applications.length}</span>
              </div>
              <div className={styles.resourceList}>
                {loading ? (
                  <div className="grid gap-2">
                    {Array.from({ length: 4 }, (_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : viewModel.applications.length ? (
                  viewModel.applications.slice(0, 4).map(application => (
                    <Button
                      key={application.app_id}
                      variant="ghost"
                      className={styles.resourceItem}
                      onClick={() => navigate(`applications/${application.app_id}`)}
                    >
                      <span className={styles.resourceGlyph}>A</span>
                      <span>
                        <strong>{application.name || application.app_id}</strong>
                        <code>{application.app_id}</code>
                      </span>
                    </Button>
                  ))
                ) : (
                  <div className={styles.emptyResource}>尚未登记应用</div>
                )}
              </div>
            </div>

            <div className={styles.flowRail} aria-hidden="true">
              <span />
              <div>
                <Workflow />
                <small>
                  ACCESS
                  <br />
                  PLANE
                </small>
              </div>
              <span />
            </div>

            <div className={styles.resourceColumn}>
              <div className={styles.resourceColumnTitle}>
                <Server /> 服务边界
                <span>{viewModel.services.length}</span>
              </div>
              <div className={styles.resourceList}>
                {loading ? (
                  <div className="grid gap-2">
                    {Array.from({ length: 4 }, (_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : viewModel.services.length ? (
                  viewModel.services.slice(0, 4).map(service => (
                    <Button
                      key={service.service_id}
                      variant="ghost"
                      className={styles.resourceItem}
                      onClick={() => navigate(`services/${service.service_id}`)}
                    >
                      <span className={`${styles.resourceGlyph} ${styles.serviceGlyph}`}>S</span>
                      <span>
                        <strong>{service.name || service.service_id}</strong>
                        <code>{service.service_id}</code>
                      </span>
                    </Button>
                  ))
                ) : (
                  <div className={styles.emptyResource}>尚未登记服务</div>
                )}
              </div>
            </div>
          </div>
        </article>

        <aside className={styles.governancePanel}>
          <div className={styles.panelHeaderCompact}>
            <span className={styles.panelIndex}>02</span>
            <div>
              <h2>治理脉搏</h2>
              <p>服务级权限关系覆盖情况</p>
            </div>
          </div>
          <div className={styles.coverageGauge}>
            <div
              className={styles.coverageRing}
              style={
                { '--coverage': `${loading ? 0 : viewModel.coverage}%` } as React.CSSProperties
              }
            >
              <span className={styles.gaugeValue}>
                <strong>{loading ? '—' : `${viewModel.coverage}%`}</strong>
                <small>关系覆盖</small>
              </span>
            </div>
          </div>
          <div className={styles.governanceRows}>
            <div>
              <span>待配置服务</span>
              <strong>{loading ? '—' : viewModel.unconfiguredServices}</strong>
            </div>
            <div>
              <span>临近到期关系</span>
              <strong className={viewModel.expiringRelations ? styles.warning : undefined}>
                {loading ? '—' : viewModel.expiringRelations}
              </strong>
            </div>
          </div>
          <Button className="w-full" onClick={() => navigate('audit')}>
            <ScrollText />
            打开审计信息
          </Button>
        </aside>
      </section>

      <section className={styles.secondaryGrid}>
        <article className={styles.launchPanel}>
          <div className={styles.panelHeaderCompact}>
            <span className={styles.panelIndex}>03</span>
            <div>
              <h2>常用工作流</h2>
              <p>从对象开始，而不是从菜单开始。</p>
            </div>
          </div>
          <div className={styles.launchGrid}>
            {[
              {
                label: '管理应用',
                desc: '回调、身份源与令牌策略',
                icon: <AppWindow />,
                path: 'applications',
              },
              {
                label: '管理服务',
                desc: '资源边界与访问时效',
                icon: <Server />,
                path: 'services',
              },
              {
                label: '查询用户',
                desc: '身份、凭证与用户组',
                icon: <Search />,
                path: 'users',
              },
              {
                label: '审计变更',
                desc: '资源与授权变更轨迹',
                icon: <ScrollText />,
                path: 'audit',
              },
            ].map(item => (
              <Button
                key={item.path}
                variant="ghost"
                className={styles.launchItem}
                onClick={() => navigate(item.path)}
              >
                <span>{item.icon}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.desc}</small>
                </span>
                <ArrowRight />
              </Button>
            ))}
          </div>
        </article>

        <article className={styles.activityPanel}>
          <div className={styles.panelHeaderCompact}>
            <span className={styles.panelIndex}>04</span>
            <div>
              <h2>最近变更</h2>
              <p>基于资源更新时间汇总，不替代审计日志。</p>
            </div>
          </div>
          <div className={styles.activityList}>
            {loading ? (
              <div className="grid gap-2">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-11 w-full" />
                ))}
              </div>
            ) : viewModel.activities.length ? (
              viewModel.activities.map(activity => (
                <div key={activity.id} className={styles.activityItem}>
                  <span className={styles.activityIcon}>{activityIcons[activity.kind]}</span>
                  <div>
                    <span>
                      <Tag type="info">{activityLabels[activity.kind]}</Tag>
                      <strong>{activity.name}</strong>
                    </span>
                    <small>{formatRelativeTime(activity.time)}</small>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyActivity}>当前工作域还没有可展示的资源变更。</div>
            )}
          </div>
        </article>
      </section>

      <footer className={styles.footerNote}>
        <span>HERMES / IDENTITY &amp; ACCESS CONTROL PLANE</span>
        <span>域隔离 · 服务边界 · 关系授权</span>
      </footer>
    </main>
  )
}
