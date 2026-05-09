import { useEffect, useState } from 'react'
import { Copy, ExternalLink, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  deleteSharedPlanRecord,
  listSharedPlanRecords,
} from '../../db/shared-plan-records'
import type { SharedPlanRecord } from '../../db/app-db'
import i18n from '../../i18n'
import { deleteSharedPlan, PlanShareApiError } from '../../lib/plan-share-api'
import { triggerHaptic } from '../../lib/haptics'
import { AnimatedSheet } from '../motion/AnimatedSheet'
import { ConfirmDialog } from '../ui/ConfirmDialog'

type SharedPlanRecordsSheetProps = {
  open: boolean
  onClose: () => void
}

function formatRecordTime(value: string | null, fallback: string) {
  if (!value) {
    return fallback
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function getDeleteErrorMessage(
  t: ReturnType<typeof useTranslation>['t'],
  error: unknown,
) {
  if (error instanceof PlanShareApiError) {
    return t(`planShare.records.errors.${error.reason}`)
  }

  return t('planShare.records.errors.unknown')
}

export function SharedPlanRecordsSheet({ open, onClose }: SharedPlanRecordsSheetProps) {
  const { t } = useTranslation()
  const [records, setRecords] = useState<SharedPlanRecord[]>([])
  const [pendingDelete, setPendingDelete] = useState<SharedPlanRecord | null>(null)
  const [busyCode, setBusyCode] = useState<string | null>(null)
  const [unavailableCode, setUnavailableCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    async function loadRecords() {
      try {
        setIsLoading(true)
        setError(null)
        setMessage(null)
        setUnavailableCode(null)
        const nextRecords = await listSharedPlanRecords()
        if (!cancelled) {
          setRecords(nextRecords)
        }
      } catch (loadError) {
        console.error(loadError)
        if (!cancelled) {
          setError(t('planShare.records.errors.loadFailed'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadRecords()

    return () => {
      cancelled = true
    }
  }, [open, t])

  async function copyCode(code: string) {
    try {
      setError(null)
      setMessage(null)
      await navigator.clipboard.writeText(code)
      setMessage(t('planShare.copiedCode'))
      void triggerHaptic('success')
    } catch (copyError) {
      console.error(copyError)
      setError(t('planShare.errors.copyFailed'))
      void triggerHaptic('error')
    }
  }

  async function removeLocalRecord(record: SharedPlanRecord) {
    try {
      setBusyCode(record.code)
      setError(null)
      setMessage(null)
      await deleteSharedPlanRecord(record.code)
      setRecords((current) => current.filter((item) => item.code !== record.code))
      setUnavailableCode(null)
      setMessage(t('planShare.records.removedLocal'))
      void triggerHaptic('success')
    } catch (removeError) {
      console.error(removeError)
      setError(t('planShare.records.errors.removeLocalFailed'))
      void triggerHaptic('error')
    } finally {
      setBusyCode(null)
    }
  }

  async function confirmDeleteSharedPlan() {
    const record = pendingDelete
    setPendingDelete(null)
    if (!record) {
      return
    }

    try {
      setBusyCode(record.code)
      setError(null)
      setMessage(null)
      await deleteSharedPlan(record.code)
      try {
        await deleteSharedPlanRecord(record.code)
      } catch (localDeleteError) {
        console.error(localDeleteError)
        setError(t('planShare.records.errors.removeLocalFailed'))
        void triggerHaptic('error')
        return
      }
      setRecords((current) => current.filter((item) => item.code !== record.code))
      setUnavailableCode(null)
      setMessage(t('planShare.records.deleted'))
      void triggerHaptic('success')
    } catch (deleteError) {
      console.error(deleteError)
      if (
        deleteError instanceof PlanShareApiError &&
        (deleteError.reason === 'notFound' || deleteError.reason === 'expired')
      ) {
        setUnavailableCode(record.code)
      }
      setError(getDeleteErrorMessage(t, deleteError))
      void triggerHaptic('error')
    } finally {
      setBusyCode(null)
    }
  }

  return (
    <>
      <AnimatedSheet open={open} onClose={onClose} title={t('planShare.records.title')}>
        <div className="space-y-3">
          {isLoading ? (
            <p className="rounded-xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--on-surface-variant)]">
              {t('planShare.records.loading')}
            </p>
          ) : null}

          {!isLoading && records.length === 0 ? (
            <section className="rounded-xl bg-[var(--surface)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--on-surface)]">{t('planShare.records.emptyTitle')}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
                {t('planShare.records.emptyDescription')}
              </p>
            </section>
          ) : null}

          {records.map((record) => {
            const isBusy = busyCode === record.code
            const canRemoveLocal = unavailableCode === record.code

            return (
              <section key={record.code} className="rounded-xl bg-[var(--surface)] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-[var(--on-surface)]">
                      {record.title || t('common.unnamedPlan')}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-[var(--primary)]">{record.code}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.assign(record.url)
                    }}
                    aria-label={t('planShare.records.openPreview')}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
                  >
                    <ExternalLink size={17} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                </div>

                <dl className="mt-3 grid gap-1 text-xs leading-5 text-[var(--on-surface-variant)]">
                  <div className="flex justify-between gap-3">
                    <dt>{t('planShare.records.createdAt')}</dt>
                    <dd className="text-right text-[var(--on-surface)]">
                      {formatRecordTime(record.createdAt, t('common.unknownTime'))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{t('planShare.records.expiresAt')}</dt>
                    <dd className="text-right text-[var(--on-surface)]">
                      {formatRecordTime(record.expiresAt, t('planShare.records.noExpiry'))}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('planShare.records.link')}</dt>
                    <dd className="mt-1 break-all rounded-lg bg-[var(--surface-container)] px-3 py-2 text-[var(--on-surface)]">
                      {record.url}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void copyCode(record.code)}
                    disabled={isBusy}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--surface-container)] px-3 text-xs font-semibold text-[var(--on-surface)] disabled:opacity-50"
                  >
                    <Copy size={15} strokeWidth={2.2} className="text-[var(--primary)]" aria-hidden="true" />
                    <span>{t('planShare.copyCode')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(record)}
                    disabled={isBusy}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--error-container)] px-3 text-xs font-semibold text-[var(--on-error-container)] disabled:opacity-50"
                  >
                    <Trash2 size={15} strokeWidth={2.2} aria-hidden="true" />
                    <span>{t('planShare.records.deleteRemote')}</span>
                  </button>
                </div>

                {canRemoveLocal ? (
                  <button
                    type="button"
                    onClick={() => void removeLocalRecord(record)}
                    disabled={isBusy}
                    className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--outline-variant)] px-3 text-xs font-semibold text-[var(--on-surface)] disabled:opacity-50"
                  >
                    <X size={15} strokeWidth={2.2} className="text-[var(--primary)]" aria-hidden="true" />
                    <span>{t('planShare.records.removeLocal')}</span>
                  </button>
                ) : null}
              </section>
            )
          })}

          {message ? (
            <p className="rounded-xl bg-[var(--primary-container)] px-4 py-3 text-sm leading-5 text-[var(--on-primary-container)]">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm leading-5 text-[var(--on-error-container)]">
              {error}
            </p>
          ) : null}
        </div>
      </AnimatedSheet>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('planShare.records.deleteTitle')}
        description={
          pendingDelete
            ? t('planShare.records.deleteDescription', {
                code: pendingDelete.code,
                title: pendingDelete.title || t('common.unnamedPlan'),
              })
            : ''
        }
        confirmLabel={t('common.delete')}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDeleteSharedPlan()}
      />
    </>
  )
}
