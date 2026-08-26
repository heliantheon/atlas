import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spinner } from '@heliannuuthus/ui'
import { List } from './List'
import { Detail } from './Detail'
import { Edit } from './Edit'

const RelationshipManagement = lazy(() =>
  import('@/pages/RelationshipManagement').then(module => ({
    default: module.RelationshipManagement,
  }))
)

export function ServiceManagement() {
  return (
    <Routes>
      <Route index element={<List />} />
      <Route path="create" element={<Navigate to=".." state={{ openCreate: true }} replace />} />
      <Route path=":serviceId" element={<Detail />} />
      <Route path=":serviceId/edit" element={<Edit />} />
      <Route
        path=":serviceId/relationships/*"
        element={
          <Suspense
            fallback={
              <div className="flex min-h-56 items-center justify-center">
                <Spinner className="size-7" />
              </div>
            }
          >
            <RelationshipManagement />
          </Suspense>
        }
      />
    </Routes>
  )
}
