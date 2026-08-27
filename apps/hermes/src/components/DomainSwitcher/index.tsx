import { useMemo, useState } from 'react'
import { useRequest } from 'ahooks'
import { Check, ChevronDown, LoaderCircle, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Button,
  Dialog,
  DropdownMenu,
  type DropdownMenuEntry,
  Spinner,
  toast,
} from '@heliannuuthus/ui'
import { domainApi } from '@/services'
import type { Domain } from '@/types'
import { DomainDialog, type DomainDialogState } from './DomainDialog'
import styles from './index.module.scss'

interface DomainSwitcherProps {
  currentDomainId: string
}

export function DomainSwitcher({ currentDomainId }: DomainSwitcherProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [managing, setManaging] = useState(false)
  const [dialogState, setDialogState] = useState<DomainDialogState>(null)
  const [pendingDelete, setPendingDelete] = useState<Domain | null>(null)
  const [deleting, setDeleting] = useState(false)
  const {
    data: domains = [],
    loading,
    refresh,
    mutate,
  } = useRequest(domainApi.getList, {
    onError: error => toast.error(error.message || '域列表加载失败'),
  })

  const currentDomain = useMemo(
    () => domains.find(domain => domain.domain_id === currentDomainId),
    [currentDomainId, domains]
  )

  const getDomainPath = (domainId: string) => {
    const currentPrefix = `/d/${encodeURIComponent(currentDomainId)}`
    const suffix = location.pathname.startsWith(currentPrefix)
      ? location.pathname.slice(currentPrefix.length)
      : ''
    return `/d/${encodeURIComponent(domainId)}${suffix}${location.search}`
  }

  const switchDomain = (domain: Domain) => {
    navigate(getDomainPath(domain.domain_id))
    setOpen(false)
  }

  const openDialog = (nextState: Exclude<DomainDialogState, null>) => {
    setOpen(false)
    setManaging(false)
    setDialogState(nextState)
  }

  const handleSaved = (domain: Domain, mode: 'create' | 'edit') => {
    refresh()
    if (mode === 'create') navigate(`/d/${encodeURIComponent(domain.domain_id)}`)
  }

  const deleteDomain = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await domainApi.delete(pendingDelete.domain_id)
      const remainingDomains = await domainApi.getList()
      mutate(remainingDomains)
      toast.success('域已删除')
      setPendingDelete(null)

      if (pendingDelete.domain_id === currentDomainId) {
        const nextDomain = remainingDomains[0]
        navigate(nextDomain ? getDomainPath(nextDomain.domain_id) : '/')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除域失败')
    } finally {
      setDeleting(false)
    }
  }

  const menuItems: DropdownMenuEntry[] = loading
    ? [{ label: '正在加载域…', disabled: true, icon: <Spinner aria-hidden="true" /> }]
    : domains.length === 0
      ? [
          { label: '暂无可用域', disabled: true },
          { type: 'separator' },
          { label: '创建域', icon: <Plus />, onSelect: () => openDialog({ mode: 'create' }) },
        ]
      : managing
        ? [
            { type: 'label', label: `管理域 · ${domains.length}` },
            ...domains.map(domain => ({
              label: domain.name || domain.domain_id,
              icon: domain.domain_id === currentDomainId ? <Check /> : undefined,
              children: [
                {
                  label: '编辑',
                  icon: <Pencil />,
                  onSelect: () => openDialog({ mode: 'edit', domain }),
                },
                {
                  label: '删除',
                  icon: <Trash2 />,
                  destructive: true,
                  onSelect: () => {
                    setOpen(false)
                    setManaging(false)
                    setPendingDelete(domain)
                  },
                },
              ],
            })),
            { type: 'separator' },
            { label: '新增域', icon: <Plus />, onSelect: () => openDialog({ mode: 'create' }) },
            { label: '完成管理', icon: <X />, onSelect: () => setManaging(false) },
          ]
        : [
            { type: 'label', label: `切换域 · ${domains.length}` },
            ...domains.map(domain => ({
              label: domain.name || domain.domain_id,
              icon: domain.domain_id === currentDomainId ? <Check /> : undefined,
              onSelect: () => switchDomain(domain),
            })),
            { type: 'separator' },
            { label: '管理域', icon: <Settings2 />, onSelect: () => setManaging(true) },
          ]

  return (
    <>
      <DropdownMenu
        open={open}
        onOpenChange={nextOpen => {
          setOpen(nextOpen)
          if (!nextOpen) setManaging(false)
        }}
        trigger={
          <Button
            type="button"
            variant="ghost"
            className={styles.trigger}
            aria-label={`Hermes 管理后台，当前域：${currentDomain?.name ?? currentDomainId}，切换域`}
          >
            <span className={styles.triggerName}>Hermes 管理后台</span>
            <ChevronDown className={styles.chevron} aria-hidden="true" />
          </Button>
        }
        items={menuItems}
        align="start"
        classNames={{ content: styles.menu }}
      />

      <DomainDialog
        state={dialogState}
        onOpenChange={dialogOpen => !dialogOpen && setDialogState(null)}
        onSaved={handleSaved}
      />

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={open => !open && setPendingDelete(null)}
        title="删除域"
        description={`确定删除“${pendingDelete?.name || pendingDelete?.domain_id || ''}”？域内应用、服务和配置将一并删除，此操作无法撤销。`}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
            >
              取消
            </Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={deleteDomain}>
              {deleting ? <LoaderCircle className={styles.spinner} aria-hidden="true" /> : null}
              删除域
            </Button>
          </>
        }
      />
    </>
  )
}
