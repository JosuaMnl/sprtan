import { lazy, Suspense } from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { UnitProvider } from './settings/UnitContext'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { WorkoutLogPage } from './features/workout/WorkoutLogPage'
import { RecordsPage } from './features/records/RecordsPage'
import { ExercisesPage } from './features/exercises/ExercisesPage'
import { SettingsPage } from './features/settings/SettingsPage'

// Recharts is heavy — load the Progress view only when visited.
const ProgressPage = lazy(() =>
  import('./features/progress/ProgressPage').then((m) => ({ default: m.ProgressPage })),
)

function Loading() {
  return (
    <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
      Memuat…
    </p>
  )
}

const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'log', element: <WorkoutLogPage /> },
      {
        path: 'progress',
        element: (
          <Suspense fallback={<Loading />}>
            <ProgressPage />
          </Suspense>
        ),
      },
      { path: 'records', element: <RecordsPage /> },
      { path: 'exercises', element: <ExercisesPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])

export function App() {
  return (
    <UnitProvider>
      <RouterProvider router={router} />
    </UnitProvider>
  )
}
