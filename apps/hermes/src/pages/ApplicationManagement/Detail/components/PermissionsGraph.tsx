import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useRequest } from 'ahooks'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlowProvider,
  getBezierPath,
  useEdgesState,
  useNodesState,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type Node,
  type NodeProps,
  type NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Boxes,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  Save,
  Server,
  X,
} from 'lucide-react'
import { Button, Dialog, Input, Select, Tag, toast } from '@heliannuuthus/ui'
import { FormField } from '@/components/forms/FormField'
import { useDomainId } from '@/contexts/DomainContext'
import { serviceApi } from '@/services'
import type { ApplicationServiceRelation, Service } from '@/types'
import { collectCursorPages } from '@/utils/pagination'
import styles from './PermissionsGraph.module.scss'

interface AppNodeData {
  appId: string
  name: string
  logoUrl?: string
}
interface ServiceNodeData {
  serviceId: string
  name: string
}
interface PermissionEdgeData {
  relations: string[]
  serviceId: string
  isPending?: boolean
  onDeleteRelation: (serviceId: string, relation: string) => void
}

function AppNodeComponent({ data }: NodeProps<AppNodeData>) {
  return (
    <div className={styles.appNode}>
      <Handle type="source" position={Position.Right} className={styles.handle} />
      <div className={styles.graphNodeHeader}>
        <Boxes className={styles.graphNodeIcon} />
        <span className={styles.graphNodeType}>application</span>
      </div>
      <div className={styles.graphNodeBody}>
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="" className="size-full object-cover" />
          ) : (
            <Boxes />
          )}
        </span>
        <div className={styles.graphNodeInfo}>
          <span className={styles.graphNodeLabel} title={data.name || data.appId}>
            {data.name || data.appId}
          </span>
          {data.name ? <span className={styles.graphNodeId}>{data.appId}</span> : null}
        </div>
      </div>
    </div>
  )
}

function ServiceNodeComponent({ data }: NodeProps<ServiceNodeData>) {
  return (
    <div className={styles.serviceNode}>
      <Handle type="target" position={Position.Left} className={styles.handle} />
      <div className={styles.graphNodeHeader}>
        <Server className={styles.graphNodeIcon} />
        <span className={styles.graphNodeType}>service</span>
      </div>
      <div className={styles.graphNodeBody}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Server />
        </span>
        <div className={styles.graphNodeInfo}>
          <span className={styles.graphNodeLabel} title={data.name || data.serviceId}>
            {data.name || data.serviceId}
          </span>
          {data.name ? <span className={styles.graphNodeId}>{data.serviceId}</span> : null}
        </div>
      </div>
    </div>
  )
}

function PermissionEdgeComponent(props: EdgeProps<PermissionEdgeData>) {
  const [path, labelX, labelY] = getBezierPath(props)
  return (
    <>
      <path
        id={props.id}
        className={styles.permissionEdgePath}
        d={path}
        stroke="var(--muted-foreground)"
        strokeWidth={1.5}
        strokeDasharray={props.data?.isPending ? '5,5' : undefined}
        fill="none"
        markerEnd="url(#perm-arrow)"
      />
      <EdgeLabelRenderer>
        <div
          className={styles.permissionEdgeLabelWrap}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          <div
            className={`${styles.permissionEdgeLabel} ${props.data?.isPending ? styles.pending : ''}`}
          >
            {props.data?.relations.map(relation => (
              <Tag key={relation} type="info" className={styles.permissionTag}>
                {relation}
                <button
                  type="button"
                  className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`移除 ${relation}`}
                  onClick={() => props.data?.onDeleteRelation(props.data.serviceId, relation)}
                >
                  <X className="size-3" />
                </button>
              </Tag>
            ))}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const AppNode = memo(AppNodeComponent)
const ServiceNode = memo(ServiceNodeComponent)
const PermissionEdge = memo(PermissionEdgeComponent)
const nodeTypes: NodeTypes = { app: AppNode, service: ServiceNode }
const edgeTypes: EdgeTypes = { permission: PermissionEdge }

function ArrowDefs() {
  return (
    <svg className="absolute left-0 top-0" aria-hidden>
      <defs>
        <marker
          id="perm-arrow"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--muted-foreground)" />
        </marker>
      </defs>
    </svg>
  )
}

const RELATIONS = ['*', 'owner', 'admin', 'member', 'viewer', 'editor', 'reader', 'writer']

function AddPermissionDialog({
  open,
  services,
  onConfirm,
  onCancel,
}: {
  open: boolean
  services: Service[]
  onConfirm: (serviceId: string, relation: string) => void
  onCancel: () => void
}) {
  const [serviceId, setServiceId] = useState('')
  const [relation, setRelation] = useState('')
  const [custom, setCustom] = useState(false)
  const close = () => {
    setServiceId('')
    setRelation('')
    setCustom(false)
    onCancel()
  }
  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) close()
      }}
      title="添加权限"
      description="选择服务并添加该服务授予应用的权限。"
      footer={
        <>
          <Button type="button" variant="outline" onClick={close}>
            取消
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!serviceId || !relation.trim()) {
                toast.error('请选择服务并填写权限类型')
                return
              }
              onConfirm(serviceId, relation.trim())
              setServiceId('')
              setRelation('')
              setCustom(false)
            }}
          >
            添加
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <FormField label="服务" htmlFor="permission-service" required>
          <Select<string>
            id="permission-service"
            value={serviceId || null}
            onChange={value => setServiceId(value ?? '')}
            placeholder="选择服务"
            options={services.map(service => ({
              value: service.service_id,
              label: service.name || service.service_id,
            }))}
          />
        </FormField>
        <FormField label="权限类型" htmlFor="permission-relation" required>
          {custom ? (
            <div className="flex gap-2">
              <Input
                id="permission-relation"
                autoFocus
                value={relation}
                onChange={event => setRelation(event.target.value)}
                placeholder="自定义权限类型"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCustom(false)
                  setRelation('')
                }}
              >
                选择预设
              </Button>
            </div>
          ) : (
            <div className="grid gap-2">
              <Select<string>
                id="permission-relation"
                value={relation || null}
                onChange={value => setRelation(value ?? '')}
                placeholder="选择权限类型"
                options={RELATIONS.map(item => ({
                  value: item,
                  label: item === '*' ? '*（全部权限）' : item,
                }))}
              />
              <Button
                type="button"
                variant="link"
                className="h-auto justify-start p-0"
                onClick={() => {
                  setCustom(true)
                  setRelation('')
                }}
              >
                使用自定义权限类型
              </Button>
            </div>
          )}
        </FormField>
      </div>
    </Dialog>
  )
}

export interface PermissionsGraphProps {
  appId: string
  appName?: string
  appLogoUrl?: string
  data: ApplicationServiceRelation[]
  services?: Service[]
  className?: string
  onRelationsChange?: () => void
}

const NODE_GAP_Y = 110

function PermissionsGraphInner({
  appId,
  appName,
  appLogoUrl,
  data,
  services: suppliedServices,
  className,
  onRelationsChange,
}: PermissionsGraphProps) {
  const domainId = useDomainId()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingAdds, setPendingAdds] = useState<{ serviceId: string; relation: string }[]>([])
  const [pendingDeletes, setPendingDeletes] = useState<{ serviceId: string; relation: string }[]>(
    []
  )
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const isDirty = Boolean(pendingAdds.length || pendingDeletes.length)

  const { data: serviceResponse } = useRequest(
    () =>
      collectCursorPages(token => serviceApi.getList(domainId!, undefined, { token, size: 100 })),
    { ready: Boolean(domainId && !suppliedServices) }
  )
  const services = useMemo(
    () => suppliedServices ?? serviceResponse ?? [],
    [serviceResponse, suppliedServices]
  )
  const serviceMap = useMemo(
    () => new Map(services.map(service => [service.service_id, service])),
    [services]
  )

  const mergedData = useMemo(() => {
    const relations = new Map<string, Set<string>>(
      data.map(item => [item.service_id, new Set(item.relations)])
    )
    pendingAdds.forEach(item => {
      if (!relations.has(item.serviceId)) relations.set(item.serviceId, new Set())
      relations.get(item.serviceId)?.add(item.relation)
    })
    pendingDeletes.forEach(item => relations.get(item.serviceId)?.delete(item.relation))
    return [...relations]
      .filter(([, values]) => values.size)
      .map(([service_id, values]) => ({
        service_id,
        relations: [...values],
        pending: pendingAdds.some(item => item.serviceId === service_id),
      }))
  }, [data, pendingAdds, pendingDeletes])

  const deleteRelation = useCallback(
    (serviceId: string, relation: string) => {
      if (pendingAdds.some(item => item.serviceId === serviceId && item.relation === relation))
        setPendingAdds(current =>
          current.filter(item => item.serviceId !== serviceId || item.relation !== relation)
        )
      else
        setPendingDeletes(current =>
          current.some(item => item.serviceId === serviceId && item.relation === relation)
            ? current
            : [...current, { serviceId, relation }]
        )
    },
    [pendingAdds]
  )

  useEffect(() => {
    if (!mergedData.length) {
      setNodes([])
      setEdges([])
      return
    }
    const appY = ((mergedData.length - 1) * NODE_GAP_Y) / 2
    const nextNodes: Node[] = [
      {
        id: `app:${appId}`,
        type: 'app',
        position: { x: 50, y: appY },
        data: { appId, name: appName || appId, logoUrl: appLogoUrl } as AppNodeData,
      },
    ]
    const nextEdges: Edge[] = []
    mergedData.forEach((item, index) => {
      const service = serviceMap.get(item.service_id)
      nextNodes.push({
        id: `service:${item.service_id}`,
        type: 'service',
        position: { x: 500, y: index * NODE_GAP_Y },
        data: {
          serviceId: item.service_id,
          name: service?.name || item.service_id,
        } as ServiceNodeData,
      })
      nextEdges.push({
        id: `edge:${appId}-${item.service_id}`,
        source: `app:${appId}`,
        target: `service:${item.service_id}`,
        type: 'permission',
        data: {
          relations: item.relations,
          serviceId: item.service_id,
          isPending: item.pending,
          onDeleteRelation: deleteRelation,
        } as PermissionEdgeData,
      })
    })
    setNodes(nextNodes)
    setEdges(nextEdges)
  }, [appId, appLogoUrl, appName, deleteRelation, mergedData, serviceMap, setEdges, setNodes])

  const addPermission = (serviceId: string, relation: string) => {
    if (
      mergedData.some(item => item.service_id === serviceId && item.relations.includes(relation))
    ) {
      toast.warning('该权限已存在')
      return
    }
    setPendingAdds(current => [...current, { serviceId, relation }])
    setDialogOpen(false)
  }
  const reset = () => {
    setPendingAdds([])
    setPendingDeletes([])
  }
  const save = async () => {
    if (!domainId) return
    setSaving(true)
    try {
      const changedIds = new Set([
        ...pendingAdds.map(item => item.serviceId),
        ...pendingDeletes.map(item => item.serviceId),
      ])
      await Promise.all(
        [...changedIds].map(serviceId =>
          serviceApi.setServiceAppRelations(
            domainId,
            serviceId,
            appId,
            mergedData.find(item => item.service_id === serviceId)?.relations ?? []
          )
        )
      )
      reset()
      onRelationsChange?.()
      toast.success('权限关系已保存')
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={`${styles.graphWrapper} ${isFullscreen ? styles.fullscreen : ''} ${className ?? ''}`}
    >
      <div className={styles.graphToolbar}>
        <div className={styles.toolbarLeft}>
          <strong className={styles.toolbarTitle}>权限关系图</strong>
          <Tag type="info">{mergedData.length} 个服务</Tag>
        </div>
        <div className={styles.toolbarRight}>
          <Button type="button" size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <Plus />
            添加权限
          </Button>
          {isDirty ? (
            <Button type="button" size="sm" variant="outline" onClick={reset}>
              <RefreshCw />
              重置
            </Button>
          ) : null}
          <Button type="button" size="sm" disabled={!isDirty || saving} onClick={() => void save()}>
            {saving ? <LoaderCircle className="animate-spin" /> : <Save />}保存
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={isFullscreen ? '退出全屏' : '全屏'}
            title={isFullscreen ? '退出全屏' : '全屏'}
            onClick={() => setIsFullscreen(value => !value)}
          >
            {isFullscreen ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </div>
      </div>
      <div
        className={styles.graphCanvas}
        style={
          isFullscreen ? undefined : { height: Math.max(320, mergedData.length * NODE_GAP_Y + 80) }
        }
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          panOnScroll
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          minZoom={0.4}
          maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} />
          <ArrowDefs />
        </ReactFlow>
      </div>
      <AddPermissionDialog
        open={dialogOpen}
        services={services}
        onConfirm={addPermission}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  )
}

export const PermissionsGraph = memo(function PermissionsGraph(props: PermissionsGraphProps) {
  return (
    <ReactFlowProvider>
      <PermissionsGraphInner {...props} />
    </ReactFlowProvider>
  )
})
