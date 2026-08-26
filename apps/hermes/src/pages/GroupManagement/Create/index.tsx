import { useRequest } from 'ahooks'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Card, Input, Select, toast } from '@heliannuuthus/ui'
import { PageHeader } from '@atlas/shared'
import { FormActions } from '@/components/forms/FormActions'
import { FormField } from '@/components/forms/FormField'
import { useAppNavigate, useDomainId } from '@/contexts/DomainContext'
import { groupApi, serviceApi } from '@/services'
import styles from './index.module.scss'

const schema = z.object({
  group_id: z.string().trim().min(1, '请输入组 ID'),
  service_id: z.string().trim().min(1, '请选择所属服务'),
  name: z.string().trim().min(1, '请输入名称'),
  description: z.string().trim().optional(),
})
type Values = z.infer<typeof schema>

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
    defaultValues: { group_id: '', service_id: '', name: '', description: '' },
  })
  const { data: services, loading: servicesLoading } = useRequest(
    () => serviceApi.getList(domainId!),
    { ready: Boolean(domainId) }
  )
  const { run: submit, loading } = useRequest(
    async (values: Values) => {
      await groupApi.create(values)
      toast.success('创建成功')
      navigate('/groups')
    },
    { manual: true, onError: () => toast.error('创建失败') }
  )

  return (
    <div className={styles.container}>
      <PageHeader title="新建组" onBack={() => navigate('/groups')} />
      <Card>
        <form onSubmit={handleSubmit(values => submit(values))} className={styles.form} noValidate>
          <FormField label="组 ID" htmlFor="group-id" required error={errors.group_id?.message}>
            <Input id="group-id" {...register('group_id')} />
          </FormField>
          <Controller
            name="service_id"
            control={control}
            render={({ field, fieldState }) => (
              <FormField
                label="所属服务"
                htmlFor="group-service"
                required
                error={fieldState.error?.message}
              >
                <Select
                  value={field.value || null}
                  onChange={field.onChange}
                  disabled={servicesLoading}
                  placeholder="选择当前域中的服务"
                  triggerProps={{ id: 'group-service' }}
                  options={(services?.items ?? []).map(service => ({
                    label: service.name || service.service_id,
                    value: service.service_id,
                  }))}
                />
              </FormField>
            )}
          />
          <FormField label="名称" htmlFor="group-name" required error={errors.name?.message}>
            <Input id="group-name" {...register('name')} />
          </FormField>
          <FormField label="描述" htmlFor="group-description" error={errors.description?.message}>
            <Input.TextArea id="group-description" rows={4} {...register('description')} />
          </FormField>
          <FormActions
            submitting={loading}
            submitText="创建"
            onCancel={() => navigate('/groups')}
          />
        </form>
      </Card>
    </div>
  )
}
