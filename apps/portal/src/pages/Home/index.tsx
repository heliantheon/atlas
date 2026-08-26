import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Button, Empty, Tag } from '@heliannuuthus/ui'
import { ArrowRight, Clock3, ExternalLink, Search } from 'lucide-react'
import type { PortalOutletContext } from '@/layouts'
import {
  atlasApps,
  getRecentLaunches,
  getTargetByKey,
  recordLaunchTarget,
  type AtlasLaunchTarget,
} from '@/config/apps'
import styles from './index.module.scss'

export function Home() {
  const { openLauncher } = useOutletContext<PortalOutletContext>()
  const recentTargets = useMemo(
    () =>
      getRecentLaunches()
        .map(item => getTargetByKey(item.key))
        .filter((target): target is AtlasLaunchTarget => Boolean(target)),
    []
  )
  const capabilityCount = atlasApps.reduce((sum, app) => sum + app.capabilities.length, 0)

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.kicker}>OPERATIONS DIRECTORY / PRODUCTION</span>
          <h1>从系统边界进入工作。</h1>
          <p>Atlas 只负责定位和切换。身份、投递与业务运营仍由各自系统保持清晰边界。</p>
        </div>
        <Button size="lg" onClick={openLauncher}>
          <Search aria-hidden="true" /> 搜索管理入口
        </Button>
      </header>

      <section className={styles.contextRail} aria-label="Atlas 目录状态">
        <div>
          <span>REGISTERED SYSTEMS</span>
          <strong>{atlasApps.length}</strong>
        </div>
        <div>
          <span>MANAGEMENT ENTRIES</span>
          <strong>{capabilityCount}</strong>
        </div>
        <div className={styles.contextStatus}>
          <i aria-hidden="true" />
          <span>
            <small>DIRECTORY STATUS</small>
            <strong>Manifest 已加载</strong>
          </span>
        </div>
        <div>
          <span>OPEN MODE</span>
          <strong>当前标签页</strong>
        </div>
      </section>

      <section className={styles.directory} aria-labelledby="systems-title">
        <div className={styles.sectionHeader}>
          <div>
            <span>SYSTEM BOUNDARIES</span>
            <h2 id="systems-title">管理系统</h2>
          </div>
          <small>每个系统独立认证、部署和演进</small>
        </div>
        <div className={styles.systemList}>
          {atlasApps.map((app, index) => {
            const home = getTargetByKey(`${app.id}:home`)!
            return (
              <article
                key={app.id}
                className={styles.system}
                style={{ '--app-color': app.color, '--app-tint': app.tint } as React.CSSProperties}
              >
                <div className={styles.systemIndex}>{String(index + 1).padStart(2, '0')}</div>
                <div className={styles.systemIdentity}>
                  <span className={styles.systemMark}>
                    <img src={app.logo} alt="" aria-hidden="true" />
                  </span>
                  <div>
                    <div className={styles.systemTitle}>
                      <h3>{app.name}</h3>
                      <Tag>{app.category}</Tag>
                    </div>
                    <p>{app.description}</p>
                    <small>{app.mood}</small>
                  </div>
                </div>
                <nav className={styles.capabilities} aria-label={`${app.name} 功能`}>
                  {app.capabilities.map(capability => {
                    const target = getTargetByKey(`${app.id}:${capability.id}`)!
                    return (
                      <a
                        key={capability.id}
                        href={target.href}
                        onClick={() => recordLaunchTarget(target)}
                      >
                        <span>{capability.icon}</span>
                        {capability.name}
                        <ArrowRight aria-hidden="true" />
                      </a>
                    )
                  })}
                </nav>
                <a
                  className={styles.openSystem}
                  href={home.href}
                  onClick={() => recordLaunchTarget(home)}
                  aria-label={`打开 ${app.name}`}
                >
                  <ExternalLink aria-hidden="true" />
                </a>
              </article>
            )
          })}
        </div>
      </section>

      <section className={styles.recent} aria-labelledby="recent-title">
        <div className={styles.sectionHeader}>
          <div>
            <span>LOCAL HISTORY</span>
            <h2 id="recent-title">最近入口</h2>
          </div>
          <small>仅保存在当前浏览器</small>
        </div>
        {recentTargets.length === 0 ? (
          <Empty
            icon={<Clock3 />}
            title="还没有访问记录"
            description="打开任一管理功能后，它会出现在这里。"
            actions={
              <Button variant="outline" onClick={openLauncher}>
                查找入口
              </Button>
            }
          />
        ) : (
          <div className={styles.recentList}>
            {recentTargets.map(target => (
              <a key={target.key} href={target.href} onClick={() => recordLaunchTarget(target)}>
                <span
                  className={styles.recentIcon}
                  style={{ color: target.color, background: target.tint }}
                >
                  {target.icon ?? target.appName.slice(0, 1)}
                </span>
                <span>
                  <strong>{target.name}</strong>
                  <small>{target.appName}</small>
                </span>
                <ExternalLink aria-hidden="true" />
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
