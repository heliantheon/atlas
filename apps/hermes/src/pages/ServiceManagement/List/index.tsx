import { useState } from 'react'
import { useDebounce, useRequest } from 'ahooks'
import {
  Alert,
  Button,
  Dialog,
  Empty,
  Input,
  Select,
  Skeleton,
  Spinner,
  toast,
} from '@heliannuuthus/ui'
import { LoaderCircle, Plus, Search, Server } from 'lucide-react'
import { eq, prefix } from '@atlas/shared'
import { ResourceList } from '@/components/ResourceList'
import { useAppNavigate, useDomainId } from '@/contexts/DomainContext'
import { serviceApi } from '@/services'
import styles from './index.module.scss'

function createdAtTimestamp(value?: string) {
  const timestamp = value ? Date.parse(value) : Number.NaN
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function List() {
  const navigate = useAppNavigate()
  const domainId = useDomainId()
  const [keyword, setKeyword] = useState('')
  const [searchBy, setSearchBy] = useState<'id' | 'name'>('name')
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const debouncedKeyword = useDebounce(keyword.trim(), { wait: 300 })
  const filter = debouncedKeyword
    ? searchBy === 'id'
      ? { service_id: eq(debouncedKeyword) }
      : { name: prefix(debouncedKeyword) }
    : undefined
  const { data, loading, error, refresh, mutate } = useRequest(
    () => {
      return serviceApi.getList(domainId!, filter, { size: 20 })
    },
    { ready: !!domainId, refreshDeps: [domainId, debouncedKeyword, searchBy] }
  )
  const { run: loadMore, loading: loadingMore } = useRequest(
    async () => {
      if (!domainId || !data?.next) return
      const nextPage = await serviceApi.getList(domainId, filter, { token: data.next, size: 20 })
      mutate({ items: [...data.items, ...nextPage.items], next: nextPage.next })
    },
    { manual: true, onError: () => toast.error('加载更多服务失败') }
  )

  const services = [...(data?.items ?? [])].sort(
    (left, right) =>
      createdAtTimestamp(right.created_at) - createdAtTimestamp(left.created_at) ||
      left.service_id.localeCompare(right.service_id)
  )

  return (
    <section className={styles.container} aria-labelledby="services-title">
      <header className={styles.pageHeader}>
        <div>
          <h1 id="services-title" className={styles.pageTitle}>
            服务管理
          </h1>
          <p className={styles.pageDescription}>管理服务身份、访问关系与 Token 生命周期。</p>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.listMeta} aria-live="polite">
          <span>
            {loading ? '正在加载服务…' : `${data?.next ? '已加载 ' : ''}${services.length} 个服务`}
          </span>
          <span>{debouncedKeyword ? `匹配“${debouncedKeyword}”` : '按创建时间 · 最新优先'}</span>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchGroup} role="search">
            <label className={styles.srOnly} htmlFor="service-search">
              搜索服务
            </label>
            <Select<'id' | 'name'>
              value={searchBy}
              onChange={value => value && setSearchBy(value)}
              classNames={{ trigger: styles.searchType }}
              options={[
                { label: '按名称', value: 'name' },
                { label: '按标识', value: 'id' },
              ]}
            />
            <Input
              id="service-search"
              name="service-search"
              autoComplete="off"
              prefix={<Search aria-hidden="true" />}
              placeholder={searchBy === 'id' ? '例如 hermes…' : '输入服务名称…'}
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
            />
          </div>
          <Button type="button" onClick={() => navigate('/services/create')}>
            <Plus aria-hidden="true" />
            新建服务
          </Button>
        </div>
      </div>

      {error ? (
        <Alert
          variant="error"
          title="服务列表加载失败"
          description="无法读取 Hermes 服务管理接口。"
          action={<Button onClick={refresh}>重新加载</Button>}
        />
      ) : loading ? (
        <div className={styles.skeletonList} aria-label="正在加载服务">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className={styles.listSkeleton} />
          ))}
        </div>
      ) : services.length > 0 ? (
        <>
          <ResourceList
            resourceLabel="服务"
            items={services.map(service => ({
              id: service.service_id,
              name: service.name || service.service_id,
              description: service.description,
              logoUrl: service.logo_url,
              createdAt: service.created_at,
              fallbackIcon: <Server />,
            }))}
            onView={item => navigate(`/services/${encodeURIComponent(item.id)}`)}
            onDelete={item => setPendingDelete({ id: item.id, name: item.name })}
          />
          {data?.next ? (
            <div className="flex justify-center pt-3">
              <Button variant="outline" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? <Spinner /> : null}
                加载更多服务
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <Empty
          title={debouncedKeyword ? '没有匹配的服务' : '尚未创建服务'}
          description={
            debouncedKeyword ? '尝试更换关键词或搜索字段。' : '创建第一个服务以开始配置访问关系。'
          }
          actions={
            <Button type="button" onClick={() => navigate('/services/create')}>
              <Plus aria-hidden="true" />
              新建服务
            </Button>
          }
          className={styles.emptyState}
        />
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={open => !open && setPendingDelete(null)}
        title="删除服务"
        description={`确定删除“${pendingDelete?.name ?? ''}”？关联关系和配置也会被删除，此操作无法撤销。`}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!pendingDelete) return
                setDeleting(true)
                try {
                  await serviceApi.delete(domainId!, pendingDelete.id)
                  toast.success('服务已删除')
                  setPendingDelete(null)
                  refresh()
                } catch {
                  toast.error('删除失败，请稍后重试')
                } finally {
                  setDeleting(false)
                }
              }}
            >
              {deleting ? <LoaderCircle className={styles.spinner} aria-hidden="true" /> : null}
              删除服务
            </Button>
          </>
        }
      />
    </section>
  )
}
