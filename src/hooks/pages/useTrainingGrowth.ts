import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import { db } from '../../db/app-db'
import type { GrowthSnapshot } from '../../lib/training-growth'

export function useTrainingGrowth() {
  const [snapshot, setSnapshot] = useState<GrowthSnapshot | null>(null)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const subscription = liveQuery(() => db.transaction('r',
      [db.workoutSessions, db.performedExercises, db.setRecords, db.planExercises, db.exerciseProfiles, db.workoutPlans, db.sessionPlanItems], async () => {
        const [sessions, exercises, records, plans, profiles, workoutPlans, sessionPlanItems] = await Promise.all([
          db.workoutSessions.toArray(), db.performedExercises.toArray(), db.setRecords.toArray(),
          db.planExercises.toArray(), db.exerciseProfiles.toArray(), db.workoutPlans.toArray(),
          db.sessionPlanItems.toArray(),
        ])
        return { sessions, exercises, records, plans, profiles, workoutPlans, sessionPlanItems }
      })).subscribe({ next: (value) => { setSnapshot(value); setError(false) }, error: () => setError(true) })
    return () => subscription.unsubscribe()
  }, [revision])
  return { snapshot, error, retry: () => { setError(false); setRevision((value) => value + 1) } }
}
