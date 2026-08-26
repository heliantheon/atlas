import { useState } from 'react'
import { useRequest } from 'ahooks'
import { ArrowRight, KeyRound, Network, Plus, RotateCcw } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@atlas/ui/alert'
import { Button } from '@atlas/ui/button'
import { EmptyState } from '@atlas/ui/empty-state'
import { Spinner } from '@atlas/ui/spinner'
import { DomainDialog, type DomainDialogState } from '@/components/DomainSwitcher/DomainDialog'
import { domainApi } from '@/services'
import type { Domain } from '@/types'
import styles from './index.module.scss'

const sectionLabels: Record<string, string> = {
  applications: '应用目录',
  services: '服务边界',
  groups: '用户组',
}

export function DomainPicker() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [dialogState, setDialogState] = useState<DomainDialogState>(null)
  const { data: domains = [], loading, error, refresh } = useRequest(domainApi.getList)
  const requestedSection = searchParams.get('next')
  const nextSection = ['applications', 'services', 'groups'].includes(requestedSection ?? '')
    ? (requestedSection as keyof typeof sectionLabels)
    : undefined
  const openDomain = (domain: Domain) => {
    const basePath = `/d/${encodeURIComponent(domain.domain_id)}`
    navigate(nextSection ? `${basePath}/${nextSection}` : basePath)
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.productBar}>
        <div className={styles.productIdentity}>
          <span className={styles.productMark}>H</span>
          <span>
            <strong>Hermes</strong>
            <small>IDENTITY OPERATIONS</small>
          </span>
        </div>
        <span
          className={styles.apiState}
          data-state={error ? 'error' : loading ? 'loading' : 'ready'}
        >
          <i />
          {error ? 'API unavailable' : loading ? 'Checking API' : 'API connected'}
        </span>
      </header>

      <main className={styles.workspace}>
        <section className={styles.intro}>
          <div>
            <span className={styles.eyebrow}>CONTROL PLANE / DOMAIN REGISTRY</span>
            <h1>选择身份隔离边界</h1>
            <p>每个域独立管理应用、服务、身份源、用户组与授权关系。</p>
          </div>
          <Button onClick={() => setDialogState({ mode: 'create' })}>
            <Plus />
            创建域
          </Button>
        </section>

        <div className={styles.contextStrip}>
          <span>
            <Network />
            已登记 <strong>{loading ? '—' : domains.length}</strong> 个域
          </span>
          <span>
            <KeyRound />
            {nextSection ? `进入后打开：${sectionLabels[nextSection]}` : '进入后打开：域运行总览'}
          </span>
        </div>

        {error ? (
          <Alert variant="warning">
            <AlertTitle>域目录暂时无法加载</AlertTitle>
            <AlertDescription className={styles.alertDescription}>
              请确认 Hermes 管理接口可用后重试。
              <Button variant="outline" size="sm" onClick={refresh}>
                <RotateCcw />
                重新加载
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <section className={styles.directory} aria-labelledby="domain-directory-title">
          <header className={styles.directoryHeader}>
            <div>
              <span>01</span>
              <h2 id="domain-directory-title">域目录</h2>
            </div>
            <small>选择一条边界进入工作区</small>
          </header>

          {loading ? (
            <div className={styles.loading} aria-label="正在加载域目录">
              <Spinner className="size-7" />
            </div>
          ) : domains.length ? (
            <ol className={styles.domainList}>
              {domains.map((domain, index) => (
                <li key={domain.domain_id}>
                  <button type="button" onClick={() => openDomain(domain)}>
                    <span className={styles.rowIndex}>{String(index + 1).padStart(2, '0')}</span>
                    <span className={styles.rowContent}>
                      <strong>{domain.name || domain.domain_id}</strong>
                      <span>{domain.description || '尚未补充域说明'}</span>
                    </span>
                    <code>{domain.domain_id}</code>
                    <ArrowRight />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="尚未登记身份域"
              description="创建第一个域，开始配置应用与服务边界。"
              icon={<Network className="size-8" />}
              action={
                <Button onClick={() => setDialogState({ mode: 'create' })}>
                  <Plus />
                  创建域
                </Button>
              }
            />
          )}
        </section>
      </main>

      <DomainDialog
        state={dialogState}
        onOpenChange={open => !open && setDialogState(null)}
        onSaved={domain => {
          refresh()
          openDomain(domain)
        }}
      />
    </div>
  )
}
