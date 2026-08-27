import { useMemo, useState } from 'react'
import { Dialog, Empty, Input, Kbd } from '@heliannuuthus/ui'
import { ArrowRight, Search } from 'lucide-react'
import { launchTargets, openLaunchTarget, recordLaunchTarget } from '@/config/apps'
import styles from './index.module.scss'

interface AppLauncherProps {
  open: boolean
  onClose: () => void
}

export function AppLauncher({ open, onClose }: AppLauncherProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return launchTargets
    return launchTargets.filter(target =>
      [target.name, target.appName, target.description, ...target.keywords]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [query])

  const close = () => {
    setQuery('')
    setActiveIndex(0)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!value) close()
      }}
      title="前往系统或功能"
      description="搜索 Atlas 中注册的管理入口。"
      classNames={{ content: styles.dialog }}
    >
      <div className={styles.searchRow}>
        <Input
          autoFocus
          prefix={<Search aria-hidden="true" />}
          value={query}
          onChange={event => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex(index => (results.length ? (index + 1) % results.length : 0))
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex(index =>
                results.length ? (index - 1 + results.length) % results.length : 0
              )
            }
            if (event.key === 'Enter' && results[activeIndex]) {
              event.preventDefault()
              openLaunchTarget(results[activeIndex])
            }
          }}
          placeholder="例如：应用、日志、模板"
          aria-label="搜索 Atlas 管理入口"
        />
        <Kbd>Esc</Kbd>
      </div>
      <div className={styles.results} role="listbox" aria-label="搜索结果">
        {results.length === 0 ? (
          <Empty title={`没有找到“${query}”`} description="尝试系统名称或具体管理功能。" />
        ) : (
          results.map((target, index) => (
            <a
              key={target.key}
              href={target.href}
              role="option"
              aria-selected={index === activeIndex}
              className={styles.result}
              data-active={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => recordLaunchTarget(target)}
            >
              <span
                className={styles.resultIcon}
                style={{ color: target.color, background: target.tint }}
              >
                {target.icon ?? target.appName.slice(0, 1)}
              </span>
              <span>
                <strong>{target.name}</strong>
                <small>
                  {target.appName} · {target.description}
                </small>
              </span>
              <ArrowRight aria-hidden="true" />
            </a>
          ))
        )}
      </div>
      <footer className={styles.footer}>
        <span>{results.length} 个入口</span>
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> 选择
        </span>
        <span>
          <Kbd>↵</Kbd> 打开
        </span>
      </footer>
    </Dialog>
  )
}
