import { useParams } from 'react-router-dom'

import { ExerciseRecordDetailPage } from './exercise-records/ExerciseRecordDetailPage'
import { ExerciseModelFormPage } from './exercise-records/ExerciseModelFormPage'
import { ExerciseRecordsListPage } from './exercise-records/ExerciseRecordsListPage'

export function ExerciseRecordsPage() {
  const { catalogProfileAction, profileId } = useParams()

  if (catalogProfileAction === 'new') {
    return <ExerciseModelFormPage mode="new" profileId={null} />
  }

  if (catalogProfileAction) {
    const decodedAction = decodeURIComponent(catalogProfileAction)
    if (decodedAction.startsWith('change:')) {
      const changeTarget = decodedAction.slice('change:'.length)
      const targetProfileId = changeTarget.includes(':') ? changeTarget : `catalog:${changeTarget}`
      return <ExerciseModelFormPage mode="edit" profileId={targetProfileId} />
    }
  }

  if (profileId) {
    return <ExerciseRecordDetailPage profileId={decodeURIComponent(profileId)} />
  }

  return <ExerciseRecordsListPage />
}
