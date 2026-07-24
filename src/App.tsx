import { lazy, Suspense } from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { UnitProvider } from './settings/UnitContext'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { WorkoutLogPage } from './features/workout/WorkoutLogPage'
import { RecordsPage } from './features/records/RecordsPage'
import { ExercisesPage } from './features/exercises/ExercisesPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { PrivacyPage } from './features/privacy/PrivacyPage'

// Recharts is heavy — load the Progress view only when visited.
const ProgressPage = lazy(() =>
  import('./features/progress/ProgressPage').then((m) => ({ default: m.ProgressPage })),
)

// Leaflet is heavy — load the running views only when visited.
const RunHistoryPage = lazy(() =>
  import('./features/running/RunHistoryPage').then((m) => ({ default: m.RunHistoryPage })),
)
const RunTrackPage = lazy(() =>
  import('./features/running/RunTrackPage').then((m) => ({ default: m.RunTrackPage })),
)
const RunDetailPage = lazy(() =>
  import('./features/running/RunDetailPage').then((m) => ({ default: m.RunDetailPage })),
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
      {
        path: 'run',
        element: (
          <Suspense fallback={<Loading />}>
            <RunHistoryPage />
          </Suspense>
        ),
      },
      {
        path: 'run/track',
        element: (
          <Suspense fallback={<Loading />}>
            <RunTrackPage />
          </Suspense>
        ),
      },
      {
        path: 'run/:id',
        element: (
          <Suspense fallback={<Loading />}>
            <RunDetailPage />
          </Suspense>
        ),
      },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'privasi', element: <PrivacyPage /> },
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
