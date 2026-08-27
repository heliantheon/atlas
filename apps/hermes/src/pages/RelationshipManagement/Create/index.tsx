import { useRequest } from 'ahooks'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { Card, Input, Select, toast } from '@heliannuuthus/ui'
import { PageHeader } from '@atlas/shared'
import { FormActions } from '@/components/forms/FormActions'
import { FormField } from '@/components/forms/FormField'
import { useAppNavigate, useDomainId } from '@/contexts/DomainContext'
import { relationshipApi, serviceApi } from '@/services'
import { collectCursorPages } from '@/utils/pagination'
import styles from './index.module.scss'

const schema = z.object({
  service_id: z.string().min(1, '请选择服务'),
  subject_type: z.enum(['user', 'group', 'application'], { message: '请选择主体类型' }),
  subject_id: z.string().trim().min(1, '请输入主体 ID'),
  relation: z.string().trim().min(1, '请输入关系'),
  object_type: z.string().trim().min(1, '请选择对象类型'),
  object_id: z.string().trim().min(1, '请输入对象 ID'),
  expires_at: z.string(),
})
type Values = z.infer<typeof schema>

export function Create() {
  const { serviceId: urlServiceId } = useParams<{ serviceId: string }>()
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
      service_id: urlServiceId ?? '',
      subject_type: undefined,
      subject_id: '',
      relation: '',
      object_type: '',
      object_id: '',
      expires_at: '',
    },
  })
  const { data: services } = useRequest(
    () =>
      collectCursorPages(token => serviceApi.getList(domainId!, undefined, { token, size: 100 })),
    { ready: Boolean(domainId && !urlServiceId) }
  )
  const { run: submit, loading } = useRequest(
    async (values: Values) => {
      await relationshipApi.create({
        service_id: urlServiceId || values.service_id,
        subject_type: values.subject_type,
        subject_id: values.subject_id,
        relation: values.relation,
        object_type: values.object_type,
        object_id: values.object_id,
        expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : undefined,
      })
      toast.success('创建成功')
      navigate(urlServiceId ? `/services/${urlServiceId}` : '/relationships')
    },
    { manual: true, onError: () => toast.error('创建失败') }
  )
  const backPath = urlServiceId ? `/services/${urlServiceId}` : '/relationships'

  return (
    <div className={styles.container}>
      <PageHeader title="新建关系" onBack={() => navigate(backPath)} />
      <Card>
        <form onSubmit={handleSubmit(values => submit(values))} className={styles.form} noValidate>
          {!urlServiceId ? (
            <FormField
              label="服务"
              htmlFor="relationship-service"
              required
              error={errors.service_id?.message}
            >
              <Controller
                control={control}
                name="service_id"
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onChange={field.onChange}
                    placeholder="请选择服务"
                    triggerProps={{ id: 'relationship-service' }}
                    options={(services ?? []).map(service => ({
                      label: service.name,
                      value: service.service_id,
                    }))}
                  />
                )}
              />
            </FormField>
          ) : null}
          <FormField
            label="主体类型"
            htmlFor="subject-type"
            required
            error={errors.subject_type?.message}
          >
            <Controller
              control={control}
              name="subject_type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="请选择主体类型"
                  triggerProps={{ id: 'subject-type' }}
                  options={[
                    { label: '用户', value: 'user' },
                    { label: '组', value: 'group' },
                    { label: '应用', value: 'application' },
                  ]}
                />
              )}
            />
          </FormField>
          <FormField
            label="主体 ID"
            htmlFor="subject-id"
            required
            error={errors.subject_id?.message}
          >
            <Input id="subject-id" {...register('subject_id')} />
          </FormField>
          <FormField label="关系" htmlFor="relation" required error={errors.relation?.message}>
            <Input id="relation" placeholder="owner、editor、viewer" {...register('relation')} />
          </FormField>
          <FormField
            label="对象类型"
            htmlFor="object-type"
            required
            error={errors.object_type?.message}
          >
            <Controller
              control={control}
              name="object_type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="请选择对象类型"
                  triggerProps={{ id: 'object-type' }}
                  options={[
                    { label: '资源', value: 'resource' },
                    { label: '组', value: 'group' },
                  ]}
                />
              )}
            />
          </FormField>
          <FormField label="对象 ID" htmlFor="object-id" required error={errors.object_id?.message}>
            <Input id="object-id" {...register('object_id')} />
          </FormField>
          <FormField label="过期时间" htmlFor="expires-at" error={errors.expires_at?.message}>
            <Input id="expires-at" type="datetime-local" {...register('expires_at')} />
          </FormField>
          <FormActions submitting={loading} submitText="创建" onCancel={() => navigate(backPath)} />
        </form>
      </Card>
    </div>
  )
}
