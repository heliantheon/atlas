import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRequest } from 'ahooks'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AppWindow,
  Clock,
  Copy,
  Globe,
  GripVertical,
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { z } from 'zod'
import { Badge } from '@atlas/ui/badge'
import { Button } from '@atlas/ui/button'
import { Card, CardContent } from '@atlas/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@atlas/ui/dialog'
import { EmptyState } from '@atlas/ui/empty-state'
import { Input } from '@atlas/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@atlas/ui/select'
import { Spinner } from '@atlas/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atlas/ui/tabs'
import { Textarea } from '@atlas/ui/textarea'
import { toast } from '@atlas/ui/toast'
import { formatDateTime } from '@atlas/shared'
import { FormField } from '@/components/forms/FormField'
import { useAppNavigate, useDomainId } from '@/contexts/DomainContext'
import { applicationApi, domainApi } from '@/services'
import type { Application, ApplicationClientSecret, ApplicationIDPConfig } from '@/types'
import {
  validateAllowedOriginsArray,
  validateLogoutUrisArray,
  validateRedirectUrisArray,
} from '@/utils/uri-validation'
import { ServicePermissionsView } from './components/ServicePermissionsView'
import styles from './index.module.scss'

const IDP_TYPE_LABELS: Record<string, string> = {
  user: '账号密码',
  staff: '员工账号',
  github: 'GitHub',
  google: 'Google',
  'wechat-mp': '微信小程序',
  'wechat-web': '微信网页',
  'tt-mp': '抖音小程序',
  'tt-web': '抖音网页',
  'alipay-mp': '支付宝小程序',
  'alipay-web': '支付宝网页',
  wecom: '企业微信',
  passkey: 'Passkey',
  global: '全局身份',
}

const IDP_ICON_URLS: Record<string, string> = Object.fromEntries(
  Object.keys(IDP_TYPE_LABELS).map(type => [
    type,
    `https://asset.heliannuuthus.com/icons/${type.split('-')[0]}.svg`,
  ])
)

const settingsSchema = z
  .object({
    name: z.string().trim().min(1, '请输入应用名称').max(32, '名称不超过 32 个字符'),
    description: z.string(),
    allowed_redirect_uris: z.array(z.string()),
    allowed_origins: z.array(z.string()),
    allowed_logout_uris: z.array(z.string()),
    id_token_expires_in: z.number().min(0).optional(),
    refresh_token_expires_in: z.number().min(0).optional(),
    refresh_token_absolute_expires_in: z.number().min(0).optional(),
  })
  .superRefine((values, context) => {
    const checks = [
      ['allowed_redirect_uris', validateRedirectUrisArray(values.allowed_redirect_uris)],
      ['allowed_origins', validateAllowedOriginsArray(values.allowed_origins)],
      ['allowed_logout_uris', validateLogoutUrisArray(values.allowed_logout_uris)],
    ] as const
    for (const [field, message] of checks) {
      if (message) context.addIssue({ code: 'custom', path: [field], message })
    }
  })

const idpSchema = z.object({
  type: z.string().min(1, '请选择身份源类型'),
  priority: z.number().int().min(0, '优先级不能小于 0'),
  strategy: z.string(),
  delegate: z.string(),
  require: z.string(),
})

type SettingsValues = z.infer<typeof settingsSchema>
type IdpValues = z.infer<typeof idpSchema>

function parseUriArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === 'string')
  if (typeof raw !== 'string') return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function settingsFromApplication(data: Application): SettingsValues {
  return {
    name: data.name,
    description: data.description ?? '',
    allowed_redirect_uris: parseUriArray(data.allowed_redirect_uris),
    allowed_origins: parseUriArray(data.allowed_origins),
    allowed_logout_uris: parseUriArray(data.allowed_logout_uris),
    id_token_expires_in: data.id_token_expires_in || undefined,
    refresh_token_expires_in: data.refresh_token_expires_in || undefined,
    refresh_token_absolute_expires_in: data.refresh_token_absolute_expires_in || undefined,
  }
}

function UriTagsInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
  id: string
}) {
  const [draft, setDraft] = useState('')
  const addDraft = () => {
    const next = draft.trim()
    if (next && !value.includes(next)) onChange([...value, next])
    setDraft('')
  }

  return (
    <div className={styles.uriTagsInput}>
      {value.map(item => (
        <Badge key={item} variant="secondary" className="gap-1 font-mono font-normal">
          {item}
          <button
            type="button"
            aria-label={`移除 ${item}`}
            className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onChange(value.filter(valueItem => valueItem !== item))}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Input
        id={id}
        value={draft}
        className="h-7 min-w-40 flex-1 border-0 px-1 shadow-none focus-visible:ring-0"
        placeholder={placeholder}
        onChange={event => setDraft(event.target.value)}
        onBlur={addDraft}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault()
            addDraft()
          }
        }}
      />
    </div>
  )
}

const DURATION_UNITS = [
  { value: 's', label: '秒', factor: 1 },
  { value: 'm', label: '分', factor: 60 },
  { value: 'h', label: '时', factor: 3600 },
  { value: 'd', label: '天', factor: 86_400 },
] as const

function DurationInput({
  value,
  onChange,
  id,
}: {
  value?: number
  onChange: (value?: number) => void
  id: string
}) {
  const initialUnit =
    [...DURATION_UNITS].reverse().find(unit => value && value % unit.factor === 0)?.value ?? 's'
  const [unit, setUnit] = useState<(typeof DURATION_UNITS)[number]['value']>(initialUnit)
  const factor = DURATION_UNITS.find(item => item.value === unit)?.factor ?? 1

  return (
    <div className="flex w-full max-w-xs gap-2">
      <Input
        id={id}
        type="number"
        min={0}
        value={value == null ? '' : value / factor}
        placeholder="系统默认"
        onChange={event => {
          const next = event.target.value
          onChange(next === '' ? undefined : Math.max(0, Number(next)) * factor)
        }}
      />
      <Select
        value={unit}
        onValueChange={nextUnit => {
          const nextFactor = DURATION_UNITS.find(item => item.value === nextUnit)?.factor ?? 1
          const visibleValue = value == null ? undefined : value / factor
          setUnit(nextUnit as typeof unit)
          onChange(visibleValue == null ? undefined : visibleValue * nextFactor)
        }}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DURATION_UNITS.map(item => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <Card className={styles.statCard}>
      <CardContent>
        <div className={styles.statHeader}>
          <span className={styles.statLabel}>{label}</span>
          <span className={styles.statIcon}>{icon}</span>
        </div>
        <div className="flex items-center gap-2">
          <code className={styles.statValue}>{value}</code>
          {label === '应用标识' || label === '域标识' ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`复制${label}`}
              onClick={() => {
                void navigator.clipboard.writeText(value)
                toast.success(`${label}已复制`)
              }}
            >
              <Copy />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function SortableIdpCard({
  idp,
  onEdit,
  onDelete,
}: {
  idp: ApplicationIDPConfig
  onEdit: (idp: ApplicationIDPConfig) => void
  onDelete: (idp: ApplicationIDPConfig) => void
}) {
  /* eslint-disable react-hooks/refs -- dnd-kit exposes reactive fields through a hook result that this rule misclassifies as refs. */
  const sortable = useSortable({ id: idp.type })
  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={styles.idpCard}
      data-dragging={sortable.isDragging}
    >
      <button
        type="button"
        className={styles.idpCardDragHandle}
        aria-label="拖拽调整优先级"
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical />
      </button>
      <div className={styles.idpCardMain}>
        <span className={styles.idpTypeCell}>
          <img src={IDP_ICON_URLS[idp.type]} alt="" className={styles.idpIcon} />
          <span className={styles.idpTypeLabel}>{IDP_TYPE_LABELS[idp.type] ?? idp.type}</span>
        </span>
        <div className={styles.idpStrategy}>
          {(idp.strategy?.split(',').filter(Boolean) ?? ['通用']).map(strategy => (
            <Badge key={strategy} variant="secondary">
              {strategy}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="编辑身份源"
          onClick={() => onEdit(idp)}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          aria-label="删除身份源"
          onClick={() => onDelete(idp)}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  )
  /* eslint-enable react-hooks/refs */
}

export function Detail() {
  const { appId } = useParams<{ appId: string }>()
  const domainId = useDomainId()
  const navigate = useAppNavigate()
  const [activeTab, setActiveTab] = useState('basic')
  const [idpOpen, setIdpOpen] = useState(false)
  const [editingIdp, setEditingIdp] = useState<ApplicationIDPConfig | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ApplicationIDPConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingIdp, setSavingIdp] = useState(false)
  const [sortingIdp, setSortingIdp] = useState(false)
  const [loadingClientSecret, setLoadingClientSecret] = useState(false)
  const [clientSecret, setClientSecret] = useState<ApplicationClientSecret | null>(null)

  const settingsForm = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      description: '',
      allowed_redirect_uris: [],
      allowed_origins: [],
      allowed_logout_uris: [],
    },
  })
  const idpForm = useForm<IdpValues>({
    resolver: zodResolver(idpSchema),
    defaultValues: { type: '', priority: 0, strategy: '', delegate: '', require: '' },
  })

  const { data, loading, refresh } = useRequest(() => applicationApi.getDetail(domainId!, appId!), {
    ready: Boolean(domainId && appId),
    onError: () => toast.error('获取应用信息失败'),
  })
  const {
    data: serviceRelations,
    loading: relationsLoading,
    refresh: refreshRelations,
  } = useRequest(() => applicationApi.getServiceRelations(domainId!, appId!), {
    ready: Boolean(domainId && appId && activeTab === 'relations'),
  })
  const {
    data: idpConfigs,
    loading: idpLoading,
    refresh: refreshIdpConfigs,
  } = useRequest(() => applicationApi.getIDPConfigs(domainId!, appId!), {
    ready: Boolean(domainId && appId && activeTab === 'auth'),
  })
  const { data: domainIdps } = useRequest(() => domainApi.getIDPs(domainId!), {
    ready: Boolean(domainId && idpOpen),
  })

  useEffect(() => {
    if (data) settingsForm.reset(settingsFromApplication(data))
  }, [data, settingsForm])

  const availableIdpTypes = useMemo(() => {
    const configured = new Set((idpConfigs ?? []).map(config => config.type))
    const source = domainIdps?.map(idp => idp.idp_type) ?? Object.keys(IDP_TYPE_LABELS)
    return source.filter(type => !configured.has(type) || editingIdp?.type === type)
  }, [domainIdps, editingIdp, idpConfigs])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const saveSettings = settingsForm.handleSubmit(async values => {
    setSaving(true)
    try {
      await applicationApi.update(domainId!, appId!, {
        ...values,
        description: values.description.trim() || undefined,
        allowed_redirect_uris: values.allowed_redirect_uris
          .map(item => item.trim())
          .filter(Boolean),
        allowed_origins: values.allowed_origins.map(item => item.trim()).filter(Boolean),
        allowed_logout_uris: values.allowed_logout_uris.map(item => item.trim()).filter(Boolean),
      })
      await refresh()
      toast.success('应用设置已保存')
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  })

  const openCreateIdp = () => {
    setEditingIdp(null)
    idpForm.reset({ type: '', priority: 0, strategy: '', delegate: '', require: '' })
    setIdpOpen(true)
  }
  const openEditIdp = (idp: ApplicationIDPConfig) => {
    setEditingIdp(idp)
    idpForm.reset({
      type: idp.type,
      priority: idp.priority,
      strategy: idp.strategy ?? '',
      delegate: idp.delegate ?? '',
      require: idp.require ?? '',
    })
    setIdpOpen(true)
  }
  const saveIdp = idpForm.handleSubmit(async values => {
    setSavingIdp(true)
    const payload = {
      priority: values.priority,
      strategy: values.strategy.trim() || undefined,
      delegate: values.delegate.trim() || undefined,
      require: values.require.trim() || undefined,
    }
    try {
      if (editingIdp)
        await applicationApi.updateIDPConfig(domainId!, appId!, editingIdp.type, payload)
      else
        await applicationApi.createIDPConfig(domainId!, appId!, { type: values.type, ...payload })
      await refreshIdpConfigs()
      setIdpOpen(false)
      toast.success(editingIdp ? '身份源已更新' : '身份源已添加')
    } catch {
      toast.error(editingIdp ? '更新失败' : '添加失败')
    } finally {
      setSavingIdp(false)
    }
  })

  const deleteIdp = async () => {
    if (!pendingDelete) return
    setSavingIdp(true)
    try {
      await applicationApi.deleteIDPConfig(domainId!, appId!, pendingDelete.type)
      await refreshIdpConfigs()
      setPendingDelete(null)
      toast.success('身份源已删除')
    } catch {
      toast.error('删除失败')
    } finally {
      setSavingIdp(false)
    }
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !idpConfigs?.length) return
    const from = idpConfigs.findIndex(item => item.type === active.id)
    const to = idpConfigs.findIndex(item => item.type === over.id)
    if (from < 0 || to < 0) return
    setSortingIdp(true)
    try {
      const reordered = arrayMove(idpConfigs, from, to)
      await Promise.all(
        reordered.map((item, index) =>
          applicationApi.updateIDPConfig(domainId!, appId!, item.type, {
            priority: reordered.length - index - 1,
          })
        )
      )
      await refreshIdpConfigs()
      toast.success('身份源优先级已更新')
    } catch {
      toast.error('更新优先级失败')
    } finally {
      setSortingIdp(false)
    }
  }

  const getClientSecret = async () => {
    setLoadingClientSecret(true)
    try {
      const secret = await applicationApi.getClientSecret(domainId!, appId!)
      setClientSecret(secret)
    } catch {
      toast.error('获取失败，请确认应用已创建密钥')
    } finally {
      setLoadingClientSecret(false)
    }
  }

  const copyCredential = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label}已复制`)
    } catch {
      toast.error(`复制${label}失败`)
    }
  }

  if (loading)
    return (
      <div className={styles.loading}>
        <Spinner className="size-7" />
      </div>
    )
  if (!data)
    return (
      <EmptyState
        title="应用不存在"
        action={
          <Button type="button" onClick={() => navigate('/applications')}>
            返回应用列表
          </Button>
        }
      />
    )

  const uriFields = [
    {
      name: 'allowed_redirect_uris',
      label: '允许的重定向地址',
      description: '登录或授权后允许跳转的完整 URI。',
    },
    {
      name: 'allowed_origins',
      label: '允许的来源',
      description: '允许浏览器跨域请求的 scheme://host[:port]。',
    },
    {
      name: 'allowed_logout_uris',
      label: '登出跳转地址',
      description: '用户登出后允许跳转的白名单地址。',
    },
  ] as const
  const durationFields = [
    {
      name: 'id_token_expires_in',
      label: 'ID Token 有效期',
      description: '用户登录后签发的身份令牌。',
    },
    {
      name: 'refresh_token_expires_in',
      label: 'Refresh Token 有效期',
      description: '用于无感刷新访问令牌。',
    },
    {
      name: 'refresh_token_absolute_expires_in',
      label: 'Refresh Token 绝对有效期',
      description: '刷新令牌最长存活时间。',
    },
  ] as const

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitle}>
          <span className="flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
            {data.logo_url ? (
              <img src={data.logo_url} alt="" className="size-full object-cover" />
            ) : (
              <AppWindow />
            )}
          </span>
          <div className={styles.pageTitleText}>
            <h1>{data.name || data.app_id}</h1>
            <p>{data.description || '管理应用配置、身份源与服务权限'}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          {activeTab === 'basic' || activeTab === 'config' ? (
            <>
              {settingsForm.formState.isDirty ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => settingsForm.reset(settingsFromApplication(data))}
                >
                  取消
                </Button>
              ) : null}
              <Button type="button" disabled={saving} onClick={() => void saveSettings()}>
                {saving ? <LoaderCircle className="animate-spin" /> : <Save />}保存
              </Button>
            </>
          ) : null}
          {activeTab === 'auth' ? (
            <Button type="button" onClick={openCreateIdp}>
              <Plus />
              添加身份源
            </Button>
          ) : null}
        </div>
      </header>

      <div className={styles.statsRow}>
        <StatCard label="应用标识" value={data.app_id} icon={<KeyRound />} />
        <StatCard label="域标识" value={data.domain_id} icon={<Globe />} />
        <StatCard label="创建时间" value={formatDateTime(data.created_at)} icon={<Clock />} />
        <StatCard label="更新时间" value={formatDateTime(data.updated_at)} icon={<RefreshCw />} />
      </div>

      <Card className={styles.mainContent}>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid h-auto w-full grid-cols-4 sm:w-fit">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="config">配置信息</TabsTrigger>
              <TabsTrigger value="auth">认证方式</TabsTrigger>
              <TabsTrigger value="relations">关联关系</TabsTrigger>
            </TabsList>
            <TabsContent value="basic">
              <div className={`${styles.tabContent} grid gap-5 py-5`}>
                <FormField
                  label="应用名称"
                  htmlFor="application-name"
                  required
                  error={settingsForm.formState.errors.name?.message}
                >
                  <Input id="application-name" maxLength={32} {...settingsForm.register('name')} />
                </FormField>
                <FormField
                  label="描述"
                  htmlFor="application-description"
                  error={settingsForm.formState.errors.description?.message}
                >
                  <Textarea
                    id="application-description"
                    rows={4}
                    {...settingsForm.register('description')}
                  />
                </FormField>
              </div>
            </TabsContent>
            <TabsContent value="config">
              <div className={`${styles.tabContent} grid gap-6 py-5`}>
                <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="grid gap-1">
                    <h2 className="text-sm font-medium">客户端凭证</h2>
                    <p className="text-sm text-muted-foreground">
                      获取可用于 Grafana 等机密 OAuth 客户端的 client secret。
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loadingClientSecret}
                    onClick={() => void getClientSecret()}
                  >
                    {loadingClientSecret ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
                    获取 Secret
                  </Button>
                </div>
                <div className={styles.sectionDivider} />
                {uriFields.map(field => (
                  <Controller
                    key={field.name}
                    name={field.name}
                    control={settingsForm.control}
                    render={({ field: controlField, fieldState }) => (
                      <FormField
                        label={field.label}
                        htmlFor={field.name}
                        description={field.description}
                        error={fieldState.error?.message}
                      >
                        <UriTagsInput
                          id={field.name}
                          value={controlField.value}
                          onChange={controlField.onChange}
                          placeholder="输入地址后按回车"
                        />
                      </FormField>
                    )}
                  />
                ))}
                <div className={styles.sectionDivider} />
                <div className="grid gap-5">
                  {durationFields.map(field => (
                    <Controller
                      key={field.name}
                      name={field.name}
                      control={settingsForm.control}
                      render={({ field: controlField, fieldState }) => (
                        <FormField
                          label={field.label}
                          htmlFor={field.name}
                          description={field.description}
                          error={fieldState.error?.message}
                        >
                          <DurationInput
                            id={field.name}
                            value={controlField.value}
                            onChange={controlField.onChange}
                          />
                        </FormField>
                      )}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="auth">
              <div className={`${styles.tabContent} py-5`}>
                {idpLoading || sortingIdp ? (
                  <div className="flex min-h-40 items-center justify-center">
                    <Spinner />
                  </div>
                ) : !idpConfigs?.length ? (
                  <EmptyState
                    title="尚未配置身份源"
                    description="添加后，应用即可使用该身份源完成认证。"
                    action={
                      <Button type="button" onClick={openCreateIdp}>
                        <Plus />
                        添加身份源
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <p className={styles.idpListHint}>拖动手柄可调整身份源的优先级。</p>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={idpConfigs.map(item => item.type)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className={styles.idpList}>
                          {idpConfigs.map(idp => (
                            <SortableIdpCard
                              key={idp.type}
                              idp={idp}
                              onEdit={openEditIdp}
                              onDelete={setPendingDelete}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </>
                )}
              </div>
            </TabsContent>
            <TabsContent value="relations">
              <ServicePermissionsView
                appId={appId!}
                appName={data.name}
                appLogoUrl={data.logo_url}
                data={serviceRelations ?? []}
                loading={relationsLoading}
                onNavigateToService={id => navigate(`/services/${id}`)}
                onRelationsChange={refreshRelations}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog
        open={clientSecret !== null}
        onOpenChange={open => {
          if (!open) setClientSecret(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>客户端凭证</DialogTitle>
            <DialogDescription>
              将 client secret 保存到目标服务的密钥配置中。关闭后页面不会保留这份凭证。
            </DialogDescription>
          </DialogHeader>
          {clientSecret ? (
            <div className="grid gap-4">
              {[
                ['Client ID', clientSecret.client_id],
                ['Client Secret', clientSecret.client_secret],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-2">
                  <span className="text-sm font-medium">{label}</span>
                  <div className="flex gap-2">
                    <Input value={value} readOnly className="font-mono" aria-label={label} />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`复制 ${label}`}
                      onClick={() => void copyCredential(label, value)}
                    >
                      <Copy />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={() => setClientSecret(null)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={idpOpen}
        onOpenChange={open => {
          setIdpOpen(open)
          if (!open) setEditingIdp(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIdp ? '编辑身份源' : '添加身份源'}</DialogTitle>
            <DialogDescription>身份源由域统一提供，优先级数值越大越优先。</DialogDescription>
          </DialogHeader>
          <form className="grid gap-5" onSubmit={saveIdp} noValidate>
            <Controller
              name="type"
              control={idpForm.control}
              render={({ field, fieldState }) => (
                <FormField
                  label="身份源类型"
                  htmlFor="idp-type"
                  required
                  error={fieldState.error?.message}
                >
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={Boolean(editingIdp)}
                  >
                    <SelectTrigger id="idp-type">
                      <SelectValue placeholder="选择身份源类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableIdpTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {IDP_TYPE_LABELS[type] ?? type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <Controller
              name="priority"
              control={idpForm.control}
              render={({ field, fieldState }) => (
                <FormField label="优先级" htmlFor="idp-priority" error={fieldState.error?.message}>
                  <Input
                    id="idp-priority"
                    type="number"
                    min={0}
                    value={field.value}
                    onChange={event => field.onChange(Number(event.target.value))}
                  />
                </FormField>
              )}
            />
            <FormField
              label="策略"
              htmlFor="idp-strategy"
              error={idpForm.formState.errors.strategy?.message}
            >
              <Input
                id="idp-strategy"
                placeholder="如：password"
                {...idpForm.register('strategy')}
              />
            </FormField>
            <FormField
              label="委托"
              htmlFor="idp-delegate"
              error={idpForm.formState.errors.delegate?.message}
            >
              <Input id="idp-delegate" placeholder="可选" {...idpForm.register('delegate')} />
            </FormField>
            <FormField
              label="必需条件"
              htmlFor="idp-require"
              error={idpForm.formState.errors.require?.message}
            >
              <Input id="idp-require" placeholder="可选" {...idpForm.register('require')} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIdpOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={savingIdp}>
                {savingIdp ? <LoaderCircle className="animate-spin" /> : null}
                {editingIdp ? '保存' : '添加'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingDelete !== null} onOpenChange={open => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除身份源</DialogTitle>
            <DialogDescription>
              确定删除“
              {pendingDelete ? (IDP_TYPE_LABELS[pendingDelete.type] ?? pendingDelete.type) : ''}
              ”配置？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={savingIdp}
              onClick={() => void deleteIdp()}
            >
              {savingIdp ? <LoaderCircle className="animate-spin" /> : <Trash2 />}删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
