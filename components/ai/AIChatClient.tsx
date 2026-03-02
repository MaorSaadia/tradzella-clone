'use client'

// components/ai/AIChatClient.tsx

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAccount } from '@/components/layout/AccountContext'
import {
  Send, Sparkles, RotateCcw, TrendingUp, Clock,
  Target, AlertTriangle, ChevronRight, Loader2,
  ChevronDown, Building2, CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// ── Suggested prompts ──────────────────────────────────────
const SUGGESTED_PROMPTS = [
  { icon: TrendingUp,    label: 'Best setup',         prompt: 'What is my best performing strategy or setup based on my trade data?' },
  { icon: Clock,         label: 'Best time to trade', prompt: 'What time of day do I perform best and worst? Should I avoid any specific hours?' },
  { icon: Target,        label: 'Win rate by day',    prompt: 'Break down my win rate by day of week and tell me which days I should avoid trading.' },
  { icon: AlertTriangle, label: 'Biggest weakness',   prompt: 'What is my single biggest weakness as a trader based on my data? Be brutally honest.' },
  { icon: TrendingUp,    label: 'P&L analysis',       prompt: 'Analyze my P&L patterns. Where am I leaving money on the table?' },
  { icon: Target,        label: 'Mistake patterns',   prompt: 'What mistakes do I repeat the most? How much have they cost me in total?' },
  { icon: Clock,         label: 'Streak analysis',    prompt: 'Tell me about my win and loss streaks. Do I revenge trade after losses?' },
  { icon: AlertTriangle, label: 'Prop firm advice',   prompt: 'Based on my trading, what should I focus on to pass my prop firm challenge?' },
]

// ── Simple markdown renderer ───────────────────────────────
function renderMessage(text: string) {
  return text.split('\n').map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    return (
      <span key={lineIdx}>
        {lineIdx > 0 && <br />}
        {parts.map((part, i) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>
            : <span key={i}>{part}</span>
        )}
      </span>
    )
  })
}

// ── Account Selector ───────────────────────────────────────
function AccountSelector({
  selectedId, onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { accounts } = useAccount()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const selected = accounts.find(a => a.id === selectedId) ?? null
//   const activeAccounts = accounts.filter(a => a.status === 'active')

  if (accounts.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-xs font-semibold"
      >
        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="max-w-35 truncate">
          {selected ? selected.label : 'All Accounts'}
        </span>
        {selected && (
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: selected.firmColor }} />
        )}
        <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* All accounts option */}
          <button
            onClick={() => { onSelect(null); setOpen(false) }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold hover:bg-accent transition-colors',
              !selectedId ? 'text-emerald-500 bg-emerald-500/5' : 'text-foreground'
            )}
          >
            <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="flex-1 text-left">All Accounts</span>
            {!selectedId && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </button>

          {accounts.length > 0 && (
            <div className="border-t border-border">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => { onSelect(acc.id); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-accent transition-colors',
                    selectedId === acc.id ? 'bg-emerald-500/5' : ''
                  )}
                >
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white shrink-0"
                    style={{ background: acc.firmColor }}>
                    {acc.firmName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold truncate">{acc.label}</p>
                    <p className="text-[10px] text-muted-foreground">{acc.firmName} · {acc.stage}</p>
                  </div>
                  {selectedId === acc.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────
export function AIChatClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusAccountId, setFocusAccountId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  // Reset conversation when account focus changes
  function handleAccountChange(id: string | null) {
    setFocusAccountId(id)
    if (messages.length > 0) setMessages([])
  }

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          propFirmAccountId: focusAccountId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }, [messages, loading, focusAccountId])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const isEmpty = messages.length === 0

  return (
    // Full height inside dashboard layout — no extra padding
    <div className="flex flex-col h-full -m-6" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight">AI Trading Coach</h1>
            <p className="text-[10px] text-muted-foreground">Powered by your real trade data · Ask anything</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Account focus selector */}
          <AccountSelector selectedId={focusAccountId} onSelect={handleAccountChange} />
          {/* New chat */}
          {messages.length > 0 && (
            <button onClick={() => setMessages([])}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border">
              <RotateCcw className="w-3 h-3" />
              New chat
            </button>
          )}
        </div>
      </div>

      {/* ── Messages / Empty state ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full px-6 py-8 text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-emerald-500" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 blur-xl scale-150 pointer-events-none" />
            </div>
            <h2 className="text-xl font-black tracking-tight mb-2">Ask your data anything</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
              I have full access to your trade history, P&L, win rates, mistakes, strategies and prop firm progress.
              {focusAccountId
                ? ' Focused on the selected account.'
                : ' Analyzing all your accounts.'}
            </p>

            {/* Prompt grid */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTED_PROMPTS.map((s, i) => {
                const Icon = s.icon
                return (
                  <button key={i} onClick={() => sendMessage(s.prompt)}
                    className="group flex items-center gap-3 text-left px-4 py-3 rounded-xl border border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-emerald-500/10 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{s.prompt.slice(0, 46)}…</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 group-hover:text-emerald-500 transition-colors" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {!isEmpty && (
          <div className="px-6 py-5 space-y-5 max-w-3xl mx-auto w-full">
            {messages.map(msg => (
              <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-emerald-500 text-black font-medium rounded-br-sm'
                    : 'bg-muted/60 border border-border text-foreground rounded-bl-sm'
                )}>
                  {msg.role === 'assistant' ? renderMessage(msg.content) : msg.content}
                  <p className={cn('text-[10px] mt-1.5', msg.role === 'user' ? 'text-black/40 text-right' : 'text-muted-foreground')}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-black text-[10px] font-black">MS</span>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="bg-muted/60 border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  {[0, 150, 300].map(delay => (
                    <span key={delay} className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 border-t border-border bg-background/90 backdrop-blur-sm px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-2">

          {/* Quick re-prompts after first message */}
          {!isEmpty && !loading && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {SUGGESTED_PROMPTS.slice(0, 5).map((s, i) => (
                <button key={i} onClick={() => sendMessage(s.prompt)}
                  className="shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all whitespace-nowrap">
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-3 bg-muted/40 border border-border rounded-2xl px-4 py-3 focus-within:border-emerald-500/50 focus-within:bg-emerald-500/3 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={focusAccountId
                ? 'Ask about this account...'
                : 'Ask anything about your trading data...'}
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground/50 min-h-6 max-h-30 leading-relaxed"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all mb-0.5',
                input.trim() && !loading
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-sm'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}>
              {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />
              }
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/40 text-center">
            Enter to send · Shift+Enter for new line · Answers based on your real trade data
          </p>
        </div>
      </div>
    </div>
  )
}