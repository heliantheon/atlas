import { memo } from 'react'
import { getBezierPath, EdgeLabelRenderer, type EdgeProps } from 'reactflow'
import { Button } from '@heliannuuthus/ui'
import { X, Clock } from 'lucide-react'
import { useGraphContext } from '../context/GraphContext'
import { isExpiringSoon } from '@atlas/shared'
import styles from '../index.module.scss'

export interface RelationEdgeData {
  relation: string
  expiresAt?: string
  isPending?: boolean // 是否为待保存的新关系
}

function RelationEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<RelationEdgeData>) {
  const { deleteEdge } = useGraphContext()

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const isExpiring = data?.expiresAt && isExpiringSoon(data.expiresAt)
  const isPending = data?.isPending

  // 边的颜色
  let strokeColor = '#a3a3a3'
  if (isExpiring) {
    strokeColor = '#d97706'
  } else if (isPending) {
    strokeColor = '#171717' // 待保存：虚线
  }

  return (
    <>
      {/* 边路径 */}
      <path
        id={id}
        className={styles.relationEdgePath}
        d={edgePath}
        stroke={strokeColor}
        strokeWidth={selected ? 2 : 1.5}
        strokeDasharray={isPending ? '5,5' : undefined}
        fill="none"
        markerEnd="url(#arrowhead)"
      />

      {/* 边标签 */}
      <EdgeLabelRenderer>
        <div
          className={styles.edgeLabelContainer}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          <div
            className={styles.edgeLabel}
            style={{
              borderColor: strokeColor,
              backgroundColor: isPending ? '#f5f5f5' : '#fff',
            }}
          >
            {isExpiring && <Clock className="mr-1 size-3 text-amber-600" aria-label="即将过期" />}
            <span>{data?.relation || 'relation'}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="删除关系"
              aria-label="删除关系"
              className={styles.edgeDeleteBtn}
              onClick={e => {
                e.stopPropagation()
                deleteEdge(id)
              }}
            >
              <X />
            </Button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const RelationEdge = memo(RelationEdgeComponent)

// 箭头定义（在 SVG defs 中使用）
export function EdgeArrowDefs() {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0 }}>
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#a3a3a3" />
        </marker>
      </defs>
    </svg>
  )
}
