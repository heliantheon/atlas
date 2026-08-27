import { useRequest } from 'ahooks'
import { Eye, Network } from 'lucide-react'
import { Alert, Button, Card, Empty, Spinner, Table } from '@heliannuuthus/ui'
import { useAppNavigate } from '@/contexts/DomainContext'
import { domainApi } from '@/services'
import type { Domain } from '@/types'
import styles from './index.module.scss'

export function List() {
  const navigate = useAppNavigate()
  const { data = [], loading, error, refresh } = useRequest(domainApi.getList)
  const columns: Table.Column<Domain>[] = [
    {
      key: 'domain_id',
      header: '域 ID',
      width: 140,
      render: (_value, domain) => <code>{domain.domain_id}</code>,
    },
    { key: 'name', header: '名称', width: 180, render: (_value, domain) => domain.name },
    {
      key: 'description',
      header: '描述',
      render: (_value, domain) =>
        domain.description || <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'action',
      header: '操作',
      width: 90,
      render: (_value, domain) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/domains/${domain.domain_id}`)}>
          <Eye />
          查看
        </Button>
      ),
    },
  ]
  return (
    <div className={styles.container}>
      <Card
        header={{
          title: '域',
          description:
            '域是身份与权限的隔离边界，当前仅展示该域本身；服务、应用与组均在域下创建与查看。',
        }}
      >
        {error ? (
          <Alert
            variant="error"
            title="域列表加载失败"
            description="无法读取 Hermes 域管理接口。"
            action={<Button onClick={refresh}>重新加载</Button>}
          />
        ) : loading ? (
          <div className="flex min-h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : data.length ? (
          <Table columns={columns} data={data} rowKey="domain_id" pagination={false} />
        ) : (
          <Empty title="暂无域数据" icon={<Network className="size-8" />} />
        )}
      </Card>
    </div>
  )
}
