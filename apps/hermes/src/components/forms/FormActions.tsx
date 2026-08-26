import { LoaderCircle } from 'lucide-react'
import { Button } from '@heliannuuthus/ui'

export function FormActions({
  submitting,
  submitText = '提交',
  cancelText = '取消',
  onCancel,
}: {
  submitting?: boolean
  submitText?: string
  cancelText?: string
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Button type="submit" disabled={submitting}>
        {submitting ? <LoaderCircle className="animate-spin" /> : null}
        {submitText}
      </Button>
      <Button type="button" variant="outline" disabled={submitting} onClick={onCancel}>
        {cancelText}
      </Button>
    </div>
  )
}
