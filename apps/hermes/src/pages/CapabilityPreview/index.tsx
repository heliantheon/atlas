import { ArrowLeft, CircleCheck, Clock, Database, Search, ScrollText } from 'lucide-react'
import { Button, Input, Tag } from '@heliannuuthus/ui'
import { useAppNavigate } from '@/contexts/DomainContext'
import styles from './index.module.scss'

type Capability = 'users' | 'audit'
const capabilityContent = {
  users: {
    eyebrow: 'IDENTITY DIRECTORY',
    title: '用户查询',
    description: '从 OpenID、用户名或已绑定身份开始定位用户，并查看其身份链路与访问上下文。',
    icon: <Search />,
    placeholder: '输入 OpenID、用户名或身份标识',
    features: ['精确身份定位', '关联身份与凭证摘要', '所属用户组与权限上下文'],
    dependency: '等待 Hermes 用户查询 HTTP API',
  },
  audit: {
    eyebrow: 'GOVERNANCE STREAM',
    title: '审计信息',
    description: '集中查看身份、应用、服务与授权关系的变更轨迹，形成可追溯的治理记录。',
    icon: <ScrollText />,
    placeholder: '搜索操作者、资源或事件类型',
    features: ['资源变更事件', '授权关系追踪', '按操作者与时间范围筛选'],
    dependency: '等待审计事件流与查询 API',
  },
} satisfies Record<Capability, object>

export function CapabilityPreview({ capability }: { capability: Capability }) {
  const navigate = useAppNavigate()
  const content = capabilityContent[capability]
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroIcon}>{content.icon}</div>
        <div>
          <div className={styles.eyebrow}>{content.eyebrow}</div>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
        </div>
        <Tag type="warning" className={styles.statusTag}>
          <Clock />
          接口接入中
        </Tag>
      </section>
      <section className={styles.workspace}>
        <div className={styles.searchPanel}>
          <div className={styles.panelLabel}>查询入口预览</div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 pl-9"
              placeholder={content.placeholder}
              disabled
              aria-label={content.placeholder}
            />
          </div>
          <div className={styles.integrationNote}>
            <Database />
            <div>
              <strong>{content.dependency}</strong>
              <span>页面不展示模拟业务数据；接口可用后将在 services 层接入。</span>
            </div>
          </div>
        </div>
        <aside className={styles.scopePanel}>
          <div className={styles.panelLabel}>能力范围</div>
          <ul>
            {content.features.map(feature => (
              <li key={feature}>
                <CircleCheck />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" onClick={() => navigate('')}>
            <ArrowLeft />
            返回概览
          </Button>
        </aside>
      </section>
    </main>
  )
}
