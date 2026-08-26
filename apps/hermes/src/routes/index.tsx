import { lazy, Suspense, type ReactNode } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Spinner } from '@atlas/ui/spinner'
import { HermesLayout } from '@/layouts'
import { AuthCallback } from '@/pages/auth/Callback'
import { DomainPicker } from '@/pages/DomainPicker'
import { Dashboard } from '@/pages/Dashboard'
import { CapabilityPreview } from '@/pages/CapabilityPreview'
import { NotFound } from '@/pages/NotFound'

const ServiceManagement = lazy(() =>
  import('@/pages/ServiceManagement').then(module => ({ default: module.ServiceManagement }))
)
const ApplicationManagement = lazy(() =>
  import('@/pages/ApplicationManagement').then(module => ({
    default: module.ApplicationManagement,
  }))
)
const GroupManagement = lazy(() =>
  import('@/pages/GroupManagement').then(module => ({ default: module.GroupManagement }))
)
const DomainSettings = lazy(() =>
  import('@/pages/DomainSettings').then(module => ({ default: module.DomainSettings }))
)

const RelationshipManagement = lazy(() =>
  import('@/pages/RelationshipManagement').then(module => ({
    default: module.RelationshipManagement,
  }))
)

function LazyBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-56 items-center justify-center" role="status">
          <Spinner className="size-7" />
          <span className="sr-only">正在加载管理工作台</span>
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
      <Route path="/" element={<DomainPicker />} />
      <Route path="/d/:domainId" element={<HermesLayout />}>
        <Route index element={<Dashboard />} />
        <Route
          path="services/*"
          element={
            <LazyBoundary>
              <ServiceManagement />
            </LazyBoundary>
          }
        />
        <Route
          path="applications/*"
          element={
            <LazyBoundary>
              <ApplicationManagement />
            </LazyBoundary>
          }
        />
        <Route
          path="groups/*"
          element={
            <LazyBoundary>
              <GroupManagement />
            </LazyBoundary>
          }
        />
        <Route
          path="relationships/*"
          element={
            <LazyBoundary>
              <RelationshipManagement />
            </LazyBoundary>
          }
        />
        <Route
          path="settings"
          element={
            <LazyBoundary>
              <DomainSettings />
            </LazyBoundary>
          }
        />
        <Route path="users" element={<CapabilityPreview capability="users" />} />
        <Route path="audit" element={<CapabilityPreview capability="audit" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
