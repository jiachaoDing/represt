import { Link } from 'react-router-dom'
import type { SessionSummaryDetail } from '../../db/sessions'
import {
  getCompletedAtLabel,
  getRepsLabel,
  getWeightLabel,
} from '../../lib/session-display'

type SessionExerciseSummaryListProps = {
  detail: SessionSummaryDetail | null
}

export function SessionExerciseSummaryList({ detail }: SessionExerciseSummaryListProps) {
  if (!detail) {
    return null
  }

  if (detail.exercises.length === 0) {
    return (
      <div className="mx-4 mt-8">
        <p className="text-[var(--on-surface-variant)]">这份训练还没有动作数据。</p>
      </div>
    )
  }

  return (
    <section className="mt-8">
      <div className="px-5 mb-4">
        <h3 className="text-base font-semibold text-[var(--on-surface)]">动作明细</h3>
      </div>
      
      <div className="flex flex-col border-y border-[var(--outline-variant)]">
        {detail.exercises.map((exercise, index) => (
          <div key={exercise.id} className={`px-5 py-5 ${index !== 0 ? 'border-t border-[var(--outline-variant)]' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-[17px] font-medium text-[var(--on-surface)]">{exercise.name}</h4>
                <p className="mt-0.5 text-sm text-[var(--on-surface-variant)]">
                  已完成 {exercise.completedSets} 组
                </p>
              </div>
            </div>

            {exercise.setRecords.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-[var(--outline-variant)] bg-[var(--surface)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--surface-container)] text-[var(--on-surface-variant)]">
                    <tr>
                      <th className="px-4 py-2 font-medium w-16">组次</th>
                      <th className="px-4 py-2 font-medium">重量</th>
                      <th className="px-4 py-2 font-medium">次数</th>
                      <th className="px-4 py-2 font-medium text-right">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--outline-variant)]">
                    {exercise.setRecords.map((setRecord) => (
                      <tr key={setRecord.id} className="text-[var(--on-surface)]">
                        <td className="px-4 py-2.5 font-medium text-[var(--on-surface-variant)]">{setRecord.setNumber}</td>
                        <td className="px-4 py-2.5">{getWeightLabel(setRecord.weightKg)}</td>
                        <td className="px-4 py-2.5">{getRepsLabel(setRecord.reps)}</td>
                        <td className="px-4 py-2.5 text-right text-[var(--on-surface-variant)]">{getCompletedAtLabel(setRecord.completedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--outline)]">没有记录数据</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 px-4 pb-12 flex justify-center">
        <Link 
          to="/" 
          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--outline)] px-6 text-sm font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"
        >
          返回今日安排
        </Link>
      </div>
    </section>
  )
}
