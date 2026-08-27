import { useRequest } from 'ahooks'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Card, Input, toast } from '@heliannuuthus/ui'
import { PageHeader } from '@atlas/shared'
import { FormActions } from '@/components/forms/FormActions'
import { FormField } from '@/components/forms/FormField'
import { useAppNavigate, useDomainId } from '@/contexts/DomainContext'
import { serviceApi } from '@/services'
import styles from './index.module.scss'

const schema = z.object({
  service_id: z.string().trim().min(1, '请输入服务 ID'),
  name: z.string().trim().min(1, '请输入名称'),
  description: z.string().trim().min(1, '请输入描述'),
  logo_url: z.string().trim().url('请输入完整的 Logo URL').or(z.literal('')),
  access_token_expires_in: z.number().int().positive('必须大于 0'),
})
type Values = z.infer<typeof schema>

export function Create() {
  const navigate = useAppNavigate()
  const domainId = useDomainId()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      service_id: '',
      name: '',
      description: '',
      logo_url: '',
      access_token_expires_in: 7200,
    },
  })
  const { run: submit, loading } = useRequest(
    async (values: Values) => {
      await serviceApi.create(domainId!, { ...values, logo_url: values.logo_url || undefined })
      toast.success('创建成功')
      navigate('/services')
    },
    { manual: true, onError: () => toast.error('创建失败') }
  )

  return (
    <div className={styles.container}>
      <PageHeader title="新建服务" onBack={() => navigate('/services')} />
      <Card>
        <form onSubmit={handleSubmit(values => submit(values))} className={styles.form} noValidate>
          <FormField
            label="服务 ID"
            htmlFor="service-id"
            required
            error={errors.service_id?.message}
          >
            <Input id="service-id" {...register('service_id')} />
          </FormField>
          <FormField label="名称" htmlFor="service-name" required error={errors.name?.message}>
            <Input id="service-name" {...register('name')} />
          </FormField>
          <FormField
            label="描述"
            htmlFor="service-description"
            required
            error={errors.description?.message}
          >
            <Input.TextArea id="service-description" rows={3} {...register('description')} />
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
          <FormField label="Logo URL" htmlFor="service-logo" error={errors.logo_url?.message}>
            <Input
              id="service-logo"
              type="url"
              placeholder="https://example.com/logo.svg"
              {...register('logo_url')}
            />
          </FormField>
          <FormActions
            submitting={loading}
            submitText="创建"
            onCancel={() => navigate('/services')}
          />
        </form>
      </Card>
    </div>
  )
}
