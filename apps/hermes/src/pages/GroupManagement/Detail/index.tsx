import { useState } from 'react'
import { useRequest } from 'ahooks'
import { GitBranch, Info, LoaderCircle, Share2, Trash2, User, Users } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Badge } from '@atlas/ui/badge'
import { Button } from '@atlas/ui/button'
import { Card, CardContent } from '@atlas/ui/card'
import { DescriptionList } from '@atlas/ui/description-list'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@atlas/ui/dialog'
import { EmptyState } from '@atlas/ui/empty-state'
import { Spinner } from '@atlas/ui/spinner'
import { DataTable, type DataTableColumn } from '@atlas/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atlas/ui/tabs'
import { toast } from '@atlas/ui/toast'
import { PageHeader, formatDateTime, formatRelativeTime, isExpiringSoon } from '@atlas/shared'
import { useAppNavigate } from '@/contexts/DomainContext'
import { groupApi, relationshipApi } from '@/services'
import type { Relationship } from '@/types'
import styles from './index.module.scss'

export function Detail() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useAppNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { data, loading } = useRequest(() => groupApi.getDetail(groupId!), {
    ready: Boolean(groupId),
    onError: () => toast.error('获取组信息失败'),
  })
  const { data: members, loading: membersLoading } = useRequest(
    () => groupApi.getMembers(groupId!),
    { ready: Boolean(groupId) }
  )
  const { data: relationships, loading: relationsLoading } = useRequest(
    () => relationshipApi.getList({ subject_type: 'group', subject_id: groupId }),
    { ready: Boolean(groupId) }
  )
  const memberRows = members?.members ?? []
  const relationRows = relationships?.items ?? []
  const deleteGroup = async () => {
    if (!groupId) return
    setDeleting(true)
    try {
      await groupApi.delete(groupId)
      toast.success('用户组已删除')
      navigate('/groups')
    } catch {
      toast.error('删除用户组失败')
    } finally {
      setDeleting(false)
    }
  }
  const columns: DataTableColumn<Relationship>[] = [
    {
      key: 'service',
      header: '服务',
      width: 140,
      render: relation => <Badge variant="outline">{relation.service_id}</Badge>,
    },
    {
      key: 'relation',
      header: '关系',
      width: 120,
      render: relation => <Badge>{relation.relation}</Badge>,
    },
    {
      key: 'object',
      header: '对象',
      render: relation => (
        <div className={styles.entityCell}>
          <Badge variant="secondary">{relation.object_type}</Badge>
          <span className="max-w-40 truncate" title={relation.object_id}>
            {relation.object_id}
          </span>
        </div>
      ),
    },
    {
      key: 'expires',
      header: '过期时间',
      width: 150,
      render: relation =>
        relation.expires_at ? (
          <span className={isExpiringSoon(relation.expires_at) ? 'text-amber-700' : undefined}>
            {formatRelativeTime(relation.expires_at)}
          </span>
        ) : (
          <span className="text-muted-foreground">永久</span>
        ),
    },
  ]
  if (loading)
    return (
      <div className={styles.loading}>
        <Spinner className="size-7" />
      </div>
    )
  if (!data) return null
  return (
    <div className={styles.container}>
      <PageHeader
        title={data.name || '组详情'}
        onBack={() => navigate('/groups')}
        extra={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 />
              删除组
            </Button>
            <Button onClick={() => navigate(`/groups/${groupId}/edit`)}>编辑组</Button>
          </div>
        }
      />
      <div className={styles.content}>
        <Card className={styles.mainCard}>
          <CardContent>
            <Tabs defaultValue="info" className={styles.tabs}>
              <TabsList>
                <TabsTrigger value="info">
                  <Info />
                  基本信息
                </TabsTrigger>
                <TabsTrigger value="members">
                  <Users />
                  成员列表
                  {memberRows.length ? (
                    <Badge variant="secondary">{memberRows.length}</Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="relationships">
                  <Share2 />
                  授权关系
                  {relationRows.length ? (
                    <Badge variant="secondary">{relationRows.length}</Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="info">
                <DescriptionList
                  className={styles.descriptions}
                  items={[
                    { label: '组 ID', value: <code>{data.group_id}</code> },
                    { label: '所属服务', value: <code>{data.service_id}</code> },
                    { label: '名称', value: data.name },
                    {
                      label: '描述',
                      value: data.description || <span className="text-muted-foreground">—</span>,
                      wide: true,
                    },
                    { label: '创建时间', value: formatDateTime(data.created_at) },
                    { label: '更新时间', value: formatDateTime(data.updated_at) },
                  ]}
                />
              </TabsContent>
              <TabsContent value="members">
                <div className={styles.membersTab}>
                  <div className={styles.tabHeader}>
                    <span className="text-sm text-muted-foreground">该组包含的用户成员</span>
                  </div>
                  {membersLoading ? (
                    <div className={styles.loading}>
                      <Spinner />
                    </div>
                  ) : memberRows.length ? (
                    <ul className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {memberRows.map(userId => (
                        <li key={userId} className={styles.memberCard}>
                          <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                            <User className="size-4" />
                          </span>
                          <span className={styles.memberName} title={userId}>
                            {userId}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState title="暂无成员" />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="relationships">
                <div className={styles.relationshipsTab}>
                  <div className={styles.tabHeader}>
                    <span className="text-sm text-muted-foreground">该组作为主体的授权关系</span>
                    <Button variant="outline" onClick={() => navigate('/relationships/graph')}>
                      <GitBranch />
                      在图谱中查看
                    </Button>
                  </div>
                  {relationsLoading ? (
                    <div className={styles.loading}>
                      <Spinner />
                    </div>
                  ) : relationRows.length ? (
                    <DataTable
                      columns={columns}
                      data={relationRows}
                      rowKey={relation =>
                        `${relation.service_id}:${relation.subject_id}:${relation.relation}:${relation.object_id}`
                      }
                    />
                  ) : (
                    <EmptyState title="暂无授权关系" />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Dialog open={deleteOpen} onOpenChange={open => !deleting && setDeleteOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除用户组</DialogTitle>
            <DialogDescription>
              将删除“{data.name || data.group_id}”。请先确认该组没有仍需保留的成员与授权关系。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={() => void deleteGroup()}>
              {deleting ? <LoaderCircle className="animate-spin" /> : null}确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
