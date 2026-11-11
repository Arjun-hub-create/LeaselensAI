import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Building2,
  ClipboardCheck,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ScrollText,
  Settings,
  Sparkles,
  Workflow,
} from 'lucide-react'

export type NavItem = {
  label: string
  path: string
  icon: LucideIcon
  description: string
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: 'dashboard', icon: LayoutDashboard, description: 'What needs attention today.' },
  { label: 'Properties', path: 'properties', icon: Building2, description: 'Browse and manage properties.' },
  { label: 'Documents', path: 'documents', icon: FileText, description: 'Upload, extract and review documents.' },
  { label: 'AI Assistant', path: 'assistant', icon: Sparkles, description: 'Ask questions answered from your documents.' },
  { label: 'Workflows', path: 'workflows', icon: Workflow, description: 'Run and inspect automated workflows.' },
  { label: 'Agents', path: 'agents', icon: Bot, description: 'Controlled AI agent with approval gates.' },
  { label: 'Approvals', path: 'approvals', icon: ClipboardCheck, description: 'Items waiting for a human decision.' },
  { label: 'Evaluation', path: 'evaluation', icon: FlaskConical, description: 'Measured quality results.' },
  { label: 'Audit', path: 'audit', icon: ScrollText, description: 'Who did what, and when.' },
  { label: 'Settings', path: 'settings', icon: Settings, description: 'Workspace and user settings.' },
]