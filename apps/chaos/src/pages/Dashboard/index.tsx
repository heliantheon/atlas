import { useNavigate } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { Button, Empty, Spinner, Tag } from '@heliannuuthus/ui'
import { ArrowRight, FileCode2, Radio, ScrollText, Send, UploadCloud } from 'lucide-react'
import { chaosTemplateApi } from '@/services'
import styles from './index.module.scss'

const formatRelative = (value: string) => {
  const elapsed = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.round(elapsed / 60_000))
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.round(hours / 24)} 天前`
}

export function Dashboard() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useRequest(() => chaosTemplateApi.getList())
  const templates = data ?? []
  const enabled = templates.filter(template => template.is_enabled).length
  const disabled = templates.length - enabled
  const builtIn = templates.filter(template => template.is_builtin).length
  const recent = [...templates]
    .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))
    .slice(0, 5)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>DELIVERY CONTROL / OVERVIEW</span>
          <h1>投递控制台</h1>
          <p>从内容资产开始一次投递，或沿 Trace ID 检查它经过的完整路径。</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" onClick={() => navigate('/logs')}>
            <ScrollText aria-hidden="true" /> 检索日志
          </Button>
          <Button onClick={() => navigate('/templates/create')}>
            <FileCode2 aria-hidden="true" /> 创建模板
          </Button>
        </div>
      </header>

      <section className={styles.signalBand} aria-label="Chaos 当前状态">
        <div
          className={styles.signalLead}
          data-state={error ? 'error' : loading ? 'loading' : 'ready'}
        >
          {loading ? <Spinner /> : <Radio aria-hidden="true" />}
          <div>
            <span>MANAGEMENT API</span>
            <strong>{loading ? '正在连接' : error ? '接口不可用' : '管理接口已响应'}</strong>
          </div>
          {error ? (
            <Button size="sm" variant="outline" onClick={refresh}>
              重试
            </Button>
          ) : null}
        </div>
        <dl>
          <div>
            <dt>模板总数</dt>
            <dd>{loading ? '—' : templates.length}</dd>
          </div>
          <div>
            <dt>允许投递</dt>
            <dd>{loading ? '—' : enabled}</dd>
          </div>
          <div>
            <dt>已停用</dt>
            <dd>{loading ? '—' : disabled}</dd>
          </div>
          <div>
            <dt>系统内置</dt>
            <dd>{loading ? '—' : builtIn}</dd>
          </div>
        </dl>
      </section>

      <div className={styles.workbench}>
        <section className={styles.recent}>
          <div className={styles.sectionHeader}>
            <div>
              <span>RECENT ASSETS</span>
              <h2>最近更新的模板</h2>
            </div>
            <Button variant="ghost" onClick={() => navigate('/templates')}>
              全部模板 <ArrowRight aria-hidden="true" />
            </Button>
          </div>
          {loading ? (
            <div className={styles.state}>
              <Spinner /> 正在读取内容资产…
            </div>
          ) : null}
          {!loading && error ? <div className={styles.state}>无法读取模板，请重试。</div> : null}
          {!loading && !error && recent.length === 0 ? (
            <Empty
              title="还没有模板"
              description="创建一份模板后，它会显示在这里。"
              actions={<Button onClick={() => navigate('/templates/create')}>创建模板</Button>}
            />
          ) : null}
          {!loading && !error
            ? recent.map(template => (
                <button
                  key={template.template_id}
                  type="button"
                  className={styles.assetRow}
                  onClick={() => navigate(`/templates/${template.template_id}`)}
                >
                  <span className={styles.assetIcon}>
                    <FileCode2 aria-hidden="true" />
                  </span>
                  <span className={styles.assetIdentity}>
                    <strong>{template.name}</strong>
                    <code>{template.template_id}</code>
                  </span>
                  <span className={styles.assetSubject}>{template.subject}</span>
                  <Tag type={template.is_enabled ? 'success' : 'default'}>
                    {template.is_enabled ? '启用' : '停用'}
                  </Tag>
                  <time dateTime={template.updated_at}>{formatRelative(template.updated_at)}</time>
                  <ArrowRight className={styles.assetArrow} aria-hidden="true" />
                </button>
              ))
            : null}
        </section>

        <aside className={styles.commandRail}>
          <div className={styles.sectionHeader}>
            <div>
              <span>QUICK COMMANDS</span>
              <h2>发起操作</h2>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/templates/create')}>
            <span>
              <FileCode2 aria-hidden="true" />
            </span>
            <div>
              <strong>设计邮件</strong>
              <p>创建可复用的 Go template 内容。</p>
            </div>
            <ArrowRight aria-hidden="true" />
          </button>
          <button type="button" onClick={() => navigate('/files')}>
            <span>
              <UploadCloud aria-hidden="true" />
            </span>
            <div>
              <strong>上传对象</strong>
              <p>签发地址后直接上传到对象存储。</p>
            </div>
            <ArrowRight aria-hidden="true" />
          </button>
          <button type="button" onClick={() => navigate('/templates')}>
            <span>
              <Send aria-hidden="true" />
            </span>
            <div>
              <strong>测试投递</strong>
              <p>从模板详情发起一次真实队列投递。</p>
            </div>
            <ArrowRight aria-hidden="true" />
          </button>
        </aside>
      </div>
    </div>
  )
}
