import { useRequest } from 'ahooks'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { Card, Input, Spinner, toast } from '@heliannuuthus/ui'
import { PageHeader } from '@atlas/shared'
import { FormActions } from '@/components/forms/FormActions'
import { FormField } from '@/components/forms/FormField'
import { useAppNavigate, useDomainId } from '@/contexts/DomainContext'
import { applicationApi } from '@/services'
import {
  validateAllowedOriginsMultiLine,
  validateLogoutUrisMultiLine,
  validateRedirectUrisMultiLine,
} from '@/utils/uri-validation'
import styles from './index.module.scss'

function uriText(validator: (value: string) => string | null) {
  return z.string().superRefine((value, context) => {
    const error = validator(value)
    if (error) context.addIssue({ code: 'custom', message: error })
  })
}
const schema = z.object({
  name: z.string().trim().min(1, '请输入名称'),
  description: z.string().trim(),
  logo_url: z.string().trim().url('请输入完整的 Logo URL').or(z.literal('')),
  allowed_redirect_uris: uriText(validateRedirectUrisMultiLine),
  allowed_origins: uriText(validateAllowedOriginsMultiLine),
  allowed_logout_uris: uriText(validateLogoutUrisMultiLine),
  id_token_expires_in: z.number().int().positive('必须大于 0'),
  refresh_token_expires_in: z.number().int().positive('必须大于 0'),
  refresh_token_absolute_expires_in: z.number().int().nonnegative('不能小于 0'),
})
type Values = z.infer<typeof schema>
const lines = (value: string) =>
  value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)

export function Edit() {
  const { appId } = useParams<{ appId: string }>()
  const domainId = useDomainId()
  const navigate = useAppNavigate()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      logo_url: '',
      allowed_redirect_uris: '',
      allowed_origins: '',
      allowed_logout_uris: '',
      id_token_expires_in: 3600,
      refresh_token_expires_in: 604_800,
      refresh_token_absolute_expires_in: 0,
    },
  })
  const { loading: detailLoading } = useRequest(() => applicationApi.getDetail(domainId!, appId!), {
    ready: Boolean(domainId && appId),
    onSuccess: data =>
      reset({
        name: data.name,
        description: data.description ?? '',
        logo_url: data.logo_url ?? '',
        allowed_redirect_uris: (data.allowed_redirect_uris ?? []).join('\n'),
        allowed_origins: (data.allowed_origins ?? []).join('\n'),
        allowed_logout_uris: (data.allowed_logout_uris ?? []).join('\n'),
        id_token_expires_in: data.id_token_expires_in,
        refresh_token_expires_in: data.refresh_token_expires_in,
        refresh_token_absolute_expires_in: data.refresh_token_absolute_expires_in,
      }),
    onError: () => toast.error('获取应用信息失败'),
  })
  const { run: submit, loading } = useRequest(
    async (values: Values) => {
      await applicationApi.update(domainId!, appId!, {
        name: values.name,
        description: values.description || null,
        logo_url: values.logo_url || null,
        allowed_redirect_uris: lines(values.allowed_redirect_uris),
        allowed_origins: lines(values.allowed_origins),
        allowed_logout_uris: lines(values.allowed_logout_uris),
        id_token_expires_in: values.id_token_expires_in,
        refresh_token_expires_in: values.refresh_token_expires_in,
        refresh_token_absolute_expires_in: values.refresh_token_absolute_expires_in,
      })
      toast.success('更新成功')
      navigate(`/applications/${appId}`)
    },
    { manual: true, onError: () => toast.error('更新失败') }
  )
  if (detailLoading)
    return (
      <div className="flex min-h-56 items-center justify-center">
        <Spinner className="size-7" />
      </div>
    )
  return (
    <div className={styles.container}>
      <PageHeader title="编辑应用" onBack={() => navigate(`/applications/${appId}`)} />
      <Card>
        <form onSubmit={handleSubmit(values => submit(values))} className={styles.form} noValidate>
          <FormField label="名称" htmlFor="app-name" required error={errors.name?.message}>
            <Input id="app-name" {...register('name')} />
          </FormField>
          <FormField label="描述" htmlFor="app-description" error={errors.description?.message}>
            <Input.TextArea id="app-description" rows={3} {...register('description')} />
          </FormField>
          <FormField label="Logo URL" htmlFor="app-logo" error={errors.logo_url?.message}>
            <Input
              id="app-logo"
              type="url"
              placeholder="https://example.com/logo.svg"
              {...register('logo_url')}
            />
          </FormField>
          <FormField
            label="重定向 URI（每行一个）"
            htmlFor="redirect-uris"
            error={errors.allowed_redirect_uris?.message}
          >
            <Input.TextArea id="redirect-uris" rows={3} {...register('allowed_redirect_uris')} />
          </FormField>
          <FormField
            label="允许的来源 CORS（每行一个）"
            htmlFor="allowed-origins"
            error={errors.allowed_origins?.message}
          >
            <Input.TextArea id="allowed-origins" rows={2} {...register('allowed_origins')} />
          </FormField>
          <FormField
            label="登出后跳转 URI（每行一个）"
            htmlFor="logout-uris"
            error={errors.allowed_logout_uris?.message}
          >
            <Input.TextArea id="logout-uris" rows={2} {...register('allowed_logout_uris')} />
          </FormField>
          <FormField
            label="ID Token 有效期（秒）"
            htmlFor="id-token-expiry"
            required
            error={errors.id_token_expires_in?.message}
          >
            <Input
              id="id-token-expiry"
              type="number"
              min={1}
              {...register('id_token_expires_in', { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Refresh Token 有效期（秒）"
            htmlFor="refresh-token-expiry"
            required
            error={errors.refresh_token_expires_in?.message}
          >
            <Input
              id="refresh-token-expiry"
              type="number"
              min={1}
              {...register('refresh_token_expires_in', { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Refresh Token 绝对有效期（秒）"
            htmlFor="refresh-token-absolute-expiry"
            required
            error={errors.refresh_token_absolute_expires_in?.message}
          >
            <Input
              id="refresh-token-absolute-expiry"
              type="number"
              min={0}
              {...register('refresh_token_absolute_expires_in', { valueAsNumber: true })}
            />
            <span className="text-xs text-muted-foreground">0 表示不设绝对存活上限。</span>
          </FormField>
          <FormActions
            submitting={loading}
            submitText="保存"
            onCancel={() => navigate(`/applications/${appId}`)}
          />
        </form>
      </Card>
    </div>
  )
}
