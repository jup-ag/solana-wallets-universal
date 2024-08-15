import { createContextProvider } from "@solid-primitives/context"
import { createSignal } from "solid-js"

import { dictionaries, Locale } from "./i18"

type TranslationProviderProps = {
  locale: Locale
}
const [TranslationProvider, _useTranslation] = createContextProvider(
  (props: TranslationProviderProps) => {
    const [locale, setLocale] = createSignal(props.locale)

    function t(text: string) {
      const _locale = locale()
      if (_locale === Locale.EN) {
        return text
      }
      const dict = dictionaries[text]
      if (!dict) {
        return
      }
      const found = dict[_locale]
      return found ? found : "not found"
    }

    return {
      locale,
      setLocale,
      t,
    }
  },
)

const useTranslation = () => {
  const context = _useTranslation()
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider")
  }
  return context
}

export { TranslationProvider, useTranslation }
