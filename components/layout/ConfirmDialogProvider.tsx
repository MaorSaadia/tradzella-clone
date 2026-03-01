'use client'

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type ConfirmVariant = 'default' | 'destructive'

export interface ConfirmOptions {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
}

interface ConfirmRequest {
  options: Required<ConfirmOptions>
  resolve: (value: boolean) => void
}

interface ConfirmState {
  active: ConfirmRequest | null
  queue: ConfirmRequest[]
}

type ConfirmAction =
  | { type: 'enqueue'; request: ConfirmRequest }
  | { type: 'dequeue' }

const defaultOptions: Required<ConfirmOptions> = {
  title: 'Are you sure?',
  description: 'This action cannot be undone.',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'destructive',
}

const ConfirmDialogContext = createContext<((options?: ConfirmOptions) => Promise<boolean>) | null>(null)

function confirmReducer(state: ConfirmState, action: ConfirmAction): ConfirmState {
  switch (action.type) {
    case 'enqueue':
      if (!state.active) {
        return { active: action.request, queue: state.queue }
      }
      return { active: state.active, queue: [...state.queue, action.request] }
    case 'dequeue': {
      if (state.queue.length === 0) {
        return { active: null, queue: [] }
      }
      const [next, ...rest] = state.queue
      return { active: next, queue: rest }
    }
    default:
      return state
  }
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(confirmReducer, {
    active: null,
    queue: [],
  })

  const confirm = useCallback((options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      const merged: Required<ConfirmOptions> = { ...defaultOptions, ...options }
      dispatch({
        type: 'enqueue',
        request: { options: merged, resolve },
      })
    })
  }, [])

  const handleCancel = useCallback(() => {
    if (!state.active) return
    state.active.resolve(false)
    dispatch({ type: 'dequeue' })
  }, [state.active])

  const handleConfirm = useCallback(() => {
    if (!state.active) return
    state.active.resolve(true)
    dispatch({ type: 'dequeue' })
  }, [state.active])

  const contextValue = useMemo(() => confirm, [confirm])

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}
      <AlertDialog open={!!state.active} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <AlertDialogTitle>{state.active?.options.title}</AlertDialogTitle>
            <AlertDialogDescription>{state.active?.options.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {state.active?.options.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={state.active?.options.variant === 'destructive' ? 'bg-destructive text-white hover:bg-destructive/90' : undefined}
            >
              {state.active?.options.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmDialogContext)
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider')
  }
  return context
}
