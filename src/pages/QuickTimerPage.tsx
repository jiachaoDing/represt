import { useTranslation } from 'react-i18next'

import { ExerciseQuickTimer } from '../components/exercise/ExerciseQuickTimer'
import { PageHeader } from '../components/ui/PageHeader'

export function QuickTimerPage() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title={t('exercise.quickTimerTitle')} backFallbackTo="/" />
      <main className="flex min-h-0 flex-1 flex-col px-4">
        <ExerciseQuickTimer notificationPath="/quick-timer" />
      </main>
    </div>
  )
}
