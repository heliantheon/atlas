import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@heliannuuthus/ui'
import {
  chaosTemplateApi,
  type TemplateCreateRequest,
  type TemplateUpdateRequest,
} from '@/services'
import { TemplateEditor } from '../TemplateEditor'

export function Create() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const save = async (value: TemplateCreateRequest | TemplateUpdateRequest) => {
    setSaving(true)
    try {
      const created = await chaosTemplateApi.create(value as TemplateCreateRequest)
      toast.success('模板已创建')
      navigate(`/templates/${created.template_id}`)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : '模板创建失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <TemplateEditor
      mode="create"
      saving={saving}
      onCancel={() => navigate('/templates')}
      onSave={save}
    />
  )
}
