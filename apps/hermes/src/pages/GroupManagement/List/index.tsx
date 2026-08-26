import { useRequest } from 'ahooks'
import { Eye, Pencil, Plus, Users } from 'lucide-react'
import { Alert, Button, Card, Empty, Spinner, Table } from '@heliannuuthus/ui'
import { useAppNavigate, useDomainId } from '@/contexts/DomainContext'
import { groupApi, serviceApi } from '@/services'
import type { Group } from '@/types'
import styles from './index.module.scss'

export function List() {
  const navigate = useAppNavigate()
  const domainId = useDomainId()
  const { data, loading, error, refresh } = useRequest(
    async () => {
      const [groupPage, servicePage] = await Promise.all([
        groupApi.getList(),
        serviceApi.getList(domainId!),
      ])
      const serviceIds = new Set((servicePage.items ?? []).map(service => service.service_id))
      return (groupPage.items ?? []).filter(group => serviceIds.has(group.service_id))
    },
    { ready: Boolean(domainId), refreshDeps: [domainId] }
  )
  const groups = data ?? []
  const columns: Table.Column<Group>[] = [
    {
      key: 'group_id',
      header: '组 ID',
      width: 180,
      render: (_value, group) => <code>{group.group_id}</code>,
    },
    { key: 'name', header: '名称', width: 180, render: (_value, group) => group.name },
    {
      key: 'description',
      header: '描述',
      render: (_value, group) =>
        group.description || <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'action',
      header: '操作',
      width: 170,
      render: (_value, group) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/groups/${group.group_id}`)}>
            <Eye />
            查看
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/groups/${group.group_id}/edit`)}
          >
            <Pencil />
            编辑
          </Button>
        </div>
      ),
    },
  ]
  const create = (
    <Button onClick={() => navigate('/groups/create')}>
      <Plus />
      创建组
    </Button>
  )
  return (
    <div className={styles.container}>
      <Card
        header={{
          title: '组',
          description: '组用于聚合用户或身份，并作为关系中的主体或对象。',
          action: create,
        }}
      >
        {error ? (
          <Alert
            variant="warning"
            className="mb-4"
            title="用户组暂时无法加载"
            description="请确认 Hermes 管理接口可用后重试。"
            action={
              <Button variant="outline" size="sm" onClick={refresh}>
                重新加载
              </Button>
            }
          />
        ) : null}
        {loading ? (
          <div className="flex min-h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : groups.length ? (
          <Table columns={columns} data={groups} rowKey="group_id" pagination={false} />
        ) : (
          <Empty title="暂无组数据" icon={<Users className="size-8" />} actions={create} />
        )}
      </Card>
    </div>
  )
}
