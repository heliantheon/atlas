import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { Button, Empty, toast } from '@heliannuuthus/ui'
import {
  chaosTemplateApi,
  type TemplateCreateRequest,
  type TemplateUpdateRequest,
} from '@/services'
import { TemplateEditor } from '../TemplateEditor'

export function Edit() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const { data, loading, error, refresh } = useRequest(
    () => chaosTemplateApi.getDetail(templateId!),
    {
      ready: Boolean(templateId),
    }
  )

  const save = async (value: TemplateCreateRequest | TemplateUpdateRequest) => {
    if (!templateId) return
    setSaving(true)
    try {
      await chaosTemplateApi.update(templateId, value as TemplateUpdateRequest)
      toast.success('模板已更新')
      navigate(`/templates/${templateId}`)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : '模板更新失败')
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <Empty
        title="无法读取模板"
        description="模板不存在，或管理接口暂时不可用。"
        actions={<Button onClick={refresh}>重试</Button>}
      />
    )
  }

  if (loading || !data) {
    return (
      <TemplateEditor mode="edit" loading onCancel={() => navigate('/templates')} onSave={save} />
    )
  }

  return (
    <TemplateEditor
      mode="edit"
      initialValue={data}
      saving={saving}
      onCancel={() => navigate(`/templates/${templateId ?? ''}`)}
      onSave={save}
    />
  )
}
