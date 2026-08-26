import { useNavigate } from 'react-router-dom'
import { Home, RefreshCw } from 'lucide-react'
import { Button, Spinner } from '@heliannuuthus/ui'
import { useAuthCallback } from '@atlas/shared'
import { StatusPage } from '@/components/StatusPage'
import styles from './index.module.scss'

export function AuthCallback() {
  const navigate = useNavigate()
  const { processing, error } = useAuthCallback()
  if (processing)
    return (
      <div className={styles.container}>
        <Spinner className="size-7" />
      </div>
    )
  if (!error) return null
  return (
    <div className={styles.container}>
      <StatusPage
        title="登录失败"
        description={error}
        actions={
          <>
            <Button onClick={() => navigate('/', { replace: true })}>
              <Home />
              返回首页
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw />
              重试
            </Button>
          </>
        }
      />
    </div>
  )
}
