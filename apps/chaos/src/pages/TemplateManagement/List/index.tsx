import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { Button, Dialog, Empty, Input, Spinner, Tag, toast } from '@heliannuuthus/ui'
import { ArrowRight, FileCode2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { chaosTemplateApi, type EmailTemplate } from '@/services'
import styles from './index.module.scss'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  )

export function List() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [pendingDelete, setPendingDelete] = useState<EmailTemplate | null>(null)
  const { data, loading, error, refresh } = useRequest(
    () => chaosTemplateApi.getList(serviceId.trim() || undefined),
    { refreshDeps: [serviceId] }
  )

  const templates = useMemo(() => {
    const term = keyword.trim().toLowerCase()
    if (!term) return data ?? []
    return (data ?? []).filter(template =>
      [template.template_id, template.name, template.subject, template.service_id]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(term))
    )
  }, [data, keyword])

  const remove = async () => {
    if (!pendingDelete) return
    try {
      await chaosTemplateApi.delete(pendingDelete.template_id)
      toast.success('模板已删除')
      setPendingDelete(null)
      refresh()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : '模板删除失败')
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>DELIVERY ASSETS / EMAIL</span>
          <h1>邮件模板</h1>
          <p>维护投递内容、示例变量和启用状态；预览使用后端的真实渲染器。</p>
        </div>
        <Button onClick={() => navigate('/templates/create')}>
          <Plus aria-hidden="true" /> 创建模板
        </Button>
      </header>

      <section className={styles.toolbar} aria-label="模板筛选">
        <label className={styles.search}>
          <span className={styles.srOnly}>搜索模板</span>
          <Input
            prefix={<Search aria-hidden="true" />}
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder="按 ID、名称或主题搜索"
          />
        </label>
        <label className={styles.serviceFilter}>
          <span>服务</span>
          <Input
            value={serviceId}
            onChange={event => setServiceId(event.target.value)}
            placeholder="全部服务"
          />
        </label>
        <Button variant="ghost" size="icon" aria-label="刷新模板" onClick={refresh}>
          <RefreshCw aria-hidden="true" />
        </Button>
        <span className={styles.count}>{loading ? '读取中' : `${templates.length} 项`}</span>
      </section>

      <section className={styles.inventory} aria-busy={loading}>
        <div className={styles.tableHeader} aria-hidden="true">
          <span>模板</span>
          <span>归属</span>
          <span>状态</span>
          <span>更新</span>
          <span />
        </div>
        {loading ? (
          <div className={styles.state}>
            <Spinner /> 正在读取模板…
          </div>
        ) : null}
        {!loading && error ? (
          <div className={styles.state}>
            <p>模板列表暂时不可用。</p>
            <Button variant="outline" onClick={refresh}>
              重试
            </Button>
          </div>
        ) : null}
        {!loading && !error && templates.length === 0 ? (
          <Empty
            icon={<FileCode2 />}
            title="没有匹配的邮件模板"
            description={
              keyword || serviceId ? '调整搜索条件后再试。' : '创建第一份模板以开始投递。'
            }
            actions={
              !keyword && !serviceId ? (
                <Button onClick={() => navigate('/templates/create')}>创建模板</Button>
              ) : undefined
            }
          />
        ) : null}
        {!loading && !error
          ? templates.map(template => (
              <article key={template.template_id} className={styles.row}>
                <button
                  type="button"
                  className={styles.identity}
                  onClick={() => navigate(`/templates/${template.template_id}`)}
                >
                  <span className={styles.templateMark}>
                    <FileCode2 aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{template.name}</strong>
                    <code>{template.template_id}</code>
                    <small>{template.subject}</small>
                  </span>
                </button>
                <span className={styles.service}>{template.service_id || '全局'}</span>
                <span className={styles.tags}>
                  <Tag type={template.is_enabled ? 'success' : 'default'}>
                    {template.is_enabled ? '启用' : '停用'}
                  </Tag>
                  {template.is_builtin ? <Tag type="info">内置</Tag> : null}
                </span>
                <time dateTime={template.updated_at}>{formatDate(template.updated_at)}</time>
                <span className={styles.actions}>
                  {!template.is_builtin ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`删除 ${template.name}`}
                      onClick={() => setPendingDelete(template)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`打开 ${template.name}`}
                    onClick={() => navigate(`/templates/${template.template_id}`)}
                  >
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </span>
              </article>
            ))
          : null}
      </section>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={open => {
          if (!open) setPendingDelete(null)
        }}
        title="删除邮件模板"
        description={`“${pendingDelete?.name ?? ''}”删除后无法恢复，现有调用也会失败。`}
        cancelText="取消"
        confirmText="删除模板"
        onConfirm={() => void remove()}
      />
    </div>
  )
}
