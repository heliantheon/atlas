import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Dialog, Input, Select, Tag } from '@heliannuuthus/ui'
import { FormField } from '@/components/forms/FormField'

interface NodeRef {
  type: string
  id: string
}
interface CreateRelationDialogProps {
  open: boolean
  sourceNode: NodeRef | null
  targetNode: NodeRef | null
  serviceId: string
  onConfirm: (data: { relation: string; expiresAt?: string }) => void
  onCancel: () => void
}

const relationOptions = [
  ['owner', 'owner - 所有者'],
  ['admin', 'admin - 管理员'],
  ['member', 'member - 成员'],
  ['viewer', 'viewer - 查看者'],
  ['editor', 'editor - 编辑者'],
  ['reader', 'reader - 读取者'],
  ['writer', 'writer - 写入者'],
] as const
const schema = z.object({
  relation: z.string().trim().min(1, '请选择或输入关系类型'),
  expiresAt: z.string(),
})
type Values = z.infer<typeof schema>

export function CreateRelationDialog({
  open,
  sourceNode,
  targetNode,
  serviceId,
  onConfirm,
  onCancel,
}: CreateRelationDialogProps) {
  const [custom, setCustom] = useState(false)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { relation: '', expiresAt: '' },
  })
  const close = () => {
    form.reset()
    setCustom(false)
    onCancel()
  }
  const submit = form.handleSubmit(values => {
    onConfirm({
      relation: values.relation.trim(),
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
    })
    form.reset()
    setCustom(false)
  })

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) close()
      }}
      title="创建关系"
      description="为两个节点建立当前服务下的授权关系。"
    >
      <div className="grid gap-2 rounded-lg border bg-muted/35 p-4 text-sm">
        <span className="text-muted-foreground">
          服务：<strong className="text-foreground">{serviceId || '未选择'}</strong>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Tag type="info">
            {sourceNode?.type}:{sourceNode?.id}
          </Tag>
          <span aria-hidden>→</span>
          <Tag>
            {targetNode?.type}:{targetNode?.id}
          </Tag>
        </div>
      </div>
      <form className="grid gap-5" onSubmit={submit} noValidate>
        <Controller
          name="relation"
          control={form.control}
          render={({ field, fieldState }) => (
            <FormField
              label="关系类型"
              htmlFor="relation-type"
              required
              error={fieldState.error?.message}
            >
              {custom ? (
                <div className="flex gap-2">
                  <Input id="relation-type" autoFocus placeholder="输入自定义关系类型" {...field} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCustom(false)
                      field.onChange('')
                    }}
                  >
                    选择预设
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Select<string>
                    id="relation-type"
                    value={field.value || null}
                    onChange={value => field.onChange(value ?? '')}
                    placeholder="选择关系类型"
                    options={relationOptions.map(([value, label]) => ({ value, label }))}
                  />
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto justify-start p-0"
                    onClick={() => {
                      setCustom(true)
                      field.onChange('')
                    }}
                  >
                    使用自定义关系类型
                  </Button>
                </div>
              )}
            </FormField>
          )}
        />
        <FormField label="过期时间（可选）" htmlFor="relation-expires">
          <Input id="relation-expires" type="datetime-local" {...form.register('expiresAt')} />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>
            取消
          </Button>
          <Button type="submit">创建</Button>
        </div>
      </form>
    </Dialog>
  )
}
