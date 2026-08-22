import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  icon: LucideIcon
  line: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, line, actionLabel, onAction }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="rounded-full bg-zinc-100 p-3">
        <Icon className="size-5 text-zinc-500" />
      </div>
      <p className="text-sm text-muted-foreground">{line}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
