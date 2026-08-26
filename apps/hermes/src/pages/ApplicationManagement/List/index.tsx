import { useEffect, useState } from 'react'
import { useDebounce, useRequest } from 'ahooks'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useLocation } from 'react-router-dom'
import { AppWindow, LoaderCircle, Plus, Search } from 'lucide-react'
import { z } from 'zod'
import { Button, Dialog, Empty, Input, Select, Skeleton, toast } from '@heliannuuthus/ui'
import { FormField } from '@/components/forms/FormField'
import { ResourceList } from '@/components/ResourceList'
import { useAppNavigate, useDomainId } from '@/contexts/DomainContext'
import { applicationApi } from '@/services'
import styles from './index.module.scss'

const createSchema = z.object({
  app_id: z.string().trim(),
  name: z.string().trim().min(1, '请输入名称'),
  description: z.string().trim().min(1, '请输入描述'),
})
type CreateValues = z.infer<typeof createSchema>

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
  const [createOpen, setCreateOpen] = useState(shouldOpenCreate)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { app_id: '', name: '', description: '' },
  })

  useEffect(() => {
    if (shouldOpenCreate) navigate(location.pathname, { replace: true, state: {} })
  }, [shouldOpenCreate, location.pathname, navigate])

  const debouncedKeyword = useDebounce(keyword.trim(), { wait: 300 })
  const { data, loading, refresh } = useRequest(() => applicationApi.getList(domainId!), {
    ready: Boolean(domainId),
    refreshDeps: [domainId],
  })
  const applications = [...(data?.items ?? [])]
    .filter(
      app =>
        !debouncedKeyword ||
        (searchBy === 'id' ? app.app_id : (app.name ?? ''))
          .toLowerCase()
          .includes(debouncedKeyword.toLowerCase())
    )
    .sort(
      (left, right) =>
        createdAtTimestamp(right.created_at) - createdAtTimestamp(left.created_at) ||
        left.app_id.localeCompare(right.app_id)
    )

  const { run: create, loading: creating } = useRequest(
    async (values: CreateValues) => {
      await applicationApi.create(domainId!, {
        ...values,
        allowed_redirect_uris: [],
        allowed_origins: [],
        allowed_logout_uris: [],
        need_key: false,
      })
      toast.success('应用已创建')
      setCreateOpen(false)
      reset()
      refresh()
    },
    { manual: true, onError: () => toast.error('创建失败') }
  )

  return (
    <section className={styles.container} aria-label="应用列表">
      <div className={styles.toolbar}>
        <div className={styles.listMeta} aria-live="polite">
          <span>{loading ? '正在加载应用…' : `${applications.length} 个应用`}</span>
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
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" />
            新建应用
          </Button>
        </div>
      </div>

      {loading ? (
        <div className={styles.skeletonList} aria-label="正在加载应用">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className={styles.listSkeleton} />
          ))}
        </div>
      ) : applications.length ? (
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
      ) : (
        <Empty
          title={debouncedKeyword ? '没有匹配的应用' : '尚未创建应用'}
          description={
            debouncedKeyword
              ? '尝试更换关键词或搜索字段。'
              : '创建第一个应用以开始配置认证和服务授权。'
          }
          actions={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" />
              新建应用
            </Button>
          }
          className={styles.emptyState}
        />
      )}

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="新建应用"
        description="应用标识可留空，由服务端自动生成。"
      >
        <form
          className={styles.dialogForm}
          onSubmit={handleSubmit(values => create(values))}
          noValidate
        >
          <FormField label="应用标识" htmlFor="create-app-id" error={errors.app_id?.message}>
            <Input id="create-app-id" {...register('app_id')} />
          </FormField>
          <FormField label="名称" htmlFor="create-app-name" required error={errors.name?.message}>
            <Input id="create-app-name" {...register('name')} />
          </FormField>
          <FormField
            label="描述"
            htmlFor="create-app-description"
            required
            error={errors.description?.message}
          >
            <Input.TextArea id="create-app-description" rows={3} {...register('description')} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
                reset()
              }}
            >
              取消
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? <LoaderCircle className={styles.spinner} aria-hidden="true" /> : null}
              创建应用
            </Button>
          </div>
        </form>
      </Dialog>

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
