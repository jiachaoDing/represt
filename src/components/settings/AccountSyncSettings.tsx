import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartNoAxesCombined, ChevronRight, Cloud, CloudDownload, ExternalLink, LogOut, RefreshCw } from 'lucide-react'
import { AnimatedSheet } from '../motion/AnimatedSheet'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { SettingsRow } from './SettingsRow'
import { db } from '../../db/app-db'
import { AccountApiError, getAccountMcpUrl, readAccountSession, signInAccount, signOutAccount } from '../../lib/account-api'
import { AccountPlanConflict, prepareAccountRestore, restoreAccountData, syncAccount } from '../../lib/account-sync'
import { clearStoredCurrentSessionId } from '../../db/sessions'
import { openAccountDashboard } from '../../lib/account-dashboard'
import { planSignature } from '../../lib/account-plans'
import { triggerHaptic } from '../../lib/haptics'
import type { AccountRestore, AccountSession } from '../../lib/account-types'

const inputClass = 'min-h-12 w-full rounded-xl border border-[var(--outline-variant)] bg-[var(--surface)] px-3 text-sm text-[var(--on-surface)]'
const buttonClass = 'flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-50'

export function AccountSyncSettings() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<AccountSession | null>(readAccountSession)
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [syncedAt, setSyncedAt] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [conflict, setConflict] = useState<AccountPlanConflict | null>(null)
  const [restore, setRestore] = useState<AccountRestore | null>(null)

  function report(error: unknown) {
    const code = error instanceof AccountApiError ? error.code : 'REQUEST_FAILED'
    const key = code === 'NETWORK' ? 'network' : code === 'NOT_CONFIGURED' ? 'notConfigured' :
      ['VERSION_CONFLICT', 'LOCAL_CHANGED', 'OPERATION_CONFLICT'].includes(code) ? 'changed' :
      ['UNAUTHORIZED', 'INVALID_EMAIL_OR_PASSWORD', 'SESSION_EXPIRED'].includes(code) ? 'credentials' :
      code === 'USER_ALREADY_EXISTS' || code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' ? 'exists' :
      ['DATA_TOO_LARGE', 'PLANS_TOO_LARGE'].includes(code) ? 'tooLarge' : code === 'NO_DATA' ? 'noData' : 'failed'
    setError(t(`accountSync.errors.${key}`))
    void triggerHaptic('error')
  }

  async function loadStatus(current: AccountSession | null) {
    const state = current ? await db.accountSync.get(current.user.id) : null
    setSyncedAt(state?.syncedAt ?? null)
    setPending(Boolean(state?.pending))
  }

  async function show() {
    setError(''); setMessage(''); setConflict(null)
    const current = readAccountSession()
    setSession(current); setOpen(true)
    try { await loadStatus(current) } catch (error) { report(error) }
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const current = await signInAccount(email, password, register)
      setSession(current); setPassword('')
      await loadStatus(current)
      setMessage(t('accountSync.signedIn'))
    } catch (error) { report(error) }
    finally { setBusy(false) }
  }

  async function synchronize(source?: 'local' | 'cloud') {
    if (!session || busy) return
    setBusy(true); setSyncing(true); setError(''); setMessage('')
    try {
      const result = await syncAccount(session, source && conflict ? {
        source, version: conflict.version, localSignature: planSignature(conflict.local),
      } : undefined)
      setConflict(null); setSyncedAt(result.syncedAt); setPending(false)
      setMessage(t(result.uploaded ? 'accountSync.synced' : 'accountSync.upToDate'))
      if (result.uploaded) void triggerHaptic('success')
    } catch (error) {
      if (error instanceof AccountPlanConflict) setConflict(error)
      else { setConflict(null); report(error) }
    } finally { await loadStatus(session).catch(() => {}); setBusy(false); setSyncing(false) }
  }

  async function showDashboard() {
    if (!session || busy) return
    setBusy(true); setError(''); setMessage('')
    try { await openAccountDashboard(session, i18n.resolvedLanguage ?? i18n.language) }
    catch (error) { report(error) }
    finally { setBusy(false) }
  }

  async function previewRestore() {
    if (!session || busy) return
    setBusy(true); setError(''); setMessage('')
    try { setRestore(await prepareAccountRestore(session)) }
    catch (error) { report(error) }
    finally { setBusy(false) }
  }

  async function confirmRestore() {
    if (!session || !restore || busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const at = await restoreAccountData(session, restore)
      clearStoredCurrentSessionId()
      setConflict(null); setPending(false); setSyncedAt(at); setRestore(null)
      setMessage(t('accountSync.restored')); void triggerHaptic('success')
      window.setTimeout(() => window.location.reload(), 600)
    } catch (error) { setRestore(null); report(error) }
    finally { setBusy(false) }
  }

  async function logout() {
    if (!session || busy) return
    setBusy(true); setError(''); setMessage('')
    try { await signOutAccount(session) } catch (error) { report(error) }
    finally { setSession(null); setPassword(''); setConflict(null); setBusy(false) }
  }

  return <>
    <SettingsRow icon={Cloud} label={t('accountSync.title')} supporting={t('accountSync.description')}
      onClick={() => void show()} right={<ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />} />
    <AnimatedSheet open={open} onClose={() => { if (!busy) setOpen(false) }} title={t('accountSync.title')}>
      <div className="max-h-[65dvh] space-y-4 overflow-y-auto pb-4">
        {session ? <>
          <div className="space-y-1 text-sm text-[var(--on-surface-variant)]">
            <p className="break-all font-medium text-[var(--on-surface)]">{session.user.email}</p>
            <p>{syncedAt ? t('accountSync.lastSync', { time: new Date(syncedAt).toLocaleString(i18n.resolvedLanguage) }) : t('accountSync.neverSynced')}</p>
            <p>{pending ? t('accountSync.pending') : t('accountSync.manualOnly')}</p>
          </div>
          <button type="button" className={`${buttonClass} w-full`} disabled={busy || Boolean(conflict)} onClick={() => void synchronize()}>
            <RefreshCw size={18} className={syncing ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden="true" />
            {t(syncing ? 'accountSync.syncing' : pending ? 'accountSync.retry' : 'accountSync.sync')}
          </button>
          <button type="button" disabled={busy} onClick={() => void previewRestore()} className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-[var(--surface)] px-4 text-sm text-[var(--on-surface)] disabled:opacity-50">
            <CloudDownload size={18} aria-hidden="true" />{t('accountSync.restore')}
          </button>
          <p className="text-xs leading-5 text-[var(--on-surface-variant)]">{t('accountSync.restoreHint')}</p>
          {conflict ? <section className="space-y-3 rounded-xl bg-[var(--tertiary-container)] p-4 text-sm text-[var(--on-tertiary-container)]">
            <p className="font-semibold">{t('accountSync.conflictTitle')}</p>
            <p>{t('accountSync.conflictDescription')}</p>
            <div className="space-y-2 text-xs">
              {(['local', 'cloud'] as const).map((source) => {
                const data = conflict[source]
                return <details key={source} className="rounded-lg border border-current/20 p-2">
                  <summary className="cursor-pointer leading-5">{t(`accountSync.${source}Plans`, { names: data.plans.map((p) => p.name).join(', ') || t('accountSync.empty') })}</summary>
                  {data.plans.map((plan) => <div key={plan.id} className="mt-2 space-y-1">
                    <p className="font-semibold">{plan.name}</p>
                    {plan.exercises.map((exercise) => <p key={exercise.id} className="leading-5">
                      {t('accountSync.exerciseDetails', { name: exercise.name, sets: exercise.targetSets, rest: exercise.restSeconds })}
                      {exercise.weightKg != null ? ` · ${t('accountSync.weight', { value: exercise.weightKg })}` : ''}
                      {exercise.reps != null ? ` · ${t('accountSync.reps', { value: exercise.reps })}` : ''}
                      {exercise.durationSeconds != null ? ` · ${t('accountSync.duration', { value: exercise.durationSeconds })}` : ''}
                      {exercise.distanceMeters != null ? ` · ${t('accountSync.distance', { value: exercise.distanceMeters })}` : ''}
                    </p>)}
                  </div>)}
                  {data.cycle ? <p className="mt-2 leading-5">{t('accountSync.cycleDetails', {
                    date: data.cycle.anchorDateKey, day: data.cycle.anchorIndex + 1,
                    plans: data.cycle.slots.map((slot) => data.plans.find((plan) => plan.id === slot.planId)?.name ?? t('accountSync.restDay')).join(' → '),
                  })}</p> : null}
                </details>
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} className={buttonClass} onClick={() => void synchronize('local')}>{t('accountSync.keepLocal')}</button>
              <button type="button" disabled={busy} className={buttonClass} onClick={() => void synchronize('cloud')}>{t('accountSync.useCloud')}</button>
            </div>
          </section> : null}
          <a href={getAccountMcpUrl()} target="_blank" rel="noopener noreferrer" className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-[var(--surface)] px-4 text-sm text-[var(--on-surface)]">
            <ExternalLink size={18} aria-hidden="true" />{t('accountSync.openMcp')}
          </a>
          <p className="text-xs leading-5 text-[var(--on-surface-variant)]">{t('accountSync.mcpDescription')}</p>
          <button type="button" onClick={() => void showDashboard()} disabled={busy} className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-[var(--surface)] px-4 text-sm text-[var(--on-surface)] disabled:opacity-50"><ChartNoAxesCombined size={18} aria-hidden="true" />{t('accountSync.dashboard')}</button>
          <button type="button" disabled={busy} onClick={() => void logout()} className="flex min-h-11 items-center gap-2 text-sm text-[var(--on-surface-variant)]">
            <LogOut size={16} aria-hidden="true" />{t('accountSync.signOut')}
          </button>
        </> : <form onSubmit={(event) => void authenticate(event)} className="space-y-3">
          <p className="text-sm leading-5 text-[var(--on-surface-variant)]">{t('accountSync.loginDescription')}</p>
          <label className="block space-y-1 text-sm text-[var(--on-surface)]"><span>{t('accountSync.email')}</span>
            <input type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
          </label>
          <label className="block space-y-1 text-sm text-[var(--on-surface)]"><span>{t('accountSync.password')}</span>
            <input type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={10} maxLength={128} value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
          </label>
          <p className="text-xs text-[var(--on-surface-variant)]">{t('accountSync.passwordHint')}</p>
          <button type="submit" disabled={busy} className={`${buttonClass} w-full`}>{t(busy ? 'accountSync.working' : register ? 'accountSync.register' : 'accountSync.signIn')}</button>
          <button type="button" disabled={busy} className="min-h-11 text-sm text-[var(--primary)]" onClick={() => { setRegister(!register); setError('') }}>{t(register ? 'accountSync.haveAccount' : 'accountSync.needAccount')}</button>
        </form>}
        {message ? <p role="status" className="rounded-xl bg-[var(--primary-container)] p-3 text-sm text-[var(--on-primary-container)]">{message}</p> : null}
        {error ? <p role="alert" className="rounded-xl bg-[var(--error-container)] p-3 text-sm text-[var(--on-error-container)]">{error}</p> : null}
      </div>
    </AnimatedSheet>
    <ConfirmDialog open={restore !== null} danger title={t('accountSync.restoreTitle')}
      description={t('accountSync.restoreDescription', { time: restore ? new Date(restore.syncedAt).toLocaleString(i18n.resolvedLanguage) : '',
        sessions: restore?.backup.tables.workoutSessions.length ?? 0, sets: restore?.backup.tables.setRecords.length ?? 0 })}
      confirmLabel={t('accountSync.restoreConfirm')} onCancel={() => { if (!busy) setRestore(null) }} onConfirm={() => void confirmRestore()} />
  </>
}
