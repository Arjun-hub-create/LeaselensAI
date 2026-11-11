import { ArrowRight, Building2, Sparkles, User } from 'lucide-react'

import { GlassCard } from '@/components/GlassCard'

import { demoChat } from './demoData'

export function AskPanel() {
  return (
    <GlassCard className="flex flex-col border-[#5537D3]/50 bg-linear-to-b from-[#121240] to-[#080C22] p-5 shadow-[0_0_40px_rgba(85,55,211,0.25)]">
      <div className="flex items-center gap-3">
        <Sparkles className="size-6 text-[#A948F6]" />
        <h2 className="text-lg font-semibold">Ask LeaseLens AI</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Get answers about your properties and documents, with sources.
      </p>
      <p className="mt-1 text-xs text-[#F97D0B]">Demo conversation</p>

      <div className="mt-4 flex-1 space-y-4">
        {/* Question */}
        <div className="flex items-start justify-end gap-2">
          <div className="rounded-2xl bg-secondary px-4 py-2 text-sm">{demoChat.question}</div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
            <User className="size-4" />
          </div>
        </div>

        {/* Answer */}
        <div className="flex items-start gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#5537D3]/30 text-[#A948F6]">
            <Sparkles className="size-4" />
          </div>
          <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
            <p>{demoChat.answer}</p>
            <ul className="mt-3 space-y-2">
              {demoChat.leases.map((lease) => (
                <li key={lease.name} className="flex items-start gap-2">
                  <Building2 className="mt-0.5 size-4 shrink-0 text-[#5385F7]" />
                  <span>
                    {lease.name}
                    <span className="block text-xs text-muted-foreground">({lease.date})</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{demoChat.source}</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-[#080C22] p-2 pl-4">
          <input
            type="text"
            disabled
            aria-label="Ask anything (available when the backend is connected)"
            placeholder="Ask anything..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled
            aria-label="Send (available when the backend is connected)"
            className="flex size-10 items-center justify-center rounded-xl bg-[#5537D3] text-white opacity-60"
          >
            <ArrowRight className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Live answers arrive once the backend and local model are connected.
        </p>
      </div>
    </GlassCard>
  )
}