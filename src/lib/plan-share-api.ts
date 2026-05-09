import type { PlanTransferData } from './plan-transfer-types'

export type SharedPlanKind = 'plan-template' | 'training-cycle'

export type SharedPlanSummary = {
  planCount: number
  exerciseCount: number
  mainExercises: string[]
  hasCycle: boolean
}

export type SharedPlanDetail = {
  code: string
  schemaVersion: 1
  app: 'RepRest'
  kind: SharedPlanKind
  title: string
  summary: SharedPlanSummary
  payload: PlanTransferData
  createdAt: string
  expiresAt: string | null
}

export type CreateSharedPlanResult = {
  code: string
  url: string
  expiresAt: string | null
}

export type PlanShareApiErrorReason =
  | 'notFound'
  | 'expired'
  | 'forbidden'
  | 'unsupported'
  | 'network'
  | 'invalid'
  | 'unknown'

export class PlanShareApiError extends Error {
  readonly reason: PlanShareApiErrorReason

  constructor(reason: PlanShareApiErrorReason, message: string) {
    super(message)
    this.reason = reason
  }
}

const defaultShareBaseUrl = 'http://localhost:8787'

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function getPlanShareApiBaseUrl() {
  return trimTrailingSlash(import.meta.env.VITE_PLAN_SHARE_API_BASE_URL || defaultShareBaseUrl)
}

export function getPlanShareWebBaseUrl() {
  return trimTrailingSlash(import.meta.env.VITE_PLAN_SHARE_WEB_BASE_URL || defaultShareBaseUrl)
}

export function buildPlanShareUrl(code: string) {
  return `${getPlanShareWebBaseUrl()}/p/${encodeURIComponent(code)}`
}

function getErrorReason(status: number): PlanShareApiErrorReason {
  if (status === 404) {
    return 'notFound'
  }

  if (status === 410) {
    return 'expired'
  }

  if (status === 403) {
    return 'forbidden'
  }

  if (status === 400) {
    return 'invalid'
  }

  if (status === 422) {
    return 'unsupported'
  }

  return 'unknown'
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new PlanShareApiError(getErrorReason(response.status), `Plan share API failed with ${response.status}.`)
  }

  return (await response.json()) as T
}

async function readSuccessResponse(response: Response) {
  if (!response.ok) {
    throw new PlanShareApiError(getErrorReason(response.status), `Plan share API failed with ${response.status}.`)
  }

  if (response.status === 204) {
    return
  }

  await response.text()
}

export async function createSharedPlan(data: PlanTransferData, kind: SharedPlanKind, locale?: string) {
  try {
    const response = await fetch(`${getPlanShareApiBaseUrl()}/api/shared-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schemaVersion: 1,
        app: 'RepRest',
        kind,
        locale,
        data,
      }),
    })
    const result = await readJsonResponse<CreateSharedPlanResult>(response)

    return {
      ...result,
      url: buildPlanShareUrl(result.code),
    } satisfies CreateSharedPlanResult
  } catch (error) {
    if (error instanceof PlanShareApiError) {
      throw error
    }

    throw new PlanShareApiError('network', 'Could not connect to the plan share service.')
  }
}

export async function getSharedPlan(code: string) {
  try {
    const response = await fetch(`${getPlanShareApiBaseUrl()}/api/shared-plans/${encodeURIComponent(code.trim())}`)
    return await readJsonResponse<SharedPlanDetail>(response)
  } catch (error) {
    if (error instanceof PlanShareApiError) {
      throw error
    }

    throw new PlanShareApiError('network', 'Could not connect to the plan share service.')
  }
}

export async function deleteSharedPlan(code: string) {
  try {
    const response = await fetch(`${getPlanShareApiBaseUrl()}/api/shared-plans/${encodeURIComponent(code.trim())}`, {
      method: 'DELETE',
    })
    await readSuccessResponse(response)
  } catch (error) {
    if (error instanceof PlanShareApiError) {
      throw error
    }

    throw new PlanShareApiError('network', 'Could not connect to the plan share service.')
  }
}
