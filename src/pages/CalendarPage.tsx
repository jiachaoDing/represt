import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { CalendarMonthGrid } from '../components/calendar/CalendarMonthGrid'
import { PageHeader } from '../components/ui/PageHeader'
import { getSessionSummaryDetailByDateKey } from '../db/sessions'
import { listTemplatesWithExercises, type TemplateWithExercises } from '../db/templates'
import { getTrainingCycle, getTrainingCycleDayForDate } from '../db/training-cycle'
import { useSessionDateKeys } from '../hooks/pages/useSessionDateKeys'
import {
  addMonthsToSessionDateKey,
  diffSessionDateKeys,
  formatSessionDateKey,
  getMonthCalendarDateCells,
  getTodaySessionDateKey,
  isSessionDateKey,
} from '../lib/session-date-key'
import type { TrainingCycle } from '../models/types'

function buildSummaryPath(dateKey: string) {
  return `/summary?date=${dateKey}`
}

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const todayDateKey = getTodaySessionDateKey()
  const selectedDateKey = useMemo(() => {
    const currentDate = searchParams.get('date')
    return isSessionDateKey(currentDate) ? currentDate : todayDateKey
  }, [searchParams, todayDateKey])
  const [visibleMonthDateKey, setVisibleMonthDateKey] = useState(selectedDateKey)
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([])
  const [trainingCycle, setTrainingCycle] = useState<TrainingCycle | null>(null)
  const [selectedSummary, setSelectedSummary] =
    useState<Awaited<ReturnType<typeof getSessionSummaryDetailByDateKey>>>(null)
  const [isSelectedSummaryLoading, setIsSelectedSummaryLoading] = useState(true)
  const [detailError, setDetailError] = useState<string | null>(null)
  const { error, isLoading, sessionDateKeys } = useSessionDateKeys()
  const sessionDateKeySet = useMemo(() => new Set(sessionDateKeys), [sessionDateKeys])

  useEffect(() => {
    let isCancelled = false

    async function loadCalendarContext() {
      try {
        setDetailError(null)
        const [templateItems, cycle] = await Promise.all([
          listTemplatesWithExercises(),
          getTrainingCycle(),
        ])

        if (!isCancelled) {
          setTemplates(templateItems)
          setTrainingCycle(cycle)
        }
      } catch (loadError) {
        if (!isCancelled) {
          console.error(loadError)
          setDetailError('日程信息加载失败，请稍后重试。')
        }
      }
    }

    void loadCalendarContext()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function loadSelectedSummary() {
      try {
        setDetailError(null)
        setIsSelectedSummaryLoading(true)
        const detail = await getSessionSummaryDetailByDateKey(selectedDateKey)

        if (!isCancelled) {
          setSelectedSummary(detail)
        }
      } catch (loadError) {
        if (!isCancelled) {
          console.error(loadError)
          setDetailError('这天的训练详情加载失败，请稍后重试。')
          setSelectedSummary(null)
        }
      } finally {
        if (!isCancelled) {
          setIsSelectedSummaryLoading(false)
        }
      }
    }

    void loadSelectedSummary()

    return () => {
      isCancelled = true
    }
  }, [selectedDateKey])
  const monthLabel = formatSessionDateKey(visibleMonthDateKey, {
    year: 'numeric',
    month: 'long',
  })
  const selectedDateLabel = formatSessionDateKey(selectedDateKey, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
  const selectedFullDateLabel = formatSessionDateKey(selectedDateKey, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  const visibleMonthSessionCount = useMemo(() => {
    const visibleMonthPrefix = visibleMonthDateKey.slice(0, 7)
    return sessionDateKeys.filter((dateKey) => dateKey.startsWith(visibleMonthPrefix)).length
  }, [sessionDateKeys, visibleMonthDateKey])
  const selectedDateDistance = diffSessionDateKeys(selectedDateKey, todayDateKey)
  const selectedDateTone =
    selectedDateDistance === 0 ? '今天' : selectedDateDistance > 0 ? '未来日期' : '历史日期'
  const selectedDateHasSession = sessionDateKeySet.has(selectedDateKey)
  const selectedCycleDay = getTrainingCycleDayForDate(trainingCycle, selectedDateKey)
  const recordedTemplate = selectedSummary?.session.autoImportedTemplateId
    ? templates.find((template) => template.id === selectedSummary.session.autoImportedTemplateId) ?? null
    : null
  const plannedTemplate = selectedCycleDay?.slot.templateId
    ? templates.find((template) => template.id === selectedCycleDay.slot.templateId) ?? null
    : null
  const completedSetCount =
    selectedSummary?.exercises.reduce((sum, exercise) => sum + exercise.completedSets, 0) ?? 0
  const completedExerciseCount =
    selectedSummary?.exercises.filter((exercise) => exercise.completedSets > 0).length ?? 0
  const selectedTemplateLabel = selectedSummary
    ? recordedTemplate?.name ??
      (selectedSummary.session.autoImportedTemplateId ? '模板已删除' : '手动安排')
    : plannedTemplate?.name ?? (selectedCycleDay ? '休息日' : '未设置循环')
  const selectedDateSummary = selectedDateHasSession
    ? completedSetCount > 0
      ? `已完成 ${completedSetCount} 组，来自 ${completedExerciseCount} 个动作。`
      : '这天已有训练记录，还没有完成组。'
    : selectedDateDistance > 0
      ? plannedTemplate
        ? `预计训练：${plannedTemplate.exercises.length} 个动作。`
        : selectedCycleDay
          ? '循环日程安排为休息日。'
          : '这天还没有训练记录。'
      : '这天没有训练记录。'
  const calendarCells = useMemo(
    () => getMonthCalendarDateCells(visibleMonthDateKey),
    [visibleMonthDateKey],
  )

  function handleSelectDate(dateKey: string) {
    setSearchParams({ date: dateKey })

    if (dateKey.slice(0, 7) !== visibleMonthDateKey.slice(0, 7)) {
      setVisibleMonthDateKey(dateKey)
    }
  }

  return (
    <div className="pb-4">
      <PageHeader
        title="训练日历"
        subtitle={selectedDateLabel}
        backFallbackTo={buildSummaryPath(selectedDateKey)}
      />

      <section className="mx-4 mt-4 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setVisibleMonthDateKey(addMonthsToSessionDateKey(visibleMonthDateKey, -1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"
            aria-label="上个月"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="text-center">
            <p className="text-[11px] text-[var(--on-surface-variant)]">月份</p>
            <p className="mt-1 text-[15px] font-semibold text-[var(--on-surface)]">{monthLabel}</p>
          </div>

          <button
            type="button"
            onClick={() => setVisibleMonthDateKey(addMonthsToSessionDateKey(visibleMonthDateKey, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"
            aria-label="下个月"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </section>

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      {detailError ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {detailError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mx-4 mt-4 h-[22rem] rounded-[1.5rem] bg-[var(--surface-container)] opacity-50 animate-pulse" />
      ) : (
        <CalendarMonthGrid
          cells={calendarCells}
          onSelectDate={handleSelectDate}
          selectedDateKey={selectedDateKey}
          sessionDateKeySet={sessionDateKeySet}
        />
      )}

      {!isLoading ? (
        <section className="mx-4 mt-4 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-5 py-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[var(--on-surface-variant)]">
                {selectedDateTone}
              </p>
              <h2 className="mt-1 text-[18px] font-bold text-[var(--on-surface)]">
                {selectedFullDateLabel}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--surface-container)] px-3 py-1 text-[12px] font-semibold text-[var(--on-surface-variant)]">
              本月 {visibleMonthSessionCount} 天
            </span>
          </div>

          <p className="mt-3 text-[13px] leading-5 text-[var(--on-surface-variant)]">
            {isSelectedSummaryLoading ? '正在加载这天的训练信息。' : selectedDateSummary}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-[var(--surface-container)] px-3 py-3">
              <p className="text-[11px] text-[var(--on-surface-variant)]">模板</p>
              <p className="mt-1 truncate text-[15px] font-bold text-[var(--on-surface)]">
                {selectedTemplateLabel}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-container)] px-3 py-3">
              <p className="text-[11px] text-[var(--on-surface-variant)]">完成组数</p>
              <p className="mt-1 text-[15px] font-bold text-[var(--on-surface)]">
                {isSelectedSummaryLoading ? '...' : `${completedSetCount} 组`}
              </p>
            </div>
          </div>

          <Link
            to={buildSummaryPath(selectedDateKey)}
            viewTransition
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--surface-container)] px-4 text-sm font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--outline-variant)]/20"
          >
            查看这天总结
          </Link>
        </section>
      ) : null}
    </div>
  )
}
