import { useRequest } from 'ahooks'
import { Eye, Pencil, Plus, Users } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@atlas/ui/alert'
import { Button } from '@atlas/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@atlas/ui/card'
import { EmptyState } from '@atlas/ui/empty-state'
import { Spinner } from '@atlas/ui/spinner'
import { DataTable, type DataTableColumn } from '@atlas/ui/table'
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
  const columns: DataTableColumn<Group>[] = [
    {
      key: 'group_id',
      header: '组 ID',
      width: 180,
      render: group => <code>{group.group_id}</code>,
    },
    { key: 'name', header: '名称', width: 180, render: group => group.name },
    {
      key: 'description',
      header: '描述',
      render: group => group.description || <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'action',
      header: '操作',
      width: 170,
      render: group => (
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
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div className="grid gap-1.5">
            <CardTitle>组</CardTitle>
            <p className={styles.headerDesc}>组用于聚合用户或身份，并作为关系中的主体或对象。</p>
          </div>
          {create}
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="warning" className="mb-4">
              <AlertTitle>用户组暂时无法加载</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-4">
                请确认 Hermes 管理接口可用后重试。
                <Button variant="outline" size="sm" onClick={refresh}>
                  重新加载
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Spinner />
            </div>
          ) : groups.length ? (
            <DataTable columns={columns} data={groups} rowKey="group_id" />
          ) : (
            <EmptyState title="暂无组数据" icon={<Users className="size-8" />} action={create} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
