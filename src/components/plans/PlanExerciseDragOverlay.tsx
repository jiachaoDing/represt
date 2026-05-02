import { DragOverlay } from '@dnd-kit/core'
import { createPortal } from 'react-dom'

import type { PlanExercise } from '../../models/types'
import {
  verticalSortDropAnimation,
  verticalSortModifiers,
} from '../dnd/vertical-sortable-motion'
import { PlanExerciseCard } from './PlanExerciseCard'

type PlanExerciseDragOverlayProps = {
  activeExercise: PlanExercise | null
  activeExerciseIndex: number
}

export function PlanExerciseDragOverlay({
  activeExercise,
  activeExerciseIndex,
}: PlanExerciseDragOverlayProps) {
  const overlay = (
    <DragOverlay
      adjustScale={false}
      dropAnimation={verticalSortDropAnimation}
      modifiers={verticalSortModifiers}
    >
      {activeExercise ? (
        <div className="opacity-95">
          <PlanExerciseCard
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
