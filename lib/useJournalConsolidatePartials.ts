'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  readJournalConsolidatePartials,
  subscribeToJournalConsolidatePartials,
  writeJournalConsolidatePartials,
} from '@/lib/journalPreferences'

export function useJournalConsolidatePartials() {
  const [consolidatePartials, setConsolidatePartials] = useState(readJournalConsolidatePartials)

  useEffect(() => {
    return subscribeToJournalConsolidatePartials(setConsolidatePartials)
  }, [])

  const updateConsolidatePartials = useCallback((value: boolean) => {
    setConsolidatePartials(value)
    writeJournalConsolidatePartials(value)
  }, [])

  return { consolidatePartials, updateConsolidatePartials }
}
