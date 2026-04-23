import { useParams } from 'react-router-dom'

import { ExerciseOverview } from '../components/exercise/ExerciseOverview'
import { LatestSetRecordPanel } from '../components/exercise/LatestSetRecordPanel'
import { useNow } from '../hooks/useNow'
import { useExercisePageData } from '../hooks/pages/useExercisePageData'

export function ExercisePage() {
  const { id = 'unknown' } = useParams()
  const now = useNow()
  const {
    canCompleteSet,
    detail,
    error,
    handleCompleteSet,
    handleUpdateLatestSetRecord,
    isLoading,
    isSubmitting,
    latestSetRecord,
    repsInput,
    setRepsInput,
    setWeightInput,
    timingStartedAt,
    weightInput,
  } = useExercisePageData(id)

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <ExerciseOverview
        canCompleteSet={canCompleteSet}
        detail={detail}
        isLoading={isLoading}
        now={now}
        timingStartedAt={timingStartedAt}
        onCompleteSet={handleCompleteSet}
      />

      <LatestSetRecordPanel
        detail={detail}
        isSubmitting={isSubmitting}
        latestSetRecord={latestSetRecord}
        repsInput={repsInput}
        setRepsInput={setRepsInput}
        setWeightInput={setWeightInput}
        weightInput={weightInput}
        onSubmit={handleUpdateLatestSetRecord}
      />
    </div>
  )
}
