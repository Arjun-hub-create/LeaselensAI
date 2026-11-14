import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { PagePlaceholder } from '@/components/PagePlaceholder'
import { ApprovalsPage } from '@/features/approvals/ApprovalsPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DocumentReviewPage } from '@/features/documents/DocumentReviewPage'
import { DocumentsPage } from '@/features/documents/DocumentsPage'
import { PropertiesPage } from '@/features/properties/PropertiesPage'
import {
  AgentsPage,
  AssistantPage,
  AuditPage,
  EvaluationPage,
  SettingsPage,
  WorkflowsPage,
} from '@/features/sections/SectionPages'

import { navItems } from './navigation'

function pageFor(path: string, label: string, description: string) {
  switch (path) {
    case 'dashboard':
      return <DashboardPage />
    case 'properties':
      return <PropertiesPage />
    case 'documents':
      return <DocumentsPage />
    case 'assistant':
      return <AssistantPage />
    case 'workflows':
      return <WorkflowsPage />
    case 'agents':
      return <AgentsPage />
    case 'approvals':
      return <ApprovalsPage />
    case 'evaluation':
      return <EvaluationPage />
    case 'audit':
      return <AuditPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <PagePlaceholder title={label} description={description} />
  }
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    // Everything inside this group requires a signed-in user.
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'documents/:documentId/review', element: <DocumentReviewPage /> },
          ...navItems.map((item) => ({
            path: item.path,
            element: pageFor(item.path, item.label, item.description),
          })),
        ],
      },
    ],
  },
])