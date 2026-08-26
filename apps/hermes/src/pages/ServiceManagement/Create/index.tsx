import { useRequest } from 'ahooks'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Card, CardContent } from '@atlas/ui/card'
import { Input } from '@atlas/ui/input'
import { Textarea } from '@atlas/ui/textarea'
import { toast } from '@atlas/ui/toast'
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
      access_token_expires_in: 7200,
    },
  })
  const { run: submit, loading } = useRequest(
    async (values: Values) => {
      await serviceApi.create(domainId!, values)
      toast.success('创建成功')
      navigate('/services')
    },
    { manual: true, onError: () => toast.error('创建失败') }
  )

  return (
    <div className={styles.container}>
      <PageHeader title="新建服务" onBack={() => navigate('/services')} />
      <Card>
        <CardContent>
          <form
            onSubmit={handleSubmit(values => submit(values))}
            className={styles.form}
            noValidate
          >
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
              <Textarea id="service-description" rows={3} {...register('description')} />
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
              submitText="创建"
              onCancel={() => navigate('/services')}
            />
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
