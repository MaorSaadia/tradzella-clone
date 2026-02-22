// app/(dashboard)/import/page.tsx
// Handles Tradovate Performance CSV format exactly

import { CSVImportClient } from '@/components/import/CSVImportClient'

export default function ImportPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Import Trades</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload your Tradovate Performance CSV — trades are parsed and saved automatically
        </p>
      </div>
      <CSVImportClient />
    </div>
  )
}