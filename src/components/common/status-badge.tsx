import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  DiagnosticStatus,
  UserRole,
} from '@/types/database'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/constants/status'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants/roles'

interface StatusBadgeProps {
  status: ProjectStatus | TaskStatus | DiagnosticStatus
  type: 'project' | 'task' | 'diagnostic'
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const label = STATUS_LABELS[type][status]
  const colorClass = STATUS_COLORS[type][status]

  return (
    <Badge variant="secondary" className={cn('font-medium', colorClass)}>
      {label}
    </Badge>
  )
}

interface PriorityBadgeProps {
  priority: TaskPriority
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const label = STATUS_LABELS.priority[priority]
  const colorClass = STATUS_COLORS.priority[priority]

  return (
    <Badge variant="secondary" className={cn('font-medium', colorClass)}>
      {label}
    </Badge>
  )
}

interface RoleBadgeProps {
  role: UserRole
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const label = ROLE_LABELS[role]
  const colorClass = ROLE_COLORS[role]

  return (
    <Badge variant="secondary" className={cn('font-medium', colorClass)}>
      {label}
    </Badge>
  )
}
