import { ArrowRight, Bot, FlaskConical, ScrollText, ShieldCheck, Sparkles, Workflow } from 'lucide-react'

import { GlassCard } from '@/components/GlassCard'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/states'

function DisabledComposer({ label }: { label: string }) {
  return (
    <div className="border-t border-border p-4">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-[#080C22] p-2 pl-4">
        <input
          type="text"
          disabled
          aria-label={label}
          placeholder="Not available yet"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        <button
          type="button"
          disabled
          aria-label="Send (not available yet)"
          className="flex size-10 items-center justify-center rounded-xl bg-[#5537D3] text-white opacity-60"
        >
          <ArrowRight className="size-5" />
        </button>
      </div>
    </div>
  )
}

/* ---------------- AI Assistant ---------------- */

const exampleQuestions = [
  'When does the insurance policy for Greenwood Residency expire?',
  'What is the notice period in the Skyline lease?',
  'Which fire safety certificates expire in the next 60 days?',
]

export function AssistantPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Ask questions answered from your documents, with page-level sources."
      />
      <GlassCard className="flex min-h-96 flex-col">
        <div className="flex-1">
          <EmptyState
            icon={Sparkles}
            title="Live answers are not connected yet"
            description="This page will answer from your documents once the backend and the local model are connected. Every answer will cite its source pages, and say so when the documents do not contain the answer."
          />
          <div className="mx-auto max-w-xl px-6 pb-8">
            <p className="text-sm font-medium">Examples of what you will be able to ask</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {exampleQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
        <DisabledComposer label="Ask a question (not available yet)" />
      </GlassCard>
    </div>
  )
}

/* ---------------- Workflows ---------------- */

const workflows = [
  {
    name: 'Document onboarding',
    trigger: 'Runs when a document is uploaded',
    steps: 'Extract text, classify, extract fields, validate, embed, queue for review',
  },
  {
    name: 'Upcoming expiry review',
    trigger: 'Run on demand for a chosen time window',
    steps: 'Find approved insurance and compliance records expiring in the window',
  },
  {
    name: 'Reminder draft',
    trigger: 'Run on demand for a property',
    steps: 'Prepare a draft from approved ledger and lease data. It is never sent automatically.',
  },
]

export function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Run and inspect automated workflows, step by step."
      />
      <ul className="grid gap-4 lg:grid-cols-3">
        {workflows.map((w) => (
          <li key={w.name}>
            <GlassCard className="h-full p-5">
              <div className="flex items-center justify-between gap-3">
                <Workflow className="size-6 text-[#A948F6]" />
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                  Not available yet
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold">{w.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{w.trigger}</p>
              <p className="mt-3 text-sm">{w.steps}</p>
            </GlassCard>
          </li>
        ))}
      </ul>
      <GlassCard>
        <EmptyState
          icon={Workflow}
          title="No workflow runs yet"
          description="When workflows exist, every run will show its steps, status and timing here."
        />
      </GlassCard>
    </div>
  )
}

/* ---------------- Agents ---------------- */

const agentTools = [
  { name: 'get_property_details', purpose: 'Read details of a property in your workspace' },
  { name: 'get_approved_lease_summary', purpose: 'Read the approved lease facts for a property' },
  { name: 'get_insurance_status', purpose: 'Read approved insurance policy facts' },
  { name: 'get_payment_history', purpose: 'Read sample ledger entries' },
  { name: 'search_property_documents', purpose: 'Search documents, with citations' },
  { name: 'prepare_reminder_draft', purpose: 'Prepare a draft only. Nothing is sent.' },
]

const agentRules = [
  'It can only read your workspace data and prepare drafts.',
  'It cannot send messages, change financial records, make payments or delete anything.',
  'A person must approve any proposed action. The agent cannot approve its own request.',
  'Text found inside documents is treated as evidence, never as instructions.',
]

export function AgentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="A single controlled agent that uses a short list of safe tools and waits for human approval."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h2 className="flex items-center gap-3 text-lg font-semibold">
            <Bot className="size-6 text-[#5385F7]" />
            Planned tools
          </h2>
          <ul className="mt-4 space-y-3">
            {agentTools.map((t) => (
              <li key={t.name}>
                <code className="rounded bg-secondary px-2 py-0.5 text-xs">{t.name}</code>
                <p className="mt-1 text-sm text-muted-foreground">{t.purpose}</p>
              </li>
            ))}
          </ul>
        </GlassCard>
        <GlassCard className="p-5">
          <h2 className="flex items-center gap-3 text-lg font-semibold">
            <ShieldCheck className="size-6 text-[#0DBD9E]" />
            Safety rules
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {agentRules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </GlassCard>
      </div>
      <GlassCard className="flex flex-col">
        <EmptyState
          icon={Bot}
          title="The agent is not connected yet"
          description="It arrives after workflows and approvals exist. Its tool calls will appear here as a timeline."
        />
        <DisabledComposer label="Ask the agent (not available yet)" />
      </GlassCard>
    </div>
  )
}

/* ---------------- Evaluation ---------------- */

const metrics = [
  { name: 'Extraction field match', definition: 'Correct fields divided by expected fields, after normalising dates and amounts.' },
  { name: 'Retrieval Recall@K', definition: 'Share of the labelled relevant passages found in the top K results.' },
  { name: 'Citation validity', definition: 'Share of citations that point to a real retrieved passage and page.' },
  { name: 'Abstention accuracy', definition: 'How often it correctly says "not enough evidence" when the answer is absent.' },
  { name: 'Workflow and agent task success', definition: 'Share of test cases that reach the expected final state.' },
  { name: 'Latency (P50 / P95)', definition: 'Typical and slow-case end-to-end time on this laptop.' },
  { name: 'Failure rate', definition: 'Failed or invalid runs divided by all runs.' },
]

export function EvaluationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluation"
        description="Measured quality results on a named test dataset. No results are shown until real runs exist."
      />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m) => (
          <li key={m.name}>
            <GlassCard className="h-full p-5">
              <p className="text-sm text-muted-foreground">{m.name}</p>
              <p className="mt-2 text-2xl font-semibold text-muted-foreground">No runs yet</p>
              <p className="mt-3 text-xs text-muted-foreground">{m.definition}</p>
            </GlassCard>
          </li>
        ))}
      </ul>
      <GlassCard>
        <EmptyState
          icon={FlaskConical}
          title="No evaluation runs yet"
          description="Results will name the dataset, model, prompt version and run time. They will describe that test set only, not accuracy in general."
        />
      </GlassCard>
    </div>
  )
}

/* ---------------- Audit ---------------- */

export function AuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Audit" description="Who did what, and when." />
      <GlassCard>
        <EmptyState
          icon={ScrollText}
          title="No activity recorded yet"
          description="Once the backend exists, uploads, reviews, workflow steps, tool calls and approval decisions will appear here, with secrets and full document text left out."
        />
      </GlassCard>
    </div>
  )
}

/* ---------------- Settings ---------------- */

const roles = [
  { role: 'Admin', can: 'Everything, including managing users and roles' },
  { role: 'Property manager', can: 'Create and update properties, upload documents, run workflows' },
  { role: 'Reviewer', can: 'Review and approve extracted fields and proposed actions' },
  { role: 'Viewer', can: 'Read-only access' },
]

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Workspace, roles and local model configuration." demo />

      <GlassCard className="p-5">
        <h2 className="text-lg font-semibold">Workspace</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">Northstar Property Group (fictional)</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Your role (demo)</dt>
            <dd className="font-medium">Property manager</dd>
          </div>
        </dl>
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="text-lg font-semibold">Roles</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The server will enforce these. Hiding a button in the interface is not access control.
        </p>
        <ul className="mt-3 space-y-3">
          {roles.map((r) => (
            <li key={r.role} className="text-sm">
              <span className="font-medium">{r.role}</span>
              <span className="text-muted-foreground"> — {r.can}</span>
            </li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="text-lg font-semibold">Local models</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Chat model (configured)</dt>
            <dd className="font-medium">qwen3.5:4b</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Embedding model (configured)</dt>
            <dd className="font-medium">nomic-embed-text:latest</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">Not checked. The backend is not connected yet.</dd>
          </div>
        </dl>
      </GlassCard>
    </div>
  )
}