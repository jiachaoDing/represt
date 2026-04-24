import { DragOverlay } from '@dnd-kit/core'

import type { TemplateExercise } from '../../models/types'
import { TemplateExerciseCard } from './TemplateExerciseCard'

type TemplateExerciseDragOverlayProps = {
  activeExercise: TemplateExercise | null
  activeExerciseIndex: number
}

export function TemplateExerciseDragOverlay({
  activeExercise,
  activeExerciseIndex,
}: TemplateExerciseDragOverlayProps) {
  return (
    <DragOverlay>
      {activeExercise ? (
        <div className="rotate-[0.4deg] scale-[1.02]">
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
}
