import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'

import { BottomSheet } from '../components/ui/BottomSheet'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PageHeader } from '../components/ui/PageHeader'
import { Snackbar } from '../components/ui/Snackbar'
import { TrainingCyclePageLoading } from '../components/training-cycle/TrainingCyclePageLoading'
import { useSnackbarMessage } from '../hooks/useSnackbarMessage'
import { useTrainingCyclePageData } from '../hooks/pages/useTrainingCyclePageData'
import { addDaysToSessionDateKey, formatSessionDateKey } from '../lib/session-date-key'
import { getTemplateColor } from '../lib/template-color'

type OptionIconProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

function OptionIcon({ children, className = '', style }: OptionIconProps) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${className}`}
      style={style}
    >
      {children}
    </span>
  )
}

function RestIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.4 15.2A8 8 0 0 1 8.8 3.6 8.5 8.5 0 1 0 20.4 15.2z" />
    </svg>
  )
}

function TemplateIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 7h12M6 12h12M6 17h8" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7h.01M4 12h.01M4 17h.01" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 7h12" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 7V5h4v2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10l.5 8h7l.5-8" />
    </svg>
  )
}

function getCycleSlotDateKey(anchorDateKey: string, anchorIndex: number, slotIndex: number) {
  return addDaysToSessionDateKey(anchorDateKey, slotIndex - anchorIndex)
}

function getWeekdayLabel(sessionDateKey: string) {
  return formatSessionDateKey(sessionDateKey, { weekday: 'short' })
}

export function TrainingCyclePage() {
  const {
    error,
    handleAddSlot,
    handleAssignTemplate,
    handleCalibrateToday,
    handleRemoveSlot,
    isLoading,
    isSubmitting,
    templates,
    todayCycleDay,
    trainingCycle,
  } = useTrainingCyclePageData()
  
  const { message, setMessage } = useSnackbarMessage()
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [pendingDeleteSlotId, setPendingDeleteSlotId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // When training cycle is empty, automatically close sheet
  useEffect(() => {
    if (!trainingCycle || trainingCycle.slots.length === 0) {
      setSheetOpen(false)
    }
  }, [trainingCycle])

  const templateColorMap = useMemo(
    () => new Map(templates.map((template, index) => [template.id, getTemplateColor(index)])),
    [templates],
  )
  
  const selectedSlot = trainingCycle?.slots.find((slot) => slot.id === selectedSlotId) ?? null
  const selectedIndex = trainingCycle?.slots.findIndex((slot) => slot.id === selectedSlotId) ?? 0
  const selectedTemplate = selectedSlot?.templateId
    ? templates.find((template) => template.id === selectedSlot.templateId) ?? null
    : null

  async function addSlot() {
    const didAdd = await handleAddSlot()
    if (didAdd) {
      setMessage('已添加一天，点击可配置')
    }
  }

  async function assignTemplate(templateId: string | null) {
    if (!selectedSlot) return
    const didAssign = await handleAssignTemplate(selectedSlot.id, templateId)
    if (didAssign) {
      setMessage(templateId ? '已更换模板' : '已设为休息日')
    }
  }

  async function calibrateSlotToday(slotId: string) {
    const didCalibrate = await handleCalibrateToday(slotId)
    if (didCalibrate) {
      setMessage('已更新今日进度')
    }
  }

  async function confirmDeleteSlot() {
    if (!pendingDeleteSlotId) return
    const didDelete = await handleRemoveSlot(pendingDeleteSlotId)
    if (didDelete) {
      setPendingDeleteSlotId(null)
      setMessage('循环日已删除')
    }
  }

  return (
    <div className="flex h-[calc(100vh-5rem-env(safe-area-inset-bottom))] min-h-0 flex-col bg-[var(--surface)]">
      <PageHeader
        title="循环日程"
        subtitle={`当前循环：${trainingCycle?.slots.length || 0} 天`}
        backFallbackTo="/templates"
      />

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <TrainingCyclePageLoading showHeader={false} />
        ) : trainingCycle && trainingCycle.slots.length > 0 ? (
        <section className="relative mx-auto mt-4 max-w-lg pb-28">
          {/* Continuous Left Timeline */}
          <div className="absolute bottom-6 left-[2.125rem] top-8 w-px bg-[var(--outline-variant)]/40" />

          {trainingCycle.slots.map((slot, index) => {
            const template = slot.templateId
              ? templates.find((item) => item.id === slot.templateId) ?? null
              : null
            const color = template ? templateColorMap.get(template.id) ?? null : null
            const isToday = todayCycleDay?.slot.id === slot.id
            const slotDateKey = getCycleSlotDateKey(
              trainingCycle.anchorDateKey,
              trainingCycle.anchorIndex,
              index,
            )
            const weekdayLabel = getWeekdayLabel(slotDateKey)

            return (
              <div key={slot.id} className="relative flex gap-4 px-4 py-3">
                {/* Left Axis Node */}
                <div className="relative z-10 flex w-10 shrink-0 flex-col items-center pt-[1.125rem]">
                  {isToday ? (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void calibrateSlotToday(slot.id)}
                      className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-[var(--on-primary)] ring-4 ring-[var(--primary)]/20 shadow-sm transition-transform active:scale-95 disabled:opacity-60"
                      aria-label={`第 ${index + 1} 天，今天`}
                    >
                      {index + 1}
                      <div className="absolute -bottom-6 whitespace-nowrap rounded-full bg-[var(--primary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--on-primary)] shadow-sm">
                        今天
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void calibrateSlotToday(slot.id)}
                      className="flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--surface-variant)] text-[11px] font-medium text-[var(--on-surface-variant)] shadow-sm transition-transform active:scale-95 disabled:opacity-60"
                      aria-label={`将第 ${index + 1} 天校准为今天`}
                    >
                      {index + 1}
                    </button>
                  )}
                </div>

                {/* Right Content Card */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlotId(slot.id)
                    setSheetOpen(true)
                  }}
                  className={[
                    'flex flex-1 items-center justify-between rounded-3xl p-5 text-left transition-transform active:scale-[0.98] shadow-sm border border-transparent',
                    template
                      ? '' // Managed by inline styles below
                      : 'bg-[var(--surface-container)] text-[var(--on-surface)] border-[var(--outline-variant)]/20'
                  ].join(' ')}
                  style={
                    template && color
                      ? { backgroundColor: color.soft, color: color.text, borderColor: 'rgba(0,0,0,0.05)' }
                      : {}
                  }
                >
                  <div>
                    <h4 className="text-[17px] font-bold tracking-tight">
                      {template ? template.name : '休息日'}
                    </h4>
                    <p className="mt-1 text-[13px] font-medium opacity-70">
                      {template ? `${template.exercises.length} 个动作` : '放松恢复，为下次训练蓄力'}
                    </p>
                    <p className="mt-2 text-[12px] font-medium opacity-60">
                      {isToday ? '今天' : weekdayLabel}
                    </p>
                  </div>

                  {/* Drag Handle or Click Indicator */}
                  <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 opacity-50">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            )
          })}
        </section>
        ) : (
        <section className="mx-4 mt-8 rounded-[1.5rem] border border-dashed border-[var(--outline-variant)] px-6 py-12 text-center text-[var(--on-surface-variant)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-container)] mb-4">
            <svg className="h-6 w-6 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-[16px] font-semibold text-[var(--on-surface)]">开启你的循环日程</h3>
          <p className="mt-2 text-sm leading-relaxed">
            循环日程让你不再受限于固定的星期几。<br />添加几天作为一个周期，即可按照顺序不断循环。
          </p>
        </section>
        )}
      </div>

      <div className="shrink-0 pb-4 pt-3">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void addSlot()}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-[var(--on-primary)] shadow-[0_4px_12px_rgba(22,78,48,0.2)] transition-transform active:scale-95 tap-highlight-transparent"
            aria-label="添加一天"
          >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
            <span className="font-medium text-[15px]">添加一天</span>
          </button>
        </div>
      </div>

      {/* Edit Slot Bottom Sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={`第 ${selectedIndex + 1} 天`}
        description={selectedTemplate ? `当前选择：${selectedTemplate.name}` : '当前为休息日'}
      >
        <div className="grid gap-1">
          {/* Rest Day Option */}
          <button
            type="button"
            onClick={() => {
              void assignTemplate(null)
              setSheetOpen(false)
            }}
            disabled={isSubmitting}
            className={[
              'flex items-center justify-between rounded-[1rem] px-4 py-3 text-left transition-colors active:scale-[0.98]',
              selectedTemplate === null
                ? 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)]'
                : 'bg-transparent text-[var(--on-surface)]'
            ].join(' ')}
          >
            <div className="flex items-center gap-3">
              <OptionIcon className="bg-[var(--surface-container)] text-[var(--on-surface-variant)]">
                <RestIcon />
              </OptionIcon>
              <span className="font-semibold">休息日</span>
            </div>
            {selectedTemplate === null && (
              <svg className="h-5 w-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* Template Options */}
          {templates.map((template) => {
            const color = templateColorMap.get(template.id) ?? getTemplateColor(0)
            const isActive = selectedTemplate?.id === template.id

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  void assignTemplate(template.id)
                  setSheetOpen(false)
                }}
                disabled={isSubmitting}
                className={[
                  'flex items-center justify-between rounded-[1rem] px-4 py-3 text-left transition-colors active:scale-[0.98]',
                  isActive
                    ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                    : 'bg-transparent text-[var(--on-surface)]'
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <OptionIcon
                    className="shadow-sm"
                    style={{ backgroundColor: color.soft, color: color.solid }}
                  >
                    <TemplateIcon />
                  </OptionIcon>
                  <div>
                    <div className="font-semibold">{template.name}</div>
                    <div className="text-[13px] font-medium opacity-70 mt-0.5">
                      {template.exercises.length} 个动作
                    </div>
                  </div>
                </div>
                {isActive && (
                  <svg className="h-5 w-5" style={{ color: color.solid }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}

          <div className="my-3 h-px bg-[var(--outline-variant)]/20" />

          {/* Delete Slot Option */}
          <button
            type="button"
            onClick={() => {
              setPendingDeleteSlotId(selectedSlotId)
              setSheetOpen(false)
            }}
            disabled={isSubmitting}
            className="flex items-center gap-3 rounded-[1rem] px-4 py-3.5 text-left text-[var(--error)] hover:bg-[var(--error-container)] transition-colors active:scale-[0.98]"
          >
            <OptionIcon className="bg-[var(--error-container)] text-[var(--error)]">
              <DeleteIcon />
            </OptionIcon>
            <span className="font-medium">删除此天</span>
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={pendingDeleteSlotId !== null}
        title="删除这一天？"
        description="删除后，已安排好的循环顺序将会发生改变，但不会影响历史训练记录。"
        confirmLabel="删除"
        danger
        onCancel={() => setPendingDeleteSlotId(null)}
        onConfirm={() => void confirmDeleteSlot()}
      />

      <Snackbar message={message} placement="aboveFab" />
    </div>
  )
}
