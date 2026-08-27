import { useState } from 'react'
import { useRequest } from 'ahooks'
import { Button, Dialog, Empty, Input, Spinner, Tag, toast } from '@heliannuuthus/ui'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { serviceApi } from '@/services'
import type { ServiceChallengeSetting } from '@/types'
import styles from './ChallengeSettingsPanel.module.scss'

interface Draft {
  type: string
  expires_in: string
  limits: string
}
const emptyDraft: Draft = { type: '', expires_in: '300', limits: '{}' }

export function ChallengeSettingsPanel({
  domainId,
  serviceId,
}: {
  domainId: string
  serviceId: string
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editing, setEditing] = useState<ServiceChallengeSetting | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ServiceChallengeSetting | null>(null)
  const {
    data = [],
    loading,
    error,
    refresh,
  } = useRequest(() => serviceApi.getChallengeSettings(domainId, serviceId), {
    refreshDeps: [domainId, serviceId],
  })

  const open = (setting?: ServiceChallengeSetting) => {
    setEditing(setting ?? null)
    setDraft(
      setting
        ? {
            type: setting.type,
            expires_in: String(setting.expires_in),
            limits: JSON.stringify(setting.limits ?? {}, null, 2),
          }
        : emptyDraft
    )
  }

  const save = async () => {
    if (!draft?.type.trim()) return
    let limits: Record<string, number>
    try {
      const parsed = JSON.parse(draft.limits || '{}') as unknown
      if (
        parsed == null ||
        Array.isArray(parsed) ||
        typeof parsed !== 'object' ||
        Object.values(parsed).some(value => typeof value !== 'number')
      )
        throw new Error()
      limits = parsed as Record<string, number>
    } catch {
      toast.error('限流配置必须是数值型 JSON 对象')
      return
    }
    setSaving(true)
    try {
      const body = { expires_in: Number(draft.expires_in) || 0, limits }
      if (editing) await serviceApi.updateChallengeSetting(domainId, serviceId, editing.type, body)
      else
        await serviceApi.createChallengeSetting(domainId, serviceId, {
          type: draft.type.trim(),
          ...body,
        })
      toast.success(editing ? 'Challenge 策略已更新' : 'Challenge 策略已创建')
      setDraft(null)
      setEditing(null)
      refresh()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Challenge 策略保存失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!pendingDelete) return
    try {
      await serviceApi.deleteChallengeSetting(domainId, serviceId, pendingDelete.type)
      setPendingDelete(null)
      refresh()
      toast.success('Challenge 策略已删除')
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Challenge 策略删除失败')
    }
  }

  if (loading)
    return (
      <div className={styles.state}>
        <Spinner /> 正在读取 Challenge 策略…
      </div>
    )
  if (error)
    return (
      <Empty
        title="无法读取 Challenge 策略"
        description="管理接口暂时不可用。"
        actions={<Button onClick={refresh}>重试</Button>}
      />
    )

  return (
    <div className={styles.panel}>
      <header>
        <div>
          <h3>Challenge 与限流</h3>
          <p>按验证类型控制有效期和频率限制。</p>
        </div>
        <Button size="sm" onClick={() => open()}>
          <Plus /> 新增策略
        </Button>
      </header>
      {data.length === 0 ? (
        <Empty
          icon={<ShieldCheck />}
          title="没有 Challenge 策略"
          description="服务将使用后端默认策略。"
          actions={
            <Button variant="outline" onClick={() => open()}>
              新增策略
            </Button>
          }
        />
      ) : (
        <div className={styles.list}>
          {data.map(setting => (
            <article key={setting.type}>
              <div>
                <strong>{setting.type}</strong>
                <code>{setting.service_id}</code>
              </div>
              <Tag type="info">{setting.expires_in}s</Tag>
              <pre>{JSON.stringify(setting.limits ?? {})}</pre>
              <div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`编辑 ${setting.type}`}
                  onClick={() => open(setting)}
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`删除 ${setting.type}`}
                  onClick={() => setPendingDelete(setting)}
                >
                  <Trash2 />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Dialog
        open={draft !== null}
        onOpenChange={value => {
          if (!value) {
            setDraft(null)
            setEditing(null)
          }
        }}
        title={editing ? '编辑 Challenge 策略' : '新增 Challenge 策略'}
        description="Limits 使用键值均明确的数值型 JSON。"
        footer={
          <>
            <Button variant="outline" onClick={() => setDraft(null)}>
              取消
            </Button>
            <Button disabled={saving || !draft?.type} onClick={() => void save()}>
              {saving ? <Spinner /> : null} 保存
            </Button>
          </>
        }
      >
        {draft ? (
          <div className={styles.fields}>
            <label>
              <span>类型</span>
              <Input
                value={draft.type}
                disabled={Boolean(editing)}
                onChange={event => setDraft({ ...draft, type: event.target.value })}
                placeholder="otp"
              />
            </label>
            <label>
              <span>有效期（秒）</span>
              <Input
                type="number"
                min={0}
                value={draft.expires_in}
                onChange={event => setDraft({ ...draft, expires_in: event.target.value })}
              />
            </label>
            <label>
              <span>限流 JSON</span>
              <Input.TextArea
                rows={6}
                className={styles.codeInput}
                value={draft.limits}
                onChange={event => setDraft({ ...draft, limits: event.target.value })}
              />
            </label>
          </div>
        ) : null}
      </Dialog>
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={value => {
          if (!value) setPendingDelete(null)
        }}
        title="删除 Challenge 策略"
        description="删除后服务将回退到默认行为。"
        cancelText="取消"
        confirmText="删除"
        onConfirm={() => void remove()}
      />
    </div>
  )
}
