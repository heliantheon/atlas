import { useNavigate } from 'react-router-dom'
import { Button } from '@heliannuuthus/ui'
import { StatusPage } from '@/components/StatusPage'
import { useDomainId } from '@/contexts/DomainContext'

export function NotFound() {
  const navigate = useNavigate()
  const domainId = useDomainId()
  const basePath = domainId ? `/d/${encodeURIComponent(domainId)}` : '/'
  return (
    <StatusPage
      title="404"
      description="页面不存在"
      actions={<Button onClick={() => navigate(basePath)}>返回{domainId ? '概览' : '首页'}</Button>}
    />
  )
}
