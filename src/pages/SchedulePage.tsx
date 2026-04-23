import { ScheduleExerciseList } from '../components/schedule/ScheduleExerciseList'
import { ScheduleSessionPanel } from '../components/schedule/ScheduleSessionPanel'
import { TemporaryExerciseForm } from '../components/schedule/TemporaryExerciseForm'
import { useNow } from '../hooks/useNow'
import { useSchedulePageData } from '../hooks/pages/useSchedulePageData'

export function SchedulePage() {
  const now = useNow()
  const {
    canAddTemporaryExercise,
    canChangeTemplate,
    currentSession,
    currentTemplate,
    error,
    handleAddTemporaryExercise,
    handleCreateOrRebuildSession,
    handleDeleteExercise,
    hasTemplates,
    isLoading,
    isSubmitting,
    needsRebuild,
    newExerciseDraft,
    selectedTemplateId,
    sessionActionLabel,
    setNewExerciseDraft,
    setSelectedTemplateId,
    templates,
  } = useSchedulePageData()

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <ScheduleSessionPanel
        canChangeTemplate={canChangeTemplate}
        currentSession={currentSession}
        currentTemplate={currentTemplate}
        hasTemplates={hasTemplates}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        needsRebuild={needsRebuild}
        selectedTemplateId={selectedTemplateId}
        sessionActionLabel={sessionActionLabel}
        setSelectedTemplateId={setSelectedTemplateId}
        templates={templates}
        onCreateOrRebuildSession={handleCreateOrRebuildSession}
      />

      <ScheduleExerciseList
        currentSession={currentSession}
        isSubmitting={isSubmitting}
        now={now}
        onDeleteExercise={handleDeleteExercise}
      />

      <TemporaryExerciseForm
        canAddTemporaryExercise={canAddTemporaryExercise}
        hasSession={currentSession !== null}
        isSubmitting={isSubmitting}
        newExerciseDraft={newExerciseDraft}
        setNewExerciseDraft={setNewExerciseDraft}
        onSubmit={handleAddTemporaryExercise}
      />
    </div>
  )
}
