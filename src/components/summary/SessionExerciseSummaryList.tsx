import { Link } from 'react-router-dom'
import type { SessionSummaryDetail } from '../../db/sessions'
import type { SetRecord } from '../../models/types'

type SessionExerciseSummaryListProps = {
  detail: SessionSummaryDetail | null
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(/\.0$/, '')
}

function formatSetRecordValue(setRecord: SetRecord) {
  if (setRecord.weightKg === null && setRecord.reps === null) {
    return '已完成'
  }

  if (setRecord.weightKg !== null && setRecord.reps !== null) {
    return `${formatNumber(setRecord.weightKg)}kg × ${setRecord.reps}`
  }

  if (setRecord.weightKg !== null) {
    return `${formatNumber(setRecord.weightKg)}kg`
  }

  return `${setRecord.reps} 次`
}

function getRecordSummary(setRecords: SetRecord[]) {
  const weights = setRecords
    .map((setRecord) => setRecord.weightKg)
    .filter((weightKg): weightKg is number => weightKg !== null)
  const reps = setRecords
    .map((setRecord) => setRecord.reps)
    .filter((repCount): repCount is number => repCount !== null)
  const parts: string[] = []

  if (weights.length > 0) {
    parts.push(`最高 ${formatNumber(Math.max(...weights))}kg`)
  }

  if (reps.length > 0) {
    parts.push(`共 ${reps.reduce((acc, repCount) => acc + repCount, 0)} 次`)
  }

  return parts.join(' · ')
}

export function SessionExerciseSummaryList({ detail }: SessionExerciseSummaryListProps) {
  if (!detail) {
    return null
  }

  if (detail.exercises.length === 0) {
    return (
      <div className="mx-4 mt-8">
        <p className="text-[var(--on-surface-variant)]">
          还没有训练记录。完成一组后，这里会生成训练总结。
        </p>
      </div>
    )
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="text-[16px] font-bold text-[var(--on-surface)]">动作完成</h2>
        <span className="text-[12px] font-medium text-[var(--on-surface-variant)]">
          {detail.exercises.length} 个动作
        </span>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {detail.exercises.map((exercise) => {
          const recordSummary = getRecordSummary(exercise.setRecords)

          return (
            <details
              key={exercise.id}
              className="group rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]"
            >
              <summary className="list-none cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-[16px] font-bold text-[var(--on-surface)]">
                      {exercise.name}
                    </h4>
                    <p className="mt-1 text-[13px] font-medium text-[var(--primary)]">
                      {exercise.completedSets} 组完成
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-[var(--primary-container)] px-3 py-1 text-[12px] font-semibold text-[var(--on-primary-container)]">
                    {exercise.completedSets} 组
                  </span>
                </div>

                {recordSummary ? (
                  <p className="mt-3 text-[13px] leading-5 text-[var(--on-surface-variant)]">
                    {recordSummary}
                  </p>
                ) : null}
              </summary>

              <div className="mt-4 border-t border-[var(--outline-variant)]/20 pt-3">
                {exercise.setRecords.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {exercise.setRecords.map((setRecord) => (
                      <div key={setRecord.id} className="flex items-center text-[14px]">
                        <div className="w-14 text-[var(--on-surface-variant)]">
                          第 {setRecord.setNumber} 组
                        </div>
                        <div className="flex-1 pl-4 font-medium text-[var(--on-surface)]">
                          {formatSetRecordValue(setRecord)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-[var(--on-surface-variant)]">还没有完成组记录</p>
                )}
              </div>
            </details>
          )
        })}
      </div>

      <div className="mt-8 px-4 pb-12 flex justify-center">
        <Link 
          to="/" 
          className="inline-flex h-12 w-full max-w-[200px] items-center justify-center rounded-xl bg-[var(--surface-container)] text-[15px] font-medium text-[var(--on-surface)] transition-colors tap-highlight-transparent active:scale-[0.98]"
        >
          返回今日安排
        </Link>
      </div>
    </section>
  )
}
