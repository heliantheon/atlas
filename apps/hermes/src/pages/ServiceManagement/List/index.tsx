import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useDebounce, useRequest } from 'ahooks'
import { Button, Dialog, Empty, Input, Select, Skeleton, toast } from '@heliannuuthus/ui'
import { LoaderCircle, Plus, Search, Server } from 'lucide-react'
import { eq, prefix } from '@atlas/shared'
import { FormField } from '@/components/forms/FormField'
import { ResourceList } from '@/components/ResourceList'
import { useAppNavigate, useDomainId } from '@/contexts/DomainContext'
import { serviceApi } from '@/services'
import styles from './index.module.scss'

interface ServiceDraft {
  service_id: string
  name: string
  description: string
}

const emptyDraft: ServiceDraft = { service_id: '', name: '', description: '' }

function createdAtTimestamp(value?: string) {
  const timestamp = value ? Date.parse(value) : Number.NaN
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function List() {
  const navigate = useAppNavigate()
  const location = useLocation()
  const domainId = useDomainId()
  const [keyword, setKeyword] = useState('')
  const [searchBy, setSearchBy] = useState<'id' | 'name'>('name')
  const shouldOpenCreate = (location.state as { openCreate?: boolean })?.openCreate ?? false
  const [createDialogOpen, setCreateDialogOpen] = useState(shouldOpenCreate)
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (shouldOpenCreate) navigate(location.pathname, { replace: true, state: {} })
  }, [shouldOpenCreate, location.pathname, navigate])

  const debouncedKeyword = useDebounce(keyword.trim(), { wait: 300 })
  const { data, loading, refresh } = useRequest(
    () => {
      const filter = debouncedKeyword
        ? searchBy === 'id'
          ? { service_id: eq(debouncedKeyword) }
          : { name: prefix(debouncedKeyword) }
        : undefined
      return serviceApi.getList(domainId!, filter)
    },
    { ready: !!domainId, refreshDeps: [domainId, debouncedKeyword, searchBy] }
  )

  const services = [...(data?.items ?? [])].sort(
    (left, right) =>
      createdAtTimestamp(right.created_at) - createdAtTimestamp(left.created_at) ||
      left.service_id.localeCompare(right.service_id)
  )

  const { runAsync: createService, loading: createLoading } = useRequest(
    async (values: ServiceDraft) => {
      await serviceApi.create(domainId!, values)
      toast.success('服务已创建')
      setCreateDialogOpen(false)
      setDraft(emptyDraft)
      refresh()
    },
    { manual: true, onError: () => toast.error('创建失败，请检查输入后重试') }
  )

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.service_id.trim() || !draft.name.trim() || !draft.description.trim()) {
      toast.error('请完整填写服务标识、名称和描述')
      return
    }
    void createService({
      service_id: draft.service_id.trim(),
      name: draft.name.trim(),
      description: draft.description.trim(),
    })
  }

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
          <span>{loading ? '正在加载服务…' : `${services.length} 个服务`}</span>
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
          <Button type="button" onClick={() => setCreateDialogOpen(true)}>
            <Plus aria-hidden="true" />
            新建服务
          </Button>
        </div>
      </div>

      {loading ? (
        <div className={styles.skeletonList} aria-label="正在加载服务">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className={styles.listSkeleton} />
          ))}
        </div>
      ) : services.length > 0 ? (
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
      ) : (
        <Empty
          title={debouncedKeyword ? '没有匹配的服务' : '尚未创建服务'}
          description={
            debouncedKeyword ? '尝试更换关键词或搜索字段。' : '创建第一个服务以开始配置访问关系。'
          }
          actions={
            <Button type="button" onClick={() => setCreateDialogOpen(true)}>
              <Plus aria-hidden="true" />
              新建服务
            </Button>
          }
          className={styles.emptyState}
        />
      )}

      <Dialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="新建服务"
        description="服务标识创建后用于 API 路径和访问关系，请使用稳定名称。"
      >
        <form className={styles.dialogForm} onSubmit={handleCreate}>
          <FormField label="服务标识" htmlFor="service-id" required>
            <Input
              id="service-id"
              name="service_id"
              autoComplete="off"
              spellCheck={false}
              placeholder="例如 billing-api…"
              value={draft.service_id}
              onChange={event =>
                setDraft(current => ({ ...current, service_id: event.target.value }))
              }
            />
          </FormField>
          <FormField label="显示名称" htmlFor="service-name" required>
            <Input
              id="service-name"
              name="name"
              autoComplete="off"
              placeholder="例如账单服务…"
              value={draft.name}
              onChange={event => setDraft(current => ({ ...current, name: event.target.value }))}
            />
          </FormField>
          <FormField label="描述" htmlFor="service-description" required>
            <Input.TextArea
              id="service-description"
              name="description"
              placeholder="说明服务职责和访问边界…"
              value={draft.description}
              onChange={event =>
                setDraft(current => ({ ...current, description: event.target.value }))
              }
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={createLoading}>
              {createLoading ? (
                <LoaderCircle className={styles.spinner} aria-hidden="true" />
              ) : null}
              创建服务
            </Button>
          </div>
        </form>
      </Dialog>

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
