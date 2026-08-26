import { useState, type FormEvent } from 'react'
import { Button, Input, Spinner, Switch } from '@heliannuuthus/ui'
import { ArrowLeft, Braces, CheckCircle2, Code2, Save } from 'lucide-react'
import type { EmailTemplate, TemplateCreateRequest, TemplateUpdateRequest } from '@/services'
import styles from './index.module.scss'

interface TemplateDraft {
  template_id: string
  name: string
  description: string
  subject: string
  content: string
  variables: string
  service_id: string
  is_enabled: boolean
}

interface TemplateEditorProps {
  mode: 'create' | 'edit'
  initialValue?: EmailTemplate
  loading?: boolean
  saving?: boolean
  onCancel: () => void
  onSave: (value: TemplateCreateRequest | TemplateUpdateRequest) => Promise<void>
}

const emptyDraft: TemplateDraft = {
  template_id: '',
  name: '',
  description: '',
  subject: '',
  content: '',
  variables: '',
  service_id: '',
  is_enabled: true,
}

function toDraft(value?: EmailTemplate): TemplateDraft {
  if (!value) return emptyDraft
  return {
    template_id: value.template_id,
    name: value.name,
    description: value.description ?? '',
    subject: value.subject,
    content: value.content,
    variables: value.variables ?? '',
    service_id: value.service_id ?? '',
    is_enabled: value.is_enabled,
  }
}

export function TemplateEditor({
  mode,
  initialValue,
  loading = false,
  saving = false,
  onCancel,
  onSave,
}: TemplateEditorProps) {
  const [draft, setDraft] = useState<TemplateDraft>(() => toDraft(initialValue))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <Key extends keyof TemplateDraft>(key: Key, value: TemplateDraft[Key]) => {
    setDraft(current => ({ ...current, [key]: value }))
    setErrors(current => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (mode === 'create' && !/^[a-z0-9_-]+$/.test(draft.template_id)) {
      next.template_id = '使用小写字母、数字、下划线或短横线。'
    }
    if (draft.template_id.length > 64) next.template_id = '模板 ID 不超过 64 个字符。'
    if (!draft.name.trim()) next.name = '填写模板名称。'
    if (draft.name.trim().length > 128) next.name = '模板名称不超过 128 个字符。'
    if (draft.description.trim().length > 512) next.description = '描述不超过 512 个字符。'
    if (!draft.subject.trim()) next.subject = '填写邮件主题。'
    if (draft.subject.length > 256) next.subject = '邮件主题不超过 256 个字符。'
    if (!draft.content.trim()) next.content = '填写 HTML 邮件内容。'
    if (draft.service_id.trim().length > 32) next.service_id = '服务 ID 不超过 32 个字符。'
    if (draft.variables.trim()) {
      try {
        const parsed = JSON.parse(draft.variables)
        if (parsed == null || Array.isArray(parsed) || typeof parsed !== 'object') {
          next.variables = '示例变量必须是 JSON 对象。'
        }
      } catch {
        next.variables = '示例变量不是有效的 JSON。'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    if (mode === 'create') {
      await onSave({
        template_id: draft.template_id.trim(),
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        subject: draft.subject,
        content: draft.content,
        variables: draft.variables.trim() || undefined,
        service_id: draft.service_id.trim() || undefined,
      })
      return
    }
    await onSave({
      name: draft.name.trim(),
      description: draft.description.trim(),
      subject: draft.subject,
      content: draft.content,
      variables: draft.variables.trim(),
      is_enabled: draft.is_enabled,
    })
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" /> 正在读取模板…
      </div>
    )
  }

  return (
    <form className={styles.page} onSubmit={event => void submit(event)} noValidate>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Button variant="ghost" size="icon" aria-label="返回模板" onClick={onCancel}>
            <ArrowLeft aria-hidden="true" />
          </Button>
          <div>
            <span>DELIVERY ASSET / {mode === 'create' ? 'NEW' : draft.template_id}</span>
            <h1>{mode === 'create' ? '创建邮件模板' : '编辑邮件模板'}</h1>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner /> : <Save aria-hidden="true" />}
            {mode === 'create' ? '创建模板' : '保存更改'}
          </Button>
        </div>
      </header>

      <div className={styles.workbench}>
        <section className={styles.editor} aria-label="模板字段">
          <div className={styles.sectionTitle}>
            <span>IDENTITY</span>
            <h2>模板身份</h2>
          </div>
          <div className={styles.twoColumns}>
            <label>
              <span>模板 ID</span>
              <Input
                value={draft.template_id}
                onChange={event => set('template_id', event.target.value)}
                placeholder="otp_login"
                maxLength={64}
                disabled={mode === 'edit'}
                aria-invalid={Boolean(errors.template_id)}
              />
              <small className={errors.template_id ? styles.fieldError : undefined}>
                {errors.template_id ?? '创建后不可修改，用于 API 投递。'}
              </small>
            </label>
            <label>
              <span>显示名称</span>
              <Input
                value={draft.name}
                onChange={event => set('name', event.target.value)}
                placeholder="登录验证码"
                maxLength={128}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name ? <small className={styles.fieldError}>{errors.name}</small> : null}
            </label>
          </div>
          <label>
            <span>描述</span>
            <Input.TextArea
              value={draft.description}
              onChange={event => set('description', event.target.value)}
              rows={2}
              placeholder="说明使用场景和调用方。"
              maxLength={512}
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? (
              <small className={styles.fieldError}>{errors.description}</small>
            ) : null}
          </label>
          {mode === 'create' ? (
            <label>
              <span>所属服务（可选）</span>
              <Input
                value={draft.service_id}
                onChange={event => set('service_id', event.target.value)}
                placeholder="aegis"
                maxLength={32}
                aria-invalid={Boolean(errors.service_id)}
              />
              {errors.service_id ? (
                <small className={styles.fieldError}>{errors.service_id}</small>
              ) : null}
            </label>
          ) : (
            <div className={styles.switchRow}>
              <div>
                <strong>允许投递</strong>
                <span>禁用后保留模板，但不能再用于新投递。</span>
              </div>
              <Switch checked={draft.is_enabled} onChange={value => set('is_enabled', value)} />
            </div>
          )}

          <div className={styles.sectionTitle}>
            <span>MESSAGE</span>
            <h2>邮件内容</h2>
          </div>
          <label>
            <span>主题</span>
            <Input
              value={draft.subject}
              onChange={event => set('subject', event.target.value)}
              placeholder="您的验证码是 {{.Code}}"
              maxLength={256}
              aria-invalid={Boolean(errors.subject)}
            />
            <small className={errors.subject ? styles.fieldError : undefined}>
              {errors.subject ?? '支持 Go template 变量。'}
            </small>
          </label>
          <label>
            <span>HTML 内容</span>
            <Input.TextArea
              className={styles.codeInput}
              value={draft.content}
              onChange={event => set('content', event.target.value)}
              rows={18}
              spellCheck={false}
              placeholder={'<p>验证码：<strong>{{.Code}}</strong></p>'}
              aria-invalid={Boolean(errors.content)}
            />
            {errors.content ? <small className={styles.fieldError}>{errors.content}</small> : null}
          </label>
          <label>
            <span>示例变量（JSON）</span>
            <Input.TextArea
              className={styles.codeInput}
              value={draft.variables}
              onChange={event => set('variables', event.target.value)}
              rows={7}
              spellCheck={false}
              placeholder={'{\n  "Code": "123456"\n}'}
              aria-invalid={Boolean(errors.variables)}
            />
            <small className={errors.variables ? styles.fieldError : undefined}>
              {errors.variables ?? '预览和测试发送会使用这组数据。'}
            </small>
          </label>
        </section>

        <aside className={styles.inspector} aria-label="模板检查">
          <div className={styles.inspectorHeader}>
            <Code2 aria-hidden="true" />
            <div>
              <span>COMPOSITION CHECK</span>
              <strong>内容检查</strong>
            </div>
          </div>
          <div className={styles.checkItem} data-ready={Boolean(draft.subject.trim())}>
            <CheckCircle2 aria-hidden="true" />
            <div>
              <strong>邮件主题</strong>
              <span>{draft.subject.trim() || '尚未填写'}</span>
            </div>
          </div>
          <div className={styles.checkItem} data-ready={Boolean(draft.content.trim())}>
            <CheckCircle2 aria-hidden="true" />
            <div>
              <strong>HTML 正文</strong>
              <span>{draft.content.length} 个字符</span>
            </div>
          </div>
          <div className={styles.checkItem} data-ready={Boolean(draft.variables.trim())}>
            <Braces aria-hidden="true" />
            <div>
              <strong>示例变量</strong>
              <span>{draft.variables.trim() ? '可用于渲染预览' : '未提供示例数据'}</span>
            </div>
          </div>
          <div className={styles.subjectPreview}>
            <span>SUBJECT PREVIEW</span>
            <p>{draft.subject || '邮件主题会显示在这里。'}</p>
          </div>
        </aside>
      </div>
    </form>
  )
}
