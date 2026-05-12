import type { ExerciseCatalogReviewItem } from './types'

export const needsReview: ExerciseCatalogReviewItem[] = [
  {
    id: 'pecDeck',
    reason:
      'Confirm whether pec deck should remain separate from cable fly for progression tracking in the app.',
  },
  {
    id: 'cableFly',
    reason:
      'Confirm whether cable fly should remain separate from pec deck for progression tracking in the app.',
  },
  {
    id: 'facePull',
    reason:
      'Common face pull often includes rope and external rotation, while the ExRx closest match is cable rear delt row; confirm whether to keep as one app entry.',
  },
  {
    id: 'hangingLegRaise',
    reason:
      'Confirm whether hanging leg raise should stay primarily grouped as core when users perform it with more lower-body involvement.',
  },
  {
    id: 'invertedRow',
    reason:
      'Source equipment is empty and users may perform several bar heights or assistance levels; confirm reps remains the best default.',
  },
  {
    id: 'gluteKickback',
    reason:
      'Source entry is bodyweight glute kickback, while gym users may expect cable or machine kickback; confirm measurement type and naming.',
  },
  {
    id: 'seatedLegCurl',
    reason:
      'Confirm whether seated leg curl should stay separate from the existing generic leg curl profile for progression tracking.',
  },
  {
    id: 'cableInternalRotation',
    reason:
      'Rotator cuff isolation is mapped to shoulders with push movement pattern; confirm whether this should be tracked as a regular catalog action.',
  },
  {
    id: 'sidePlank',
    reason:
      'Source name is side bridge, while catalog name uses the more common side plank; confirm duration is the desired default.',
  },
]
