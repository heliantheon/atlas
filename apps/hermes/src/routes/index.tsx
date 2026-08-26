import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Spinner } from '@atlas/ui/spinner'
import { HermesLayout } from '@/layouts'
import { AuthCallback } from '@/pages/auth/Callback'
import { DomainPicker } from '@/pages/DomainPicker'
import { Dashboard } from '@/pages/Dashboard'
import { ServiceManagement } from '@/pages/ServiceManagement'
import { ApplicationManagement } from '@/pages/ApplicationManagement'
import { GroupManagement } from '@/pages/GroupManagement'
import { CapabilityPreview } from '@/pages/CapabilityPreview'
import { NotFound } from '@/pages/NotFound'
import { DomainSettings } from '@/pages/DomainSettings'

const RelationshipManagement = lazy(() =>
  import('@/pages/RelationshipManagement').then(module => ({
    default: module.RelationshipManagement,
  }))
)

const relationshipElement = (
  <Suspense
    fallback={
      <div className="flex min-h-56 items-center justify-center">
        <Spinner className="size-7" />
      </div>
    }
  >
    <RelationshipManagement />
  </Suspense>
)

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<DomainPicker />} />
      <Route path="/d/:domainId" element={<HermesLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="services/*" element={<ServiceManagement />} />
        <Route path="applications/*" element={<ApplicationManagement />} />
        <Route path="groups/*" element={<GroupManagement />} />
        <Route path="relationships/*" element={relationshipElement} />
        <Route path="settings" element={<DomainSettings />} />
        <Route path="users" element={<CapabilityPreview capability="users" />} />
        <Route path="audit" element={<CapabilityPreview capability="audit" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
