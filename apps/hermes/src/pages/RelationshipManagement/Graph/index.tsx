import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useRequest } from 'ahooks'
import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button, Card, Dialog, Spinner, Table, toast } from '@heliannuuthus/ui'
import { Trash2 } from 'lucide-react'
import { serviceApi, applicationApi, groupApi, relationshipApi } from '@/services'
import { useDomainId } from '@/contexts/DomainContext'
import type { Relationship } from '@/types'
import { formatDateTime, isExpiringSoon } from '@atlas/shared'
import { GraphContextProvider, useGraphContext } from './context/GraphContext'
import { SubjectNode, type SubjectNodeData } from './nodes/SubjectNode'
import { ObjectNode, type ObjectNodeData } from './nodes/ObjectNode'
import { RelationEdge, EdgeArrowDefs, type RelationEdgeData } from './edges/RelationEdge'
import { AddNodes } from './AddNodes'
import { CanvasHeader } from './CanvasHeader'
import { CreateRelationDialog } from './dialogs/CreateRelationDialog'
import styles from './index.module.scss'

// 节点类型注册
const nodeTypes: NodeTypes = {
  subject: SubjectNode,
  object: ObjectNode,
}

// 边类型注册
const edgeTypes: EdgeTypes = {
  relation: RelationEdge,
}

function GraphCanvas() {
  const { serviceId: urlServiceId } = useParams<{ serviceId: string }>()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)

  const {
    isDirty,
    selectedServiceId,
    pendingRelations,
    setSelectedServiceId,
    addPendingRelation,
    resetChanges,
    setDirty,
    clearDirty: _clearDirty,
    deleteEdge: _contextDeleteEdge,
  } = useGraphContext()

  // 如果 URL 中有 serviceId，自动同步到 Context
  useEffect(() => {
    if (urlServiceId && urlServiceId !== selectedServiceId) {
      setSelectedServiceId(urlServiceId)
    }
  }, [urlServiceId, selectedServiceId, setSelectedServiceId])

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Relationship | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 创建关系对话框
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingConnection, setPendingConnection] = useState<{
    source: { type: string; id: string }
    target: { type: string; id: string }
  } | null>(null)

  const domainId = useDomainId()

  const { data: services, loading: servicesLoading } = useRequest(
    () => serviceApi.getList(domainId!),
    { ready: !!domainId }
  )

  const { data: applications, loading: applicationsLoading } = useRequest(
    () => applicationApi.getList(domainId!),
    { ready: !!domainId }
  )

  const { data: groups, loading: groupsLoading } = useRequest(() => groupApi.getList())

  const {
    data: relationships,
    loading: relationshipsLoading,
    refresh: refreshRelationships,
  } = useRequest(() => relationshipApi.getList({ service_id: selectedServiceId }), {
    refreshDeps: [selectedServiceId],
  })

  const relationshipItems = useMemo(() => relationships?.items ?? [], [relationships])

  const users = useMemo(() => {
    if (!relationshipItems.length) return []
    const userIds = new Set<string>()
    relationshipItems.forEach(r => {
      if (r.subject_type === 'user') userIds.add(r.subject_id)
    })
    return Array.from(userIds)
  }, [relationshipItems])

  // 从关系数据构建节点和边
  useEffect(() => {
    if (!relationshipItems.length) return

    const nodeMap = new Map<string, Node>()
    const newEdges: Edge[] = []

    relationshipItems.forEach((rel, index) => {
      // 创建主体节点
      const subjectNodeId = `${rel.subject_type}:${rel.subject_id}`
      if (!nodeMap.has(subjectNodeId)) {
        nodeMap.set(subjectNodeId, {
          id: subjectNodeId,
          type: 'subject',
          position: { x: 100, y: 100 + index * 120 },
          data: {
            type: rel.subject_type,
            id: rel.subject_id,
          } as SubjectNodeData,
        })
      }

      // 创建对象节点
      const objectNodeId = `${rel.object_type}:${rel.object_id}`
      if (!nodeMap.has(objectNodeId)) {
        const isSubjectType = ['user', 'group', 'application'].includes(rel.object_type)
        nodeMap.set(objectNodeId, {
          id: objectNodeId,
          type: isSubjectType ? 'subject' : 'object',
          position: { x: 450, y: 100 + index * 120 },
          data: isSubjectType
            ? ({ type: rel.object_type, id: rel.object_id } as SubjectNodeData)
            : ({ type: rel.object_type, id: rel.object_id } as ObjectNodeData),
        })
      }

      // 创建边
      const edgeId = `${subjectNodeId}-${objectNodeId}-${rel.relation}`
      newEdges.push({
        id: edgeId,
        source: subjectNodeId,
        target: objectNodeId,
        type: 'relation',
        data: {
          relation: rel.relation,
          expiresAt: rel.expires_at,
          isPending: false,
        } as RelationEdgeData,
      })
    })

    setNodes(Array.from(nodeMap.values()))
    setEdges(newEdges)
  }, [relationshipItems, setNodes, setEdges])

  // 拖放处理
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      if (!reactFlowInstance || !reactFlowWrapper.current) return

      const data = event.dataTransfer.getData('application/reactflow')
      if (!data) return

      const { nodeType, nodeData } = JSON.parse(data)
      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })

      const nodeId = `${nodeData.type}:${nodeData.id}`

      // 检查节点是否已存在
      const existingNode = nodes.find(n => n.id === nodeId)
      if (existingNode) {
        toast.warning('该节点已存在于画布中')
        return
      }

      const newNode: Node = {
        id: nodeId,
        type: nodeType === 'subject' ? 'subject' : 'object',
        position,
        data: nodeData,
      }

      setNodes(nds => [...nds, newNode])
      setDirty()
    },
    [reactFlowInstance, nodes, setNodes, setDirty]
  )

  const handleDragStart = useCallback(
    (
      event: React.DragEvent,
      nodeType: 'subject' | 'object',
      data: { type: string; id: string; label?: string }
    ) => {
      event.dataTransfer.setData(
        'application/reactflow',
        JSON.stringify({ nodeType, nodeData: data })
      )
      event.dataTransfer.effectAllowed = 'move'
    },
    []
  )

  // 连线处理
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      if (!selectedServiceId) {
        toast.warning('请先选择服务')
        return
      }

      // 解析节点信息
      const [sourceType, sourceId] = connection.source.split(':')
      const [targetType, targetId] = connection.target.split(':')

      // 设置待创建的连接
      setPendingConnection({
        source: { type: sourceType, id: sourceId },
        target: { type: targetType, id: targetId },
      })
      setDialogOpen(true)
    },
    [selectedServiceId]
  )

  // 确认创建关系
  const handleCreateRelation = useCallback(
    (data: { relation: string; expiresAt?: string }) => {
      if (!pendingConnection || !selectedServiceId) return

      const newRelation: Relationship = {
        service_id: selectedServiceId,
        subject_type: pendingConnection.source.type as 'user' | 'group' | 'application',
        subject_id: pendingConnection.source.id,
        relation: data.relation,
        object_type: pendingConnection.target.type,
        object_id: pendingConnection.target.id,
        created_at: new Date().toISOString(),
        expires_at: data.expiresAt,
      }

      // 添加边到画布
      const edgeId = `${pendingConnection.source.type}:${pendingConnection.source.id}-${pendingConnection.target.type}:${pendingConnection.target.id}-${data.relation}`
      const newEdge: Edge = {
        id: edgeId,
        source: `${pendingConnection.source.type}:${pendingConnection.source.id}`,
        target: `${pendingConnection.target.type}:${pendingConnection.target.id}`,
        type: 'relation',
        data: {
          relation: data.relation,
          expiresAt: data.expiresAt,
          isPending: true,
        } as RelationEdgeData,
      }

      setEdges(eds => addEdge(newEdge, eds))
      addPendingRelation(newRelation)

      setDialogOpen(false)
      setPendingConnection(null)
    },
    [pendingConnection, selectedServiceId, setEdges, addPendingRelation]
  )

  // 保存更改
  const handleSave = useCallback(async () => {
    if (!selectedServiceId) {
      toast.warning('请先选择服务')
      return
    }

    setSaving(true)
    try {
      // 创建新关系
      for (const rel of pendingRelations) {
        await relationshipApi.create({
          service_id: rel.service_id,
          subject_type: rel.subject_type,
          subject_id: rel.subject_id,
          relation: rel.relation,
          object_type: rel.object_type,
          object_id: rel.object_id,
          expires_at: rel.expires_at,
        })
      }

      toast.success('保存成功')
      resetChanges()
      refreshRelationships()
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }, [selectedServiceId, pendingRelations, resetChanges, refreshRelationships])

  // 重置画布
  const handleReset = useCallback(() => {
    resetChanges()
    refreshRelationships()
  }, [resetChanges, refreshRelationships])

  // 全屏切换
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  // 删除关系
  const handleDeleteRelation = useCallback(
    async (rel: Relationship) => {
      try {
        await relationshipApi.delete({
          service_id: rel.service_id,
          subject_type: rel.subject_type,
          subject_id: rel.subject_id,
          relation: rel.relation,
          object_type: rel.object_type,
          object_id: rel.object_id,
        })
        toast.success('删除成功')
        refreshRelationships()
      } catch {
        toast.error('删除失败')
      }
    },
    [refreshRelationships]
  )

  // 表格列定义
  const columns: Table.Column<Relationship>[] = [
    {
      key: 'subject_type',
      header: '主体类型',
      width: 100,
      render: (_value, row) => row.subject_type,
    },
    {
      key: 'subject_id',
      header: '主体 ID',
      width: 150,
      render: (_value, row) => (
        <code className="block max-w-40 truncate" title={row.subject_id}>
          {row.subject_id}
        </code>
      ),
    },
    { key: 'relation', header: '关系', width: 100, render: (_value, row) => row.relation },
    {
      key: 'object_type',
      header: '对象类型',
      width: 100,
      render: (_value, row) => row.object_type,
    },
    {
      key: 'object_id',
      header: '对象 ID',
      width: 150,
      render: (_value, row) => (
        <code className="block max-w-40 truncate" title={row.object_id}>
          {row.object_id}
        </code>
      ),
    },
    {
      key: 'expires_at',
      header: '过期时间',
      width: 160,
      render: (_value, row) => {
        if (!row.expires_at) return '—'
        const expiring = isExpiringSoon(row.expires_at)
        return (
          <span className={expiring ? 'text-amber-600' : undefined}>
            {formatDateTime(row.expires_at)}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: '操作',
      width: 80,
      render: (_value, row) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setPendingDelete(row)}
        >
          <Trash2 />
          删除
        </Button>
      ),
    },
  ]

  const loading = servicesLoading || applicationsLoading || groupsLoading

  return (
    <div className={`${styles.graphPage} ${isFullscreen ? styles.fullscreen : ''}`}>
      <CanvasHeader
        services={services?.items ?? []}
        selectedServiceId={selectedServiceId}
        onServiceChange={setSelectedServiceId}
        onSave={handleSave}
        onReset={handleReset}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
        isDirty={isDirty}
        saving={saving}
        relationCount={relationshipItems.length}
        isLocked={!!urlServiceId}
      />

      <div className={styles.graphContainer}>
        {/* 左侧节点面板 */}
        <div className={styles.sidePanel}>
          {loading ? (
            <div className={styles.loading}>
              <Spinner />
            </div>
          ) : (
            <AddNodes
              users={users}
              groups={groups?.items ?? []}
              applications={applications?.items ?? []}
              onDragStart={handleDragStart}
            />
          )}
        </div>

        {/* 画布区域 */}
        <div className={styles.canvasWrapper} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
            <EdgeArrowDefs />
          </ReactFlow>
        </div>
      </div>

      {/* 下方数据表格 */}
      <Card className={styles.tableCard} header={{ title: '关系明细' }}>
        {relationshipsLoading ? (
          <div className="flex min-h-32 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <Table
            columns={columns}
            data={relationshipItems}
            pagination={false}
            rowKey={r => `${r.service_id}:${r.subject_id}:${r.relation}:${r.object_id}`}
          />
        )}
      </Card>

      {/* 创建关系对话框 */}
      <CreateRelationDialog
        open={dialogOpen}
        sourceNode={pendingConnection?.source || null}
        targetNode={pendingConnection?.target || null}
        serviceId={selectedServiceId || ''}
        onConfirm={handleCreateRelation}
        onCancel={() => {
          setDialogOpen(false)
          setPendingConnection(null)
        }}
      />
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={open => !open && setPendingDelete(null)}
        title="删除关系"
        description={`确定删除 ${pendingDelete?.subject_id ?? ''} → ${pendingDelete?.object_id ?? ''} 的“${pendingDelete?.relation ?? ''}”关系？`}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!pendingDelete) return
                setDeleting(true)
                await handleDeleteRelation(pendingDelete)
                setDeleting(false)
                setPendingDelete(null)
              }}
            >
              <Trash2 />
              删除
            </Button>
          </>
        }
      />
    </div>
  )
}

// 包装组件，提供 ReactFlow 和 Context
export function Graph() {
  return (
    <ReactFlowProvider>
      <GraphContextProvider>
        <GraphCanvas />
      </GraphContextProvider>
    </ReactFlowProvider>
  )
}
