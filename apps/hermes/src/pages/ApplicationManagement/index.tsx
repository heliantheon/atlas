import { Routes, Route } from 'react-router-dom'
import { List } from './List'
import { Create } from './Create'
import { Detail } from './Detail'
import { Edit } from './Edit'

export function ApplicationManagement() {
  return (
    <Routes>
      <Route index element={<List />} />
      <Route path="create" element={<Create />} />
      <Route path=":appId" element={<Detail />} />
      <Route path=":appId/edit" element={<Edit />} />
    </Routes>
  )
}
