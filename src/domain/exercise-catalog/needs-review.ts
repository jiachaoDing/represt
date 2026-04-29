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
      'Muscle emphasis differs between hip-flexor leg raise and abdominal leg-hip raise; current mapping keeps both abs and hip flexors for conservative search/filter behavior.',
  },
]
