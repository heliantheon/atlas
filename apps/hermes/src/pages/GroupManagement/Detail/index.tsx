import { useState, type ReactNode } from 'react'
import { useRequest } from 'ahooks'
import {
  GitBranch,
  Info,
  LoaderCircle,
  Share2,
  Trash2,
  User,
  UserRoundCog,
  Users,
} from 'lucide-react'
import { useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Dialog,
  Empty,
  Input,
  Spinner,
  Table,
  Tabs,
  Tag,
  toast,
} from '@heliannuuthus/ui'
import { PageHeader, formatDateTime, formatRelativeTime, isExpiringSoon } from '@atlas/shared'
import { useAppNavigate } from '@/contexts/DomainContext'
import { groupApi, relationshipApi } from '@/services'
import type { Relationship } from '@/types'
import { collectCursorPages } from '@/utils/pagination'
import styles from './index.module.scss'

export function Detail() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useAppNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [memberDraft, setMemberDraft] = useState('')
  const [savingMembers, setSavingMembers] = useState(false)
  const { data, loading, error, refresh } = useRequest(() => groupApi.getDetail(groupId!), {
    ready: Boolean(groupId),
  })
  const {
    data: members,
    loading: membersLoading,
    error: membersError,
    refresh: refreshMembers,
  } = useRequest(() => groupApi.getMembers(groupId!), { ready: Boolean(groupId) })
  const {
    data: relationships,
    loading: relationsLoading,
    error: relationsError,
    refresh: refreshRelations,
  } = useRequest(
    () =>
      collectCursorPages(token =>
        relationshipApi.getList(
          { service_id: data?.service_id, subject_type: 'group', subject_id: groupId },
          { token, size: 100 }
        )
      ),
    { ready: Boolean(groupId && data?.service_id), refreshDeps: [groupId, data?.service_id] }
  )
  const memberRows = members?.members ?? []
  const relationRows = relationships ?? []
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
  const openMembers = () => {
    setMemberDraft(memberRows.join('\n'))
    setMembersOpen(true)
  }
  const saveMembers = async () => {
    if (!groupId) return
    const userIds = [
      ...new Set(
        memberDraft
          .split(/[\s,]+/)
          .map(value => value.trim())
          .filter(Boolean)
      ),
    ]
    setSavingMembers(true)
    try {
      await groupApi.setMembers(groupId, { group_id: groupId, user_ids: userIds })
      await refreshMembers()
      setMembersOpen(false)
      toast.success('组成员已更新')
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : '更新组成员失败')
    } finally {
      setSavingMembers(false)
    }
  }
  const columns: Table.Column<Relationship>[] = [
    {
      key: 'service',
      header: '服务',
      width: 140,
      render: (_value, relation) => <Tag>{relation.service_id}</Tag>,
    },
    {
      key: 'relation',
      header: '关系',
      width: 120,
      render: (_value, relation) => <Tag type="primary">{relation.relation}</Tag>,
    },
    {
      key: 'object',
      header: '对象',
      render: (_value, relation) => (
        <div className={styles.entityCell}>
          <Tag type="info">{relation.object_type}</Tag>
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
      render: (_value, relation) =>
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
  if (error || !data)
    return (
      <Empty
        title="无法读取用户组"
        description="该用户组不存在，或 Hermes 管理接口暂时不可用。"
        actions={<Button onClick={refresh}>重试</Button>}
      />
    )
  const detailItems: Array<{ label: string; value: ReactNode; wide?: boolean }> = [
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
  ]
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
          <Tabs
            defaultValue="info"
            className={styles.tabs}
            items={[
              {
                value: 'info',
                label: (
                  <>
                    <Info />
                    基本信息
                  </>
                ),
                content: (
                  <dl className="grid overflow-hidden rounded-lg border bg-border md:grid-cols-2">
                    {detailItems.map(item => (
                      <div
                        key={item.label}
                        className={`grid grid-cols-[minmax(7rem,0.35fr)_1fr] gap-px bg-background ${item.wide ? 'md:col-span-full' : ''}`}
                      >
                        <dt className="bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                          {item.label}
                        </dt>
                        <dd className="min-w-0 px-4 py-3 text-sm">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                ),
              },
              {
                value: 'members',
                label: (
                  <>
                    <Users />
                    成员列表{memberRows.length ? <Tag type="info">{memberRows.length}</Tag> : null}
                  </>
                ),
                content: (
                  <div className={styles.membersTab}>
                    <div className={styles.tabHeader}>
                      <span className="text-sm text-muted-foreground">该组包含的用户成员</span>
                      <Button variant="outline" onClick={openMembers}>
                        <UserRoundCog />
                        管理成员
                      </Button>
                    </div>
                    {membersError ? (
                      <Alert
                        variant="error"
                        title="组成员加载失败"
                        action={<Button onClick={refreshMembers}>重试</Button>}
                      />
                    ) : membersLoading ? (
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
                      <Empty title="暂无成员" />
                    )}
                  </div>
                ),
              },
              {
                value: 'relationships',
                label: (
                  <>
                    <Share2 />
                    授权关系
                    {relationRows.length ? <Tag type="info">{relationRows.length}</Tag> : null}
                  </>
                ),
                content: (
                  <div className={styles.relationshipsTab}>
                    <div className={styles.tabHeader}>
                      <span className="text-sm text-muted-foreground">该组作为主体的授权关系</span>
                      <Button variant="outline" onClick={() => navigate('/relationships/graph')}>
                        <GitBranch />
                        在图谱中查看
                      </Button>
                    </div>
                    {relationsError ? (
                      <Alert
                        variant="error"
                        title="授权关系加载失败"
                        action={<Button onClick={refreshRelations}>重试</Button>}
                      />
                    ) : relationsLoading ? (
                      <div className={styles.loading}>
                        <Spinner />
                      </div>
                    ) : relationRows.length ? (
                      <Table
                        columns={columns}
                        data={relationRows}
                        pagination={false}
                        rowKey={relation =>
                          `${relation.service_id}:${relation.subject_id}:${relation.relation}:${relation.object_id}`
                        }
                      />
                    ) : (
                      <Empty title="暂无授权关系" />
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>
      <Dialog
        open={deleteOpen}
        onOpenChange={open => !deleting && setDeleteOpen(open)}
        title="删除用户组"
        description={`将删除“${data.name || data.group_id}”。请先确认该组没有仍需保留的成员与授权关系。`}
        footer={
          <>
            <Button variant="outline" disabled={deleting} onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={() => void deleteGroup()}>
              {deleting ? <LoaderCircle className="animate-spin" /> : null}确认删除
            </Button>
          </>
        }
      />
      <Dialog
        open={membersOpen}
        onOpenChange={open => {
          if (!savingMembers) setMembersOpen(open)
        }}
        title="管理组成员"
        description="这里提交的是完整成员集合；移除某一行会把对应用户移出该组。支持换行、空格或逗号分隔。"
        footer={
          <>
            <Button
              variant="outline"
              disabled={savingMembers}
              onClick={() => setMembersOpen(false)}
            >
              取消
            </Button>
            <Button disabled={savingMembers} onClick={() => void saveMembers()}>
              {savingMembers ? <LoaderCircle className="animate-spin" /> : null}
              保存成员
            </Button>
          </>
        }
      >
        <label className="grid gap-2 text-sm font-medium" htmlFor="group-members">
          用户 ID
          <Input.TextArea
            id="group-members"
            rows={10}
            value={memberDraft}
            onChange={event => setMemberDraft(event.target.value)}
            placeholder="每行一个用户 ID"
          />
          <span className="text-xs font-normal text-muted-foreground">
            当前解析出 {new Set(memberDraft.split(/[\s,]+/).filter(Boolean)).size} 个成员。
          </span>
        </label>
      </Dialog>
    </div>
  )
}
