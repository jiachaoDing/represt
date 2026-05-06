import i18n from 'i18next'
import type { BackendModule, ResourceKey } from 'i18next'
import { initReactI18next } from 'react-i18next'

import zhCNCommon from '../locales/zh-CN/common'
import zhCNExercises from '../locales/zh-CN/exercises'
import zhCNMuscles from '../locales/zh-CN/muscles'
import {
  defaultLanguage,
  isSupportedLanguage,
  resolveLanguagePreference,
  supportedLanguages,
  type SupportedLanguage,
} from './languages'
import { getSafeInitialLanguagePreference } from './storage'

const initialLanguage = resolveLanguagePreference(getSafeInitialLanguagePreference())
const localeNamespaces = ['common', 'exercises', 'muscles'] as const

type LocaleNamespace = (typeof localeNamespaces)[number]

const bundledResources = {
  [defaultLanguage]: {
    common: zhCNCommon,
    exercises: zhCNExercises,
    muscles: zhCNMuscles,
  },
}

const localeResourceLoaders = {
  'zh-CN': {
    common: () => Promise.resolve(zhCNCommon),
    exercises: () => Promise.resolve(zhCNExercises),
    muscles: () => Promise.resolve(zhCNMuscles),
  },
  en: {
    common: () => import('../locales/en/common').then((module) => module.default),
    exercises: () => import('../locales/en/exercises').then((module) => module.default),
    muscles: () => import('../locales/en/muscles').then((module) => module.default),
  },
} satisfies Record<SupportedLanguage, Record<LocaleNamespace, () => Promise<ResourceKey>>>

function isLocaleNamespace(value: string): value is LocaleNamespace {
  return localeNamespaces.includes(value as LocaleNamespace)
}

const dynamicLocaleBackend: BackendModule = {
  type: 'backend',
  init() {},
  read(language, namespace, callback) {
    if (!isSupportedLanguage(language) || !isLocaleNamespace(namespace)) {
      callback(new Error(`Unsupported locale resource: ${language}/${namespace}`), false)
      return
    }

    void localeResourceLoaders[language][namespace]()
      .then((resource) => callback(null, resource))
      .catch((error: unknown) => {
        callback(error instanceof Error ? error : new Error(String(error)), false)
      })
  },
}

export const i18nReady = i18n.use(dynamicLocaleBackend).use(initReactI18next).init({
  lng: initialLanguage,
  fallbackLng: defaultLanguage,
  supportedLngs: [...supportedLanguages],
  ns: [...localeNamespaces],
  resources: bundledResources,
  partialBundledLanguages: true,
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
})

function syncDocumentLanguage(language: string) {
  document.documentElement.lang = language
  document.title = i18n.t('common.appName')
}

i18n.on('languageChanged', syncDocumentLanguage)

void i18nReady.then(() => syncDocumentLanguage(i18n.resolvedLanguage ?? initialLanguage))

export default i18n
