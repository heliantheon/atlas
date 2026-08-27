import { useNavigate } from 'react-router-dom'
import { Button, Spinner } from '@heliannuuthus/ui'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { useAuthCallback } from '@atlas/shared'
import styles from './index.module.scss'

export function AuthCallback() {
  const navigate = useNavigate()
  const { processing, error } = useAuthCallback()
  if (processing)
    return (
      <main className={styles.container}>
        <Spinner size="lg" />
        <h1>正在完成登录</h1>
        <p>正在验证授权结果，请不要关闭页面。</p>
      </main>
    )
  if (!error) return null
  return (
    <main className={styles.container}>
      <span className={styles.errorIcon}>
        <AlertTriangle aria-hidden="true" />
      </span>
      <h1>登录没有完成</h1>
      <p>{error}</p>
      <div className={styles.actions}>
        <Button onClick={() => navigate('/', { replace: true })}>
          <Home aria-hidden="true" /> 返回首页
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw aria-hidden="true" /> 重试
        </Button>
      </div>
    </main>
  )
}
