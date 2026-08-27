import { useRef, useState } from 'react'
import { Button, Empty, Input, Spinner, Tag, toast } from '@heliannuuthus/ui'
import { Check, Clipboard, CloudUpload, File, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { chaosStorageApi, type FileUploadResult } from '@/services'
import styles from './index.module.scss'

type UploadStatus = 'queued' | 'uploading' | 'complete' | 'failed'

interface UploadTask {
  id: string
  file: File
  status: UploadStatus
  result?: FileUploadResult
  error?: string
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = units[0]
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024
    unit = units[index]
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`
}

export function FileManagement() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [path, setPath] = useState('')
  const [prefix, setPrefix] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [tasks, setTasks] = useState<UploadTask[]>([])

  const updateTask = (id: string, update: Partial<UploadTask>) => {
    setTasks(current => current.map(task => (task.id === id ? { ...task, ...update } : task)))
  }

  const uploadTask = async (task: UploadTask) => {
    updateTask(task.id, { status: 'uploading', error: undefined })
    try {
      const result = await chaosStorageApi.upload(task.file, {
        path: path.trim() || undefined,
        prefix: prefix.trim() || undefined,
      })
      updateTask(task.id, { status: 'complete', result })
    } catch (error) {
      updateTask(task.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : '上传失败',
      })
    }
  }

  const enqueue = (files: FileList | File[]) => {
    const next = Array.from(files).map(file => ({
      id: `${file.name}:${file.size}:${file.lastModified}:${crypto.randomUUID()}`,
      file,
      status: 'queued' as const,
    }))
    if (next.length === 0) return
    setTasks(current => [...next, ...current])
    void Promise.all(next.map(uploadTask))
  }

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value)
    toast.success('公开链接已复制')
  }

  const completed = tasks.filter(task => task.status === 'complete').length
  const active = tasks.filter(
    task => task.status === 'uploading' || task.status === 'queued'
  ).length

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.kicker}>OBJECT DELIVERY / PRESIGNED PUT</span>
          <h1>对象上传台</h1>
          <p>由 Chaos 签发短时上传地址，文件直接进入对象存储，不经过应用服务器。</p>
        </div>
        <div className={styles.assurance}>
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>直传已启用</strong>
            <span>凭证不会暴露给浏览器</span>
          </div>
        </div>
      </header>

      <section className={styles.controls} aria-labelledby="upload-routing-title">
        <div className={styles.sectionHeading}>
          <span>01</span>
          <div>
            <h2 id="upload-routing-title">确定对象位置</h2>
            <p>路径和前缀均可留空，由后端生成安全对象键。</p>
          </div>
        </div>
        <div className={styles.fields}>
          <label>
            <span>路径</span>
            <Input
              value={path}
              onChange={event => setPath(event.target.value)}
              placeholder="assets/brand"
              disabled={active > 0}
            />
            <small>用于组织对象目录，不需要包含文件名。</small>
          </label>
          <label>
            <span>键前缀</span>
            <Input
              value={prefix}
              onChange={event => setPrefix(event.target.value)}
              placeholder="atlas"
              disabled={active > 0}
            />
            <small>最多 64 个字符，用于区分来源或环境。</small>
          </label>
        </div>
      </section>

      <section className={styles.uploadSection} aria-labelledby="upload-files-title">
        <div className={styles.sectionHeading}>
          <span>02</span>
          <div>
            <h2 id="upload-files-title">选择并上传文件</h2>
            <p>可以一次选择多个文件；离开页面前请保存返回的公开链接。</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          className={styles.fileInput}
          type="file"
          multiple
          onChange={event => {
            if (event.target.files) enqueue(event.target.files)
            event.target.value = ''
          }}
        />
        <button
          type="button"
          className={styles.dropzone}
          data-active={dragActive}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={event => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragOver={event => event.preventDefault()}
          onDragLeave={event => {
            if (event.currentTarget === event.target) setDragActive(false)
          }}
          onDrop={event => {
            event.preventDefault()
            setDragActive(false)
            enqueue(event.dataTransfer.files)
          }}
        >
          <span className={styles.uploadIcon}>
            <CloudUpload aria-hidden="true" />
          </span>
          <strong>拖入文件，或点击选择</strong>
          <span>上传地址默认短时有效，队列会立即开始。</span>
        </button>
      </section>

      <section className={styles.queue} aria-labelledby="upload-queue-title" aria-live="polite">
        <div className={styles.queueHeader}>
          <div>
            <span className={styles.kicker}>CURRENT SESSION</span>
            <h2 id="upload-queue-title">上传队列</h2>
          </div>
          <div className={styles.queueStats}>
            <span>{active} 进行中</span>
            <span>{completed} 已完成</span>
          </div>
        </div>

        {tasks.length === 0 ? (
          <Empty title="还没有上传任务" description="选择文件后，进度和公开链接会显示在这里。" />
        ) : (
          <div className={styles.taskList}>
            {tasks.map(task => (
              <article key={task.id} className={styles.task} data-status={task.status}>
                <span className={styles.fileIcon}>
                  <File aria-hidden="true" />
                </span>
                <div className={styles.taskBody}>
                  <div className={styles.taskTitle}>
                    <strong>{task.file.name}</strong>
                    <span>{formatSize(task.file.size)}</span>
                  </div>
                  {task.status === 'complete' && task.result ? (
                    <button
                      type="button"
                      className={styles.publicUrl}
                      onClick={() => void copy(task.result!.public_url)}
                      title="复制公开链接"
                    >
                      {task.result.public_url}
                    </button>
                  ) : null}
                  {task.status === 'failed' ? <p className={styles.error}>{task.error}</p> : null}
                  {task.status === 'uploading' ? <p>正在直传对象存储…</p> : null}
                  {task.status === 'queued' ? <p>等待签发上传地址…</p> : null}
                </div>
                <div className={styles.taskActions}>
                  {task.status === 'uploading' || task.status === 'queued' ? <Spinner /> : null}
                  {task.status === 'complete' ? (
                    <>
                      <Tag type="success">
                        <Check data-icon="inline-start" />
                        完成
                      </Tag>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`复制 ${task.file.name} 的公开链接`}
                        onClick={() => void copy(task.result!.public_url)}
                      >
                        <Clipboard aria-hidden="true" />
                      </Button>
                    </>
                  ) : null}
                  {task.status === 'failed' ? (
                    <Button variant="outline" size="sm" onClick={() => void uploadTask(task)}>
                      <RefreshCw aria-hidden="true" /> 重试
                    </Button>
                  ) : null}
                  {task.status !== 'uploading' && task.status !== 'queued' ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`从队列移除 ${task.file.name}`}
                      onClick={() =>
                        setTasks(current => current.filter(item => item.id !== task.id))
                      }
                    >
                      <X aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
