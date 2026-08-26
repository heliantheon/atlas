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
  allowed_redirect_uris: uriText(validateRedirectUrisMultiLine),
  allowed_origins: uriText(validateAllowedOriginsMultiLine),
  allowed_logout_uris: uriText(validateLogoutUrisMultiLine),
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
      allowed_redirect_uris: '',
      allowed_origins: '',
      allowed_logout_uris: '',
    },
  })
  const { loading: detailLoading } = useRequest(() => applicationApi.getDetail(domainId!, appId!), {
    ready: Boolean(domainId && appId),
    onSuccess: data =>
      reset({
        name: data.name,
        allowed_redirect_uris: (data.allowed_redirect_uris ?? []).join('\n'),
        allowed_origins: (data.allowed_origins ?? []).join('\n'),
        allowed_logout_uris: (data.allowed_logout_uris ?? []).join('\n'),
      }),
    onError: () => toast.error('获取应用信息失败'),
  })
  const { run: submit, loading } = useRequest(
    async (values: Values) => {
      await applicationApi.update(domainId!, appId!, {
        name: values.name,
        allowed_redirect_uris: lines(values.allowed_redirect_uris),
        allowed_origins: lines(values.allowed_origins),
        allowed_logout_uris: lines(values.allowed_logout_uris),
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
