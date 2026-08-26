import { useRequest } from 'ahooks'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Card, Input, Switch, toast } from '@heliannuuthus/ui'
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
  app_id: z.string().trim(),
  name: z.string().trim().min(1, '请输入名称'),
  description: z.string().trim().min(1, '请输入描述'),
  allowed_redirect_uris: uriText(validateRedirectUrisMultiLine),
  allowed_origins: uriText(validateAllowedOriginsMultiLine),
  allowed_logout_uris: uriText(validateLogoutUrisMultiLine),
  need_key: z.boolean(),
})
type Values = z.infer<typeof schema>
const lines = (value: string) =>
  value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)

export function Create() {
  const navigate = useAppNavigate()
  const domainId = useDomainId()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      app_id: '',
      name: '',
      description: '',
      allowed_redirect_uris: '',
      allowed_origins: '',
      allowed_logout_uris: '',
      need_key: false,
    },
  })
  const { run: submit, loading } = useRequest(
    async (values: Values) => {
      await applicationApi.create(domainId!, {
        app_id: values.app_id,
        name: values.name,
        description: values.description,
        allowed_redirect_uris: lines(values.allowed_redirect_uris),
        allowed_origins: lines(values.allowed_origins),
        allowed_logout_uris: lines(values.allowed_logout_uris),
        need_key: values.need_key,
      })
      toast.success('创建成功')
      navigate('/applications')
    },
    { manual: true, onError: () => toast.error('创建失败') }
  )

  return (
    <div className={styles.container}>
      <PageHeader title="新建应用" onBack={() => navigate('/applications')} />
      <Card>
        <form onSubmit={handleSubmit(values => submit(values))} className={styles.form} noValidate>
          <FormField
            label="应用标识"
            htmlFor="app-id"
            error={errors.app_id?.message}
            description="可选；留空时由服务端生成"
          >
            <Input id="app-id" {...register('app_id')} />
          </FormField>
          <FormField label="名称" htmlFor="app-name" required error={errors.name?.message}>
            <Input id="app-name" {...register('name')} />
          </FormField>
          <FormField
            label="描述"
            htmlFor="app-description"
            required
            error={errors.description?.message}
          >
            <Input.TextArea id="app-description" rows={3} {...register('description')} />
          </FormField>
          <FormField
            label="重定向 URI（每行一个）"
            htmlFor="redirect-uris"
            error={errors.allowed_redirect_uris?.message}
          >
            <Input.TextArea
              id="redirect-uris"
              rows={3}
              placeholder="https://example.com/callback"
              {...register('allowed_redirect_uris')}
            />
          </FormField>
          <FormField
            label="允许的来源 CORS（每行一个）"
            htmlFor="allowed-origins"
            error={errors.allowed_origins?.message}
          >
            <Input.TextArea
              id="allowed-origins"
              rows={2}
              placeholder="https://example.com"
              {...register('allowed_origins')}
            />
          </FormField>
          <FormField
            label="登出后跳转 URI（每行一个）"
            htmlFor="logout-uris"
            error={errors.allowed_logout_uris?.message}
          >
            <Input.TextArea
              id="logout-uris"
              rows={2}
              placeholder="https://example.com"
              {...register('allowed_logout_uris')}
            />
          </FormField>
          <FormField label="需要密钥" htmlFor="need-key">
            <Controller
              control={control}
              name="need_key"
              render={({ field }) => (
                <Switch id="need-key" checked={field.value} onChange={field.onChange} />
              )}
            />
          </FormField>
          <FormActions
            submitting={loading}
            submitText="创建"
            onCancel={() => navigate('/applications')}
          />
        </form>
      </Card>
    </div>
  )
}
