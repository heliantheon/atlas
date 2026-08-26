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
import { serviceApi } from '@/services'
import styles from './index.module.scss'

const schema = z.object({
  name: z.string().trim().min(1, '请输入名称'),
  description: z.string().trim().optional(),
  logo_url: z.string().trim().url('请输入完整的 Logo URL').or(z.literal('')),
  access_token_expires_in: z.number().int().positive('必须大于 0'),
})
type Values = z.infer<typeof schema>

export function Edit() {
  const { serviceId } = useParams<{ serviceId: string }>()
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
      access_token_expires_in: 7200,
    },
  })
  const { loading: detailLoading } = useRequest(() => serviceApi.getDetail(domainId!, serviceId!), {
    ready: Boolean(domainId && serviceId),
    onSuccess: data =>
      reset({
        name: data.name,
        description: data.description ?? '',
        logo_url: data.logo_url ?? '',
        access_token_expires_in: data.access_token_expires_in,
      }),
    onError: () => toast.error('获取服务信息失败'),
  })
  const { run: submit, loading } = useRequest(
    async (values: Values) => {
      await serviceApi.update(domainId!, serviceId!, {
        ...values,
        description: values.description?.trim() || null,
        logo_url: values.logo_url.trim() || null,
      })
      toast.success('更新成功')
      navigate(`/services/${serviceId}`)
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
      <PageHeader title="编辑服务" onBack={() => navigate(`/services/${serviceId}`)} />
      <Card>
        <form onSubmit={handleSubmit(values => submit(values))} className={styles.form} noValidate>
          <FormField label="名称" htmlFor="service-name" required error={errors.name?.message}>
            <Input id="service-name" {...register('name')} />
          </FormField>
          <FormField label="描述" htmlFor="service-description" error={errors.description?.message}>
            <Input.TextArea id="service-description" rows={4} {...register('description')} />
          </FormField>
          <FormField label="Logo URL" htmlFor="service-logo" error={errors.logo_url?.message}>
            <Input
              id="service-logo"
              type="url"
              placeholder="https://example.com/logo.svg"
              {...register('logo_url')}
            />
          </FormField>
          <FormField
            label="Access Token 过期时间（秒）"
            htmlFor="access-token-expiry"
            required
            error={errors.access_token_expires_in?.message}
          >
            <Input
              id="access-token-expiry"
              type="number"
              min={1}
              {...register('access_token_expires_in', { valueAsNumber: true })}
            />
          </FormField>
          <FormActions
            submitting={loading}
            submitText="保存"
            onCancel={() => navigate(`/services/${serviceId}`)}
          />
        </form>
      </Card>
    </div>
  )
}
