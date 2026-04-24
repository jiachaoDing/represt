import { DragOverlay } from '@dnd-kit/core'
import { createPortal } from 'react-dom'

import type { TemplateExercise } from '../../models/types'
import {
  verticalSortDropAnimation,
  verticalSortModifiers,
} from '../dnd/vertical-sortable-motion'
import { TemplateExerciseCard } from './TemplateExerciseCard'

type TemplateExerciseDragOverlayProps = {
  activeExercise: TemplateExercise | null
  activeExerciseIndex: number
}

export function TemplateExerciseDragOverlay({
  activeExercise,
  activeExerciseIndex,
}: TemplateExerciseDragOverlayProps) {
  const overlay = (
    <DragOverlay
      adjustScale={false}
      dropAnimation={verticalSortDropAnimation}
      modifiers={verticalSortModifiers}
    >
      {activeExercise ? (
        <div className="opacity-95">
          <TemplateExerciseCard
            exercise={activeExercise}
            index={activeExerciseIndex}
            isDragging
            isSubmitting
          />
        </div>
      ) : null}
    </DragOverlay>
  )

  return createPortal(overlay, document.body)
}
