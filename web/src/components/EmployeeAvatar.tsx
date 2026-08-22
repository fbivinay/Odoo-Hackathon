import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { resolvePhotoUrl } from '@/lib/api'
import { cn } from '@/lib/utils'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('')
}

interface Props {
  name: string
  photoUrl?: string | null
  className?: string
  fallbackClassName?: string
}

export function EmployeeAvatar({ name, photoUrl, className, fallbackClassName }: Props) {
  const src = resolvePhotoUrl(photoUrl)
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className={cn('bg-indigo-100 font-medium text-indigo-700', fallbackClassName)}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
