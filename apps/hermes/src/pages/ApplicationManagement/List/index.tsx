import { useState } from 'react'
import { useDebounce, useRequest } from 'ahooks'
import { AppWindow, LoaderCircle, Plus, Search } from 'lucide-react'
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
import { eq, prefix } from '@atlas/shared'
import { ResourceList } from '@/components/ResourceList'
import { useAppNavigate, useDomainId } from '@/contexts/DomainContext'
import { applicationApi } from '@/services'
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
      ? { app_id: eq(debouncedKeyword) }
      : { name: prefix(debouncedKeyword) }
    : undefined
  const { data, loading, error, refresh, mutate } = useRequest(
    () => applicationApi.getList(domainId!, filter, { size: 20 }),
    {
      ready: Boolean(domainId),
      refreshDeps: [domainId, debouncedKeyword, searchBy],
    }
  )
  const { run: loadMore, loading: loadingMore } = useRequest(
    async () => {
      if (!domainId || !data?.next) return
      const nextPage = await applicationApi.getList(domainId, filter, {
        token: data.next,
        size: 20,
      })
      mutate({ items: [...data.items, ...nextPage.items], next: nextPage.next })
    },
    { manual: true, onError: () => toast.error('加载更多应用失败') }
  )
  const applications = [...(data?.items ?? [])].sort(
    (left, right) =>
      createdAtTimestamp(right.created_at) - createdAtTimestamp(left.created_at) ||
      left.app_id.localeCompare(right.app_id)
  )

  return (
    <section className={styles.container} aria-label="应用列表">
      <div className={styles.toolbar}>
        <div className={styles.listMeta} aria-live="polite">
          <span>
            {loading
              ? '正在加载应用…'
              : `${data?.next ? '已加载 ' : ''}${applications.length} 个应用`}
          </span>
          <span>{debouncedKeyword ? `匹配“${debouncedKeyword}”` : '按创建时间 · 最新优先'}</span>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchGroup} role="search">
            <label className={styles.srOnly} htmlFor="application-search">
              搜索应用
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
              id="application-search"
              autoComplete="off"
              prefix={<Search aria-hidden="true" />}
              placeholder={searchBy === 'id' ? '输入应用标识…' : '输入应用名称…'}
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
            />
          </div>
          <Button type="button" onClick={() => navigate('/applications/create')}>
            <Plus aria-hidden="true" />
            新建应用
          </Button>
        </div>
      </div>

      {error ? (
        <Alert
          variant="error"
          title="应用列表加载失败"
          description="无法读取 Hermes 应用管理接口。"
          action={<Button onClick={refresh}>重新加载</Button>}
        />
      ) : loading ? (
        <div className={styles.skeletonList} aria-label="正在加载应用">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className={styles.listSkeleton} />
          ))}
        </div>
      ) : applications.length ? (
        <>
          <ResourceList
            resourceLabel="应用"
            items={applications.map(app => ({
              id: app.app_id,
              name: app.name || app.app_id,
              description: app.description,
              logoUrl: app.logo_url,
              createdAt: app.created_at,
              fallbackIcon: <AppWindow />,
            }))}
            onView={item => navigate(`/applications/${encodeURIComponent(item.id)}`)}
            onDelete={item => setPendingDelete({ id: item.id, name: item.name })}
          />
          {data?.next ? (
            <div className="flex justify-center pt-3">
              <Button variant="outline" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? <Spinner /> : null}
                加载更多应用
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <Empty
          title={debouncedKeyword ? '没有匹配的应用' : '尚未创建应用'}
          description={
            debouncedKeyword
              ? '尝试更换关键词或搜索字段。'
              : '创建第一个应用以开始配置认证和服务授权。'
          }
          actions={
            <Button type="button" onClick={() => navigate('/applications/create')}>
              <Plus aria-hidden="true" />
              新建应用
            </Button>
          }
          className={styles.emptyState}
        />
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={open => !open && setPendingDelete(null)}
        title="删除应用"
        description={`确定删除“${pendingDelete?.name ?? ''}”？删除后无法恢复。`}
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
                  await applicationApi.delete(domainId!, pendingDelete.id)
                  toast.success('应用已删除')
                  setPendingDelete(null)
                  refresh()
                } catch {
                  toast.error('删除失败')
                } finally {
                  setDeleting(false)
                }
              }}
            >
              {deleting ? <LoaderCircle className={styles.spinner} aria-hidden="true" /> : null}
              删除应用
            </Button>
          </>
        }
      />
    </section>
  )
}
