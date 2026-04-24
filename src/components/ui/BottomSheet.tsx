import type { PropsWithChildren, ReactNode } from 'react'

import { AnimatedSheet } from '../motion/AnimatedSheet'

type BottomSheetProps = PropsWithChildren<{
  actions?: ReactNode
  description?: string
  onClose: () => void
  open: boolean
  title: string
}>

export function BottomSheet({
  actions,
  children,
  description,
  onClose,
  open,
  title,
}: BottomSheetProps) {
  return (
    <AnimatedSheet
      actions={actions}
      description={description}
      onClose={onClose}
      open={open}
      title={title}
    >
      {children}
    </AnimatedSheet>
  )
}
