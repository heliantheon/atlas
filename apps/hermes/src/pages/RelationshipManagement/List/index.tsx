import { useCallback, useMemo, useState } from 'react'
import { useRequest } from 'ahooks'
import { GitBranch, LoaderCircle, Pencil, Plus, Share2, Trash2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import {
  Button,
  Card,
  Dialog,
  Empty,
  Input,
  Select,
  Spinner,
  Table,
  Tag,
  toast,
} from '@heliannuuthus/ui'
import { formatRelativeTime, isExpiringSoon } from '@atlas/shared'
import { useAppNavigate } from '@/contexts/DomainContext'
import { relationshipApi } from '@/services'
import type { Relationship } from '@/types'
import styles from './index.module.scss'

const subjectTypeLabels: Record<string, string> = { user: '用户', group: '组', application: '应用' }

function toDateTimeLocal(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function List() {
  const { serviceId: urlServiceId } = useParams<{ serviceId: string }>()
  const navigate = useAppNavigate()
  const [subjectType, setSubjectType] = useState<string>('all')
  const [pendingDelete, setPendingDelete] = useState<Relationship | null>(null)
  const [pendingEdit, setPendingEdit] = useState<Relationship | null>(null)
  const [editRelation, setEditRelation] = useState('')
  const [editExpiresAt, setEditExpiresAt] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const { data, loading, refresh } = useRequest(
    () =>
      relationshipApi.getList({
        service_id: urlServiceId,
        subject_type: subjectType === 'all' ? undefined : subjectType,
      }),
    { refreshDeps: [urlServiceId, subjectType] }
  )
  const relationships = data?.items ?? []
  const deleteRelationship = useCallback(async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await relationshipApi.delete({
        service_id: pendingDelete.service_id,
        subject_type: pendingDelete.subject_type,
        subject_id: pendingDelete.subject_id,
        relation: pendingDelete.relation,
        object_type: pendingDelete.object_type,
        object_id: pendingDelete.object_id,
      })
      toast.success('删除成功')
      setPendingDelete(null)
      refresh()
    } catch {
      toast.error('删除失败')
    } finally {
      setDeleting(false)
    }
  }, [pendingDelete, refresh])
  const openEdit = useCallback((relationship: Relationship) => {
    setPendingEdit(relationship)
    setEditRelation(relationship.relation)
    setEditExpiresAt(toDateTimeLocal(relationship.expires_at))
  }, [])
  const updateRelationship = useCallback(async () => {
    if (!pendingEdit || !editRelation.trim()) return
    setUpdating(true)
    try {
      await relationshipApi.update({
        service_id: pendingEdit.service_id,
        subject_type: pendingEdit.subject_type,
        subject_id: pendingEdit.subject_id,
        relation: pendingEdit.relation,
        object_type: pendingEdit.object_type,
        object_id: pendingEdit.object_id,
        new_relation: editRelation.trim(),
        expires_at: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
      })
      toast.success('关系已更新')
      setPendingEdit(null)
      refresh()
    } catch {
      toast.error('更新失败')
    } finally {
      setUpdating(false)
    }
  }, [editExpiresAt, editRelation, pendingEdit, refresh])
  const columns = useMemo<Table.Column<Relationship>[]>(() => {
    const result: Table.Column<Relationship>[] = [
      {
        key: 'subject',
        header: '主体',
        width: 220,
        render: (_value, relation) => (
          <div className={styles.entityCell}>
            <Tag type="info">
              {subjectTypeLabels[relation.subject_type] || relation.subject_type}
            </Tag>
            <span className="max-w-32 truncate" title={relation.subject_id}>
              {relation.subject_id}
            </span>
          </div>
        ),
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
        width: 220,
        render: (_value, relation) => (
          <div className={styles.entityCell}>
            <Tag>{relation.object_type}</Tag>
            <span className="max-w-32 truncate" title={relation.object_id}>
              {relation.object_id}
            </span>
          </div>
        ),
      },
      {
        key: 'expires_at',
        header: '过期时间',
        width: 140,
        render: (_value, relation) =>
          relation.expires_at ? (
            <span className={isExpiringSoon(relation.expires_at) ? 'text-amber-700' : undefined}>
              {formatRelativeTime(relation.expires_at)}
            </span>
          ) : (
            <span className="text-muted-foreground">永久</span>
          ),
      },
      {
        key: 'action',
        header: '操作',
        width: 170,
        render: (_value, relation) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => openEdit(relation)}>
              <Pencil />
              编辑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setPendingDelete(relation)}
            >
              <Trash2 />
              删除
            </Button>
          </div>
        ),
      },
    ]
    if (!urlServiceId)
      result.unshift({
        key: 'service_id',
        header: '服务',
        width: 140,
        render: (_value, relation) => <Tag>{relation.service_id}</Tag>,
      })
    return result
  }, [openEdit, urlServiceId])
  const createPath = urlServiceId
    ? `/services/${urlServiceId}/relationships/create`
    : '/relationships/create'
  const graphPath = urlServiceId
    ? `/services/${urlServiceId}/relationships/graph`
    : '/relationships/graph'
  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => navigate(graphPath)}>
        <GitBranch />
        关系图谱
      </Button>
      <Button onClick={() => navigate(createPath)}>
        <Plus />
        配置关系
      </Button>
    </div>
  )

  return (
    <div className={styles.container}>
      <Card
        header={{
          title: (
            <>
              关系管理{' '}
              {urlServiceId ? (
                <span className="text-sm font-normal text-muted-foreground">({urlServiceId})</span>
              ) : null}
            </>
          ),
          description: '主体—关系—对象构成服务内的授权关系。',
          action: actions,
        }}
      >
        <div className="grid gap-4">
          <Select<string>
            value={subjectType}
            onChange={value => setSubjectType(value ?? 'all')}
            classNames={{ trigger: 'w-40' }}
            options={[
              { label: '全部主体', value: 'all' },
              { label: '用户', value: 'user' },
              { label: '组', value: 'group' },
              { label: '应用', value: 'application' },
            ]}
          />
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Spinner />
            </div>
          ) : relationships.length ? (
            <Table
              columns={columns}
              data={relationships}
              pagination={false}
              rowKey={relation =>
                `${relation.service_id}:${relation.subject_type}:${relation.subject_id}:${relation.relation}:${relation.object_type}:${relation.object_id}`
              }
            />
          ) : (
            <Empty title="暂无关系数据" icon={<Share2 className="size-8" />} actions={actions} />
          )}
        </div>
      </Card>
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={open => !open && setPendingDelete(null)}
        title="删除关系"
        description="确定删除这条授权关系？此操作无法撤销。"
        footer={
          <>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void deleteRelationship()}
            >
              {deleting ? <LoaderCircle className="animate-spin" /> : null}删除
            </Button>
          </>
        }
      />
      <Dialog
        open={pendingEdit !== null}
        onOpenChange={open => {
          if (!open && !updating) setPendingEdit(null)
        }}
        title="编辑授权关系"
        description="主体和对象保持不变；可调整关系类型与过期时间。"
        footer={
          <>
            <Button variant="outline" disabled={updating} onClick={() => setPendingEdit(null)}>
              取消
            </Button>
            <Button
              disabled={updating || !editRelation.trim()}
              onClick={() => void updateRelationship()}
            >
              {updating ? <LoaderCircle className="animate-spin" /> : null}保存
            </Button>
          </>
        }
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium" htmlFor="relationship-name">
            关系类型
            <Input
              id="relationship-name"
              value={editRelation}
              onChange={event => setEditRelation(event.target.value)}
              placeholder="例如 viewer"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor="relationship-expires-at">
            过期时间
            <Input
              id="relationship-expires-at"
              type="datetime-local"
              value={editExpiresAt}
              onChange={event => setEditExpiresAt(event.target.value)}
            />
            <span className="text-xs font-normal text-muted-foreground">
              留空表示永久有效，并会清除已有过期时间。
            </span>
          </label>
        </div>
      </Dialog>
    </div>
  )
}
