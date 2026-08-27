import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Button } from '@heliannuuthus/ui'
import { User, Users, Boxes, Trash2 } from 'lucide-react'
import { useGraphContext } from '../context/GraphContext'
import styles from '../index.module.scss'

export interface SubjectNodeData {
  type: 'user' | 'group' | 'application'
  id: string
  label?: string
}

const typeConfig = {
  user: {
    icon: <User />,
    label: 'user',
    color: '#171717',
  },
  group: {
    icon: <Users />,
    label: 'group',
    color: '#4d7c0f',
  },
  application: {
    icon: <Boxes />,
    label: 'application',
    color: '#b94e20',
  },
}

function SubjectNodeComponent({ id, data, selected }: NodeProps<SubjectNodeData>) {
  const { deleteNode } = useGraphContext()
  const config = typeConfig[data.type]

  return (
    <div
      className={styles.subjectNode}
      style={{
        borderColor: selected ? config.color : '#e5e5e5',
        boxShadow: selected ? `0 0 0 2px ${config.color}20` : undefined,
      }}
    >
      {/* 输入 Handle（左侧） */}
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={{ backgroundColor: config.color }}
      />

      {/* 节点头部 */}
      <div className={styles.nodeHeader} style={{ borderBottomColor: `${config.color}20` }}>
        <span className={styles.nodeIcon} style={{ color: config.color }}>
          {config.icon}
        </span>
        <span className={styles.nodeType}>{config.label}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="删除节点"
          aria-label="删除节点"
          className={styles.deleteBtn}
          onClick={e => {
            e.stopPropagation()
            deleteNode(id)
          }}
        >
          <Trash2 />
        </Button>
      </div>

      {/* 节点内容 */}
      <div className={styles.nodeContent}>
        <span className={styles.nodeId} title={data.id}>
          {data.label || data.id}
        </span>
      </div>

      {/* 输出 Handle（右侧） */}
      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        style={{ backgroundColor: config.color }}
      />
    </div>
  )
}

export const SubjectNode = memo(SubjectNodeComponent)
