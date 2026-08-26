import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ChaosLayout } from '@/layouts'
import { AuthCallback } from '@/pages/auth/Callback'
import { Dashboard } from '@/pages/Dashboard'
import { TemplateManagement } from '@/pages/TemplateManagement'
import { FileManagement } from '@/pages/FileManagement'

const LogExplorer = lazy(() =>
  import('@/pages/LogExplorer').then(module => ({ default: module.LogExplorer }))
)

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<ChaosLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="templates/*" element={<TemplateManagement />} />
        <Route path="files" element={<FileManagement />} />
        <Route
          path="logs"
          element={
            <Suspense fallback={<div role="status">正在加载日志检索台…</div>}>
              <LogExplorer />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  )
}
