import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from '../locales/en/common'
import enExercises from '../locales/en/exercises'
import enMuscles from '../locales/en/muscles'
import zhCNCommon from '../locales/zh-CN/common'
import zhCNExercises from '../locales/zh-CN/exercises'
import zhCNMuscles from '../locales/zh-CN/muscles'
import { defaultLanguage, resolveLanguagePreference } from './languages'
import { getSafeInitialLanguagePreference } from './storage'

const initialLanguage = resolveLanguagePreference(getSafeInitialLanguagePreference())

void i18n.use(initReactI18next).init({
  lng: initialLanguage,
  fallbackLng: defaultLanguage,
  supportedLngs: ['zh-CN', 'en'],
  resources: {
    'zh-CN': {
      common: zhCNCommon,
      exercises: zhCNExercises,
      muscles: zhCNMuscles,
    },
    en: {
      common: enCommon,
      exercises: enExercises,
      muscles: enMuscles,
    },
  },
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
})

function syncDocumentLanguage(language: string) {
  document.documentElement.lang = language
  document.title = i18n.t('common.appName')
}

syncDocumentLanguage(initialLanguage)
i18n.on('languageChanged', syncDocumentLanguage)

export default i18n
