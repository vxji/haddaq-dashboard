// Force Latin digits (0-9) regardless of the browser/OS locale, which would
// otherwise render Arabic-Indic digits (٠١٢٣...) for an "ar-SA" formatter.
const LATIN_NUMERALS_LOCALE = "ar-SA-u-nu-latn"

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LATIN_NUMERALS_LOCALE, options).format(value)
}
