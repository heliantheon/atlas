import { useRequest } from 'ahooks'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { Card, Input, Spinner, toast } from '@heliannuuthus/ui'
import { PageHeader } from '@atlas/shared'
import { FormActions } from '@/components/forms/FormActions'
import { FormField } from '@/components/forms/FormField'
import { useAppNavigate } from '@/contexts/DomainContext'
import { groupApi } from '@/services'
import styles from './index.module.scss'

const schema = z.object({
  name: z.string().trim().min(1, '请输入名称'),
  description: z.string().trim().optional(),
})
type Values = z.infer<typeof schema>

export function Edit() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useAppNavigate()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  })
  const { loading: detailLoading } = useRequest(() => groupApi.getDetail(groupId!), {
    ready: Boolean(groupId),
    onSuccess: data => reset({ name: data.name, description: data.description ?? '' }),
    onError: () => toast.error('获取组信息失败'),
  })
  const { run: submit, loading } = useRequest(
    async (values: Values) => {
      await groupApi.update(groupId!, values)
      toast.success('更新成功')
      navigate(`/groups/${groupId}`)
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
      <PageHeader title="编辑组" onBack={() => navigate(`/groups/${groupId}`)} />
      <Card>
        <form onSubmit={handleSubmit(values => submit(values))} className={styles.form} noValidate>
          <FormField label="名称" htmlFor="group-name" required error={errors.name?.message}>
            <Input id="group-name" {...register('name')} />
          </FormField>
          <FormField label="描述" htmlFor="group-description" error={errors.description?.message}>
            <Input.TextArea id="group-description" rows={4} {...register('description')} />
          </FormField>
          <FormActions
            submitting={loading}
            submitText="保存"
            onCancel={() => navigate(`/groups/${groupId}`)}
          />
        </form>
      </Card>
    </div>
  )
}
