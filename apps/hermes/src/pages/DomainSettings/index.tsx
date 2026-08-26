import { useState, type FormEvent } from 'react'
import { useRequest } from 'ahooks'
import { Button, Dialog, Empty, Input, Spinner, Tag, toast } from '@heliannuuthus/ui'
import { KeyRound, Pencil, Plus, RefreshCw, Settings2, ShieldCheck, Trash2 } from 'lucide-react'
import { useDomainId } from '@/contexts/DomainContext'
import { domainApi, idpKeyApi } from '@/services'
import type { DomainIDPConfig, IDPKey } from '@/types'
import styles from './index.module.scss'

interface ConfigDraft {
  idp_type: string
  priority: string
  strategy: string
  t_app_id: string
}
interface KeyDraft {
  idp_type: string
  t_app_id: string
  t_secret: string
}
const emptyConfig: ConfigDraft = { idp_type: '', priority: '0', strategy: '', t_app_id: '' }
const emptyKey: KeyDraft = { idp_type: '', t_app_id: '', t_secret: '' }

export function DomainSettings() {
  const domainId = useDomainId()!
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [savingDomain, setSavingDomain] = useState(false)
  const [configDraft, setConfigDraft] = useState<ConfigDraft | null>(null)
  const [editingConfig, setEditingConfig] = useState<DomainIDPConfig | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)
  const [pendingConfigDelete, setPendingConfigDelete] = useState<DomainIDPConfig | null>(null)
  const [keyDraft, setKeyDraft] = useState<KeyDraft | null>(null)
  const [editingKey, setEditingKey] = useState<IDPKey | null>(null)
  const [savingKey, setSavingKey] = useState(false)
  const [pendingKeyDelete, setPendingKeyDelete] = useState<IDPKey | null>(null)

  const { data, loading, error, refresh } = useRequest(
    async () => {
      const [domain, configs, keys] = await Promise.all([
        domainApi.getDetail(domainId),
        domainApi.getIDPConfigs(domainId),
        idpKeyApi.getList(),
      ])
      return { domain, configs, keys }
    },
    {
      refreshDeps: [domainId],
      onSuccess: result => {
        setName(result.domain.name)
        setDescription(result.domain.description ?? '')
      },
    }
  )

  const saveDomain = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setSavingDomain(true)
    try {
      await domainApi.update(domainId, {
        name: name.trim(),
        description: description.trim() || null,
      })
      toast.success('域信息已保存')
      refresh()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : '域信息保存失败')
    } finally {
      setSavingDomain(false)
    }
  }

  const openConfig = (config?: DomainIDPConfig) => {
    setEditingConfig(config ?? null)
    setConfigDraft(
      config
        ? {
            idp_type: config.idp_type,
            priority: String(config.priority),
            strategy: config.strategy ?? '',
            t_app_id: config.t_app_id,
          }
        : emptyConfig
    )
  }

  const saveConfig = async () => {
    if (!configDraft?.idp_type.trim() || !configDraft.t_app_id.trim()) return
    setSavingConfig(true)
    try {
      const body = {
        priority: Number(configDraft.priority) || 0,
        strategy: configDraft.strategy.trim() || undefined,
        t_app_id: configDraft.t_app_id.trim(),
      }
      if (editingConfig) await domainApi.updateIDPConfig(domainId, editingConfig.idp_type, body)
      else
        await domainApi.createIDPConfig(domainId, {
          idp_type: configDraft.idp_type.trim(),
          ...body,
        })
      toast.success(editingConfig ? '身份源配置已更新' : '身份源已添加')
      setConfigDraft(null)
      setEditingConfig(null)
      refresh()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : '身份源配置保存失败')
    } finally {
      setSavingConfig(false)
    }
  }

  const saveKey = async () => {
    if (!keyDraft?.idp_type.trim() || !keyDraft.t_app_id.trim() || !keyDraft.t_secret) return
    setSavingKey(true)
    try {
      if (editingKey)
        await idpKeyApi.update(editingKey.idp_type, editingKey.t_app_id, keyDraft.t_secret)
      else
        await idpKeyApi.create({
          idp_type: keyDraft.idp_type.trim(),
          t_app_id: keyDraft.t_app_id.trim(),
          t_secret: keyDraft.t_secret,
        })
      toast.success(editingKey ? '凭据已轮换' : '凭据已保存')
      setKeyDraft(null)
      setEditingKey(null)
      refresh()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'IDP 凭据保存失败')
    } finally {
      setSavingKey(false)
    }
  }

  const deleteConfig = async () => {
    if (!pendingConfigDelete) return
    try {
      await domainApi.deleteIDPConfig(domainId, pendingConfigDelete.idp_type)
      setPendingConfigDelete(null)
      refresh()
      toast.success('身份源配置已删除')
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : '身份源配置删除失败')
    }
  }

  const deleteKey = async () => {
    if (!pendingKeyDelete) return
    try {
      await idpKeyApi.delete(pendingKeyDelete.idp_type, pendingKeyDelete.t_app_id)
      setPendingKeyDelete(null)
      refresh()
      toast.success('IDP 凭据已删除')
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'IDP 凭据删除失败')
    }
  }

  if (loading)
    return (
      <div className={styles.state}>
        <Spinner size="lg" /> 正在读取域策略…
      </div>
    )
  if (error || !data)
    return (
      <Empty
        title="域策略暂时不可用"
        description="无法读取 Hermes 管理接口。"
        actions={<Button onClick={refresh}>重试</Button>}
      />
    )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>DOMAIN CONTROL / {domainId}</span>
          <h1>域与身份源</h1>
          <p>维护域元数据、允许的身份提供方，以及对应的第三方应用凭据。</p>
        </div>
        <Button variant="ghost" onClick={refresh}>
          <RefreshCw aria-hidden="true" /> 刷新
        </Button>
      </header>
      <div className={styles.grid}>
        <form className={styles.panel} onSubmit={event => void saveDomain(event)}>
          <div className={styles.panelHeader}>
            <Settings2 aria-hidden="true" />
            <div>
              <span>DOMAIN RECORD</span>
              <h2>域信息</h2>
            </div>
          </div>
          <div className={styles.formBody}>
            <label>
              <span>域 ID</span>
              <Input value={domainId} readOnly />
            </label>
            <label>
              <span>名称</span>
              <Input value={name} onChange={event => setName(event.target.value)} required />
            </label>
            <label>
              <span>描述</span>
              <Input.TextArea
                value={description}
                onChange={event => setDescription(event.target.value)}
                rows={4}
              />
            </label>
            <div className={styles.formActions}>
              <Button type="submit" disabled={savingDomain}>
                {savingDomain ? <Spinner /> : null} 保存域信息
              </Button>
            </div>
          </div>
        </form>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <ShieldCheck aria-hidden="true" />
            <div>
              <span>ALLOWED PROVIDERS</span>
              <h2>身份源策略</h2>
            </div>
            <Button size="sm" onClick={() => openConfig()}>
              <Plus aria-hidden="true" /> 添加
            </Button>
          </div>
          {data.configs.length === 0 ? (
            <Empty
              title="没有身份源配置"
              description="应用只能选择域中已允许的身份源。"
              actions={
                <Button variant="outline" onClick={() => openConfig()}>
                  添加身份源
                </Button>
              }
            />
          ) : (
            <div className={styles.records}>
              {data.configs.map(config => (
                <article key={config.idp_type}>
                  <div>
                    <strong>{config.idp_type}</strong>
                    <code>{config.t_app_id}</code>
                  </div>
                  <Tag type="info">优先级 {config.priority}</Tag>
                  <span>{config.strategy || '默认策略'}</span>
                  <div className={styles.recordActions}>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`编辑 ${config.idp_type}`}
                      onClick={() => openConfig(config)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`删除 ${config.idp_type}`}
                      onClick={() => setPendingConfigDelete(config)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={`${styles.panel} ${styles.keysPanel}`}>
          <div className={styles.panelHeader}>
            <KeyRound aria-hidden="true" />
            <div>
              <span>ENCRYPTED CREDENTIALS</span>
              <h2>IDP 凭据</h2>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingKey(null)
                setKeyDraft(emptyKey)
              }}
            >
              <Plus aria-hidden="true" /> 新增凭据
            </Button>
          </div>
          <div className={styles.securityNote}>
            Secret 只在提交时发送给 Hermes；列表接口不会返回明文。
          </div>
          {data.keys.length === 0 ? (
            <Empty
              title="没有 IDP 凭据"
              description="配置第三方登录前，请先保存对应的应用 Secret。"
            />
          ) : (
            <div className={styles.keyTable}>
              <div className={styles.keyHeader}>
                <span>类型</span>
                <span>第三方应用 ID</span>
                <span>更新时间</span>
                <span />
              </div>
              {data.keys.map(key => (
                <article key={`${key.idp_type}:${key.t_app_id}`}>
                  <strong>{key.idp_type}</strong>
                  <code>{key.t_app_id}</code>
                  <time dateTime={key.updated_at}>
                    {new Date(key.updated_at).toLocaleString('zh-CN')}
                  </time>
                  <div className={styles.recordActions}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingKey(key)
                        setKeyDraft({
                          idp_type: key.idp_type,
                          t_app_id: key.t_app_id,
                          t_secret: '',
                        })
                      }}
                    >
                      轮换
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`删除 ${key.idp_type} 凭据`}
                      onClick={() => setPendingKeyDelete(key)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={configDraft !== null}
        onOpenChange={open => {
          if (!open) {
            setConfigDraft(null)
            setEditingConfig(null)
          }
        }}
        title={editingConfig ? '编辑身份源配置' : '添加身份源配置'}
        description="身份源类型必须已有对应的加密凭据。"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfigDraft(null)}>
              取消
            </Button>
            <Button
              disabled={savingConfig || !configDraft?.idp_type || !configDraft.t_app_id}
              onClick={() => void saveConfig()}
            >
              {savingConfig ? <Spinner /> : null} 保存
            </Button>
          </>
        }
      >
        {configDraft ? (
          <div className={styles.dialogFields}>
            <label>
              <span>身份源类型</span>
              <Input
                value={configDraft.idp_type}
                disabled={Boolean(editingConfig)}
                onChange={event => setConfigDraft({ ...configDraft, idp_type: event.target.value })}
                placeholder="github"
              />
            </label>
            <label>
              <span>第三方应用 ID</span>
              <Input
                value={configDraft.t_app_id}
                onChange={event => setConfigDraft({ ...configDraft, t_app_id: event.target.value })}
              />
            </label>
            <label>
              <span>优先级</span>
              <Input
                type="number"
                min={0}
                value={configDraft.priority}
                onChange={event => setConfigDraft({ ...configDraft, priority: event.target.value })}
              />
            </label>
            <label>
              <span>策略（可选）</span>
              <Input
                value={configDraft.strategy}
                onChange={event => setConfigDraft({ ...configDraft, strategy: event.target.value })}
              />
            </label>
          </div>
        ) : null}
      </Dialog>
      <Dialog
        open={keyDraft !== null}
        onOpenChange={open => {
          if (!open) {
            setKeyDraft(null)
            setEditingKey(null)
          }
        }}
        title={editingKey ? '轮换 IDP 凭据' : '新增 IDP 凭据'}
        description="提交后明文不会再次显示。"
        footer={
          <>
            <Button variant="outline" onClick={() => setKeyDraft(null)}>
              取消
            </Button>
            <Button
              disabled={
                savingKey || !keyDraft?.idp_type || !keyDraft.t_app_id || !keyDraft.t_secret
              }
              onClick={() => void saveKey()}
            >
              {savingKey ? <Spinner /> : null} {editingKey ? '轮换凭据' : '保存凭据'}
            </Button>
          </>
        }
      >
        {keyDraft ? (
          <div className={styles.dialogFields}>
            <label>
              <span>身份源类型</span>
              <Input
                value={keyDraft.idp_type}
                disabled={Boolean(editingKey)}
                onChange={event => setKeyDraft({ ...keyDraft, idp_type: event.target.value })}
                placeholder="github"
              />
            </label>
            <label>
              <span>第三方应用 ID</span>
              <Input
                value={keyDraft.t_app_id}
                disabled={Boolean(editingKey)}
                onChange={event => setKeyDraft({ ...keyDraft, t_app_id: event.target.value })}
              />
            </label>
            <label>
              <span>应用 Secret</span>
              <Input
                type="password"
                value={keyDraft.t_secret}
                onChange={event => setKeyDraft({ ...keyDraft, t_secret: event.target.value })}
                autoComplete="new-password"
              />
            </label>
          </div>
        ) : null}
      </Dialog>
      <Dialog
        open={pendingConfigDelete !== null}
        onOpenChange={open => {
          if (!open) setPendingConfigDelete(null)
        }}
        title="删除身份源配置"
        description="应用将不能再选择这个身份源。"
        cancelText="取消"
        confirmText="删除"
        onConfirm={() => void deleteConfig()}
      />
      <Dialog
        open={pendingKeyDelete !== null}
        onOpenChange={open => {
          if (!open) setPendingKeyDelete(null)
        }}
        title="删除 IDP 凭据"
        description="使用此凭据的第三方登录会立即失败。"
        cancelText="取消"
        confirmText="删除"
        onConfirm={() => void deleteKey()}
      />
    </div>
  )
}
