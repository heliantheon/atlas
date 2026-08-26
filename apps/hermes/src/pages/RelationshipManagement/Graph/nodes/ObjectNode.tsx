import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Button } from '@heliannuuthus/ui'
import { Database, Trash2 } from 'lucide-react'
import { useGraphContext } from '../context/GraphContext'
import styles from '../index.module.scss'

export interface ObjectNodeData {
  type: string // 自定义对象类型
  id: string
  label?: string
}

function ObjectNodeComponent({ id, data, selected }: NodeProps<ObjectNodeData>) {
  const { deleteNode } = useGraphContext()

  return (
    <div
      className={styles.objectNode}
      style={{
        borderColor: selected ? '#a3a3a3' : '#e5e5e5',
        boxShadow: selected ? '0 0 0 2px rgba(140, 140, 140, 0.2)' : undefined,
      }}
    >
      {/* 输入 Handle（左侧） */}
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={{ backgroundColor: '#a3a3a3' }}
      />

      {/* 节点头部 */}
      <div className={styles.nodeHeader} style={{ borderBottomColor: '#f0f0f0' }}>
        <span className={styles.nodeIcon} style={{ color: '#a3a3a3' }}>
          <Database />
        </span>
        <span className={styles.nodeType}>{data.type}</span>
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

      {/* 输出 Handle（右侧）- 对象也可以作为源 */}
      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        style={{ backgroundColor: '#a3a3a3' }}
      />
    </div>
  )
}

export const ObjectNode = memo(ObjectNodeComponent)
