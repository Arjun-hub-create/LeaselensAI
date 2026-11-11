import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { PagePlaceholder } from '@/components/PagePlaceholder'
import { DashboardPage } from '@/features/dashboard/DashboardPage'

import { navItems } from './navigation'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      ...navItems.map((item) => ({
        path: item.path,
        element:
          item.path === 'dashboard' ? (
            <DashboardPage />
          ) : (
            <PagePlaceholder title={item.label} description={item.description} />
          ),
      })),
    ],
  },
])