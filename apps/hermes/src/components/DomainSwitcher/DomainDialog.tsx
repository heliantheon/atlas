import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { LoaderCircle } from 'lucide-react'
import { Button, Dialog, Input, toast } from '@heliannuuthus/ui'
import { FormField } from '@/components/forms/FormField'
import { domainApi } from '@/services'
import type { Domain } from '@/types'

const domainSchema = z.object({
  domain_id: z
    .string()
    .trim()
    .min(4, '域 ID 至少需要 4 个字符')
    .max(32, '域 ID 不能超过 32 个字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '仅允许字母、数字、下划线和连字符'),
  name: z.string().trim().min(1, '请输入域名称').max(128, '域名称不能超过 128 个字符'),
  description: z.string().trim().max(512, '域描述不能超过 512 个字符'),
})

type DomainFormValues = z.infer<typeof domainSchema>

export type DomainDialogState = { mode: 'create' } | { mode: 'edit'; domain: Domain } | null

interface DomainDialogProps {
  state: DomainDialogState
  onOpenChange: (open: boolean) => void
  onSaved: (domain: Domain, mode: 'create' | 'edit') => void
}

function getDefaultValues(state: Exclude<DomainDialogState, null>): DomainFormValues {
  if (state.mode === 'edit') {
    return {
      domain_id: state.domain.domain_id,
      name: state.domain.name,
      description: state.domain.description ?? '',
    }
  }
  return { domain_id: '', name: '', description: '' }
}

export function DomainDialog({ state, onOpenChange, onSaved }: DomainDialogProps) {
  const isOpen = state !== null
  const isEdit = state?.mode === 'edit'
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: { domain_id: '', name: '', description: '' },
  })

  useEffect(() => {
    if (state) reset(getDefaultValues(state))
  }, [reset, state])

  const submit = handleSubmit(async values => {
    try {
      const description = values.description || undefined
      const saved = isEdit
        ? await domainApi.update(state.domain.domain_id, {
            name: values.name,
            description: description ?? null,
          })
        : await domainApi.create({
            domain_id: values.domain_id,
            name: values.name,
            description,
          })
      toast.success(isEdit ? '域信息已更新' : '域已创建')
      onSaved(saved, isEdit ? 'edit' : 'create')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isEdit ? '更新域失败' : '创建域失败')
    }
  })

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => !isSubmitting && onOpenChange(open)}
      title={isEdit ? '编辑域' : '创建域'}
      description={
        isEdit
          ? '域 ID 创建后不可修改。名称和描述会立即应用到域切换列表。'
          : '域用于隔离应用、服务以及身份与权限数据。'
      }
    >
      <form onSubmit={submit} noValidate>
        <div className="grid gap-5">
          <FormField
            label="域 ID"
            htmlFor="domain-id"
            required
            error={errors.domain_id?.message}
            description={isEdit ? '域 ID 创建后不可修改' : '4–32 个字符，可使用字母、数字、_ 和 -'}
          >
            <Input
              id="domain-id"
              autoComplete="off"
              disabled={isEdit || isSubmitting}
              aria-invalid={Boolean(errors.domain_id)}
              {...register('domain_id')}
            />
          </FormField>
          <FormField label="域名称" htmlFor="domain-name" required error={errors.name?.message}>
            <Input
              id="domain-name"
              autoComplete="off"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.name)}
              {...register('name')}
            />
          </FormField>
          <FormField
            label="域描述"
            htmlFor="domain-description"
            error={errors.description?.message}
          >
            <Input.TextArea
              id="domain-description"
              rows={4}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.description)}
              {...register('description')}
            />
          </FormField>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
            {isEdit ? '保存修改' : '创建域'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
