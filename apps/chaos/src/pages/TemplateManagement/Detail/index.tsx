import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { Button, Dialog, Empty, Input, Spinner, Tag, toast } from '@heliannuuthus/ui'
import { ArrowLeft, Clock3, Code2, Edit3, Eye, Mail, Send } from 'lucide-react'
import { chaosMailApi, chaosTemplateApi } from '@/services'
import styles from './index.module.scss'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(value)
  )

function parseVariables(value?: string) {
  if (!value?.trim()) return {}
  const parsed = JSON.parse(value) as unknown
  if (parsed == null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('示例变量必须是 JSON 对象')
  }
  return parsed as Record<string, unknown>
}

export function Detail() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [sendOpen, setSendOpen] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [sending, setSending] = useState(false)
  const { data, loading, error, refresh } = useRequest(
    () => chaosTemplateApi.getDetail(templateId!),
    { ready: Boolean(templateId) }
  )

  const preview = async () => {
    if (!templateId) return
    setPreviewOpen(true)
    setPreviewing(true)
    try {
      const result = await chaosTemplateApi.render(templateId, parseVariables(data?.variables))
      setPreviewSubject(result.subject)
      setPreviewHtml(result.body)
    } catch (reason) {
      setPreviewOpen(false)
      toast.error(reason instanceof Error ? reason.message : '模板渲染失败')
    } finally {
      setPreviewing(false)
    }
  }

  const sendTest = async () => {
    if (!templateId || !recipient.trim()) return
    setSending(true)
    try {
      const result = await chaosMailApi.send({
        to: recipient.trim(),
        template_id: templateId,
        variables: parseVariables(data?.variables),
      })
      toast.success(`投递已进入队列：${result.delivery_id}`)
      setSendOpen(false)
      setRecipient('')
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : '测试邮件投递失败')
    } finally {
      setSending(false)
    }
  }

  if (loading)
    return (
      <div className={styles.state}>
        <Spinner size="lg" /> 正在读取模板…
      </div>
    )
  if (error || !data) {
    return (
      <Empty
        title="无法读取模板"
        description="模板不存在，或管理接口暂时不可用。"
        actions={<Button onClick={refresh}>重试</Button>}
      />
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <Button
            variant="ghost"
            size="icon"
            aria-label="返回模板列表"
            onClick={() => navigate('/templates')}
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <div>
            <span className={styles.kicker}>DELIVERY ASSET / {data.template_id}</span>
            <div className={styles.titleRow}>
              <h1>{data.name}</h1>
              <Tag type={data.is_enabled ? 'success' : 'default'}>
                {data.is_enabled ? '启用' : '停用'}
              </Tag>
              {data.is_builtin ? <Tag type="info">内置</Tag> : null}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" onClick={() => void preview()}>
            <Eye aria-hidden="true" /> 渲染预览
          </Button>
          <Button variant="outline" onClick={() => setSendOpen(true)} disabled={!data.is_enabled}>
            <Send aria-hidden="true" /> 测试发送
          </Button>
          {!data.is_builtin ? (
            <Button onClick={() => navigate(`/templates/${templateId}/edit`)}>
              <Edit3 aria-hidden="true" /> 编辑
            </Button>
          ) : null}
        </div>
      </header>

      <div className={styles.workbench}>
        <main className={styles.content}>
          <section className={styles.subject}>
            <span>SUBJECT</span>
            <h2>{data.subject}</h2>
            <p>{data.description || '未提供模板说明。'}</p>
          </section>
          <section className={styles.codeSection}>
            <div className={styles.sectionHeader}>
              <Code2 aria-hidden="true" />
              <div>
                <span>TEMPLATE SOURCE</span>
                <h2>HTML 内容</h2>
              </div>
            </div>
            <pre>
              <code>{data.content}</code>
            </pre>
          </section>
          <section className={styles.codeSection}>
            <div className={styles.sectionHeader}>
              <Mail aria-hidden="true" />
              <div>
                <span>EXAMPLE PAYLOAD</span>
                <h2>示例变量</h2>
              </div>
            </div>
            <pre>
              <code>{data.variables || '{}'}</code>
            </pre>
          </section>
        </main>

        <aside className={styles.metadata}>
          <div className={styles.metaHeader}>
            <span>ASSET RECORD</span>
            <strong>模板记录</strong>
          </div>
          <dl>
            <div>
              <dt>模板 ID</dt>
              <dd>
                <code>{data.template_id}</code>
              </dd>
            </div>
            <div>
              <dt>模板类型</dt>
              <dd>{data.type || 'email'}</dd>
            </div>
            <div>
              <dt>所属服务</dt>
              <dd>{data.service_id || '全局'}</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>
                <Clock3 aria-hidden="true" />
                {formatDate(data.created_at)}
              </dd>
            </div>
            <div>
              <dt>最近更新</dt>
              <dd>
                <Clock3 aria-hidden="true" />
                {formatDate(data.updated_at)}
              </dd>
            </div>
          </dl>
          <div className={styles.policyNote}>
            <strong>渲染策略</strong>
            <p>服务端使用 Go template 渲染。预览在隔离 iframe 中展示，不会执行脚本。</p>
          </div>
        </aside>
      </div>

      <Dialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={previewSubject || '渲染预览'}
        description="以下内容来自 Chaos 的真实模板渲染结果。"
        classNames={{ content: styles.previewDialog }}
      >
        {previewing ? (
          <div className={styles.previewLoading}>
            <Spinner /> 正在渲染…
          </div>
        ) : (
          <iframe
            className={styles.previewFrame}
            title="邮件模板预览"
            srcDoc={previewHtml}
            sandbox=""
          />
        )}
      </Dialog>

      <Dialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        title="发送测试邮件"
        description="使用当前模板和示例变量创建一次真实投递。"
        footer={
          <>
            <Button variant="outline" onClick={() => setSendOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void sendTest()} disabled={sending || !recipient.trim()}>
              {sending ? <Spinner /> : <Send aria-hidden="true" />} 发送
            </Button>
          </>
        }
      >
        <label className={styles.recipientField}>
          <span>收件邮箱</span>
          <Input
            type="email"
            value={recipient}
            onChange={event => setRecipient(event.target.value)}
            placeholder="name@example.com"
          />
        </label>
      </Dialog>
    </div>
  )
}
