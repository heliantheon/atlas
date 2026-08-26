import { lazy, Suspense, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spinner } from '@heliannuuthus/ui'
import { ChaosLayout } from '@/layouts'
import { AuthCallback } from '@/pages/auth/Callback'

const Dashboard = lazy(() =>
  import('@/pages/Dashboard').then(module => ({ default: module.Dashboard }))
)
const TemplateManagement = lazy(() =>
  import('@/pages/TemplateManagement').then(module => ({ default: module.TemplateManagement }))
)
const FileManagement = lazy(() =>
  import('@/pages/FileManagement').then(module => ({ default: module.FileManagement }))
)

const LogExplorer = lazy(() =>
  import('@/pages/LogExplorer').then(module => ({ default: module.LogExplorer }))
)

function LazyBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-56 items-center justify-center gap-2" role="status">
          <Spinner />
          <span>正在加载管理工作台…</span>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<ChaosLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <LazyBoundary>
              <Dashboard />
            </LazyBoundary>
          }
        />
        <Route
          path="templates/*"
          element={
            <LazyBoundary>
              <TemplateManagement />
            </LazyBoundary>
          }
        />
        <Route
          path="files"
          element={
            <LazyBoundary>
              <FileManagement />
            </LazyBoundary>
          }
        />
        <Route
          path="logs"
          element={
            <LazyBoundary>
              <LogExplorer />
            </LazyBoundary>
          }
        />
      </Route>
    </Routes>
  )
}
