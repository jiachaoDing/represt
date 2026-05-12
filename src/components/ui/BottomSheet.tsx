import type { PropsWithChildren, ReactNode } from 'react'

import { AnimatedSheet } from '../motion/AnimatedSheet'

type BottomSheetProps = PropsWithChildren<{
  actions?: ReactNode
  description?: string
  onClose: () => void
  open: boolean
  title: string
  variant?: 'default' | 'prominent'
}>

export function BottomSheet({
  actions,
  children,
  description,
  onClose,
  open,
  title,
  variant,
}: BottomSheetProps) {
  return (
    <AnimatedSheet
      actions={actions}
      description={description}
      onClose={onClose}
      open={open}
      title={title}
      variant={variant}
    >
      {children}
    </AnimatedSheet>
  )
}
