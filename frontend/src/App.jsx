import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'

const ChatPage = lazy(() => import('./pages/ChatPage'))
const AddUserPage = lazy(() => import('./pages/AddUserPage'))
const UsersListPage = lazy(() => import('./pages/UsersListPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function Loader() {
  return <div className="p-6 animate-pulse">Loading...</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Suspense fallback={<Loader />}><ChatPage /></Suspense>} />
        <Route path="add-user" element={<Suspense fallback={<Loader />}><AddUserPage /></Suspense>} />
        <Route path="users" element={<Suspense fallback={<Loader />}><UsersListPage /></Suspense>} />
        <Route path="profile" element={<Suspense fallback={<Loader />}><ProfilePage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<Loader />}><SettingsPage /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
