export const JOURNAL_CONSOLIDATE_PARTIALS_KEY = 'journal.consolidatePartials'
export const JOURNAL_PREFERENCES_UPDATED_EVENT = 'journal-preferences-updated'

export function readJournalConsolidatePartials(): boolean {
  if (typeof window === 'undefined') return true
  const value = window.localStorage.getItem(JOURNAL_CONSOLIDATE_PARTIALS_KEY)
  if (value === null) return true
  return value === 'true'
}

export function writeJournalConsolidatePartials(value: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(JOURNAL_CONSOLIDATE_PARTIALS_KEY, value.toString())
  window.dispatchEvent(new Event(JOURNAL_PREFERENCES_UPDATED_EVENT))
}

export function subscribeToJournalConsolidatePartials(
  listener: (value: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const onStorage = (event: StorageEvent) => {
    if (event.key !== JOURNAL_CONSOLIDATE_PARTIALS_KEY) return
    listener(readJournalConsolidatePartials())
  }

  const onUpdated = () => {
    listener(readJournalConsolidatePartials())
  }

  window.addEventListener('storage', onStorage)
  window.addEventListener(JOURNAL_PREFERENCES_UPDATED_EVENT, onUpdated)

  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(JOURNAL_PREFERENCES_UPDATED_EVENT, onUpdated)
  }
}
