import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppShell, PageLoader } from '@/components/layout/AppShell'
import { AuthProvider, RequireAuth } from '@/state/auth'
import { ThemeProvider } from '@/state/theme'

const pages = {
  LiveMap: () => import('@/pages/LiveMap'),
  Analytics: () => import('@/pages/Analytics'),
  Trips: () => import('@/pages/Trips'),
  Charging: () => import('@/pages/Charging'),
  Parking: () => import('@/pages/Parking'),
  Geofence: () => import('@/pages/Geofence'),
  NotFound: () => import('@/pages/NotFound'),
}

const prefetch = () => Object.values(pages).forEach((load) => void load())

const Login = lazy(() => import('@/pages/Login'))
const LiveMap = lazy(pages.LiveMap)
const Analytics = lazy(pages.Analytics)
const Trips = lazy(pages.Trips)
const Charging = lazy(pages.Charging)
const Parking = lazy(pages.Parking)
const Geofence = lazy(pages.Geofence)
const NotFound = lazy(pages.NotFound)

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    ),
  },
  {
    element: (
      <RequireAuth>
        <AppShell prefetch={prefetch} />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <LiveMap /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'trips', element: <Trips /> },
      { path: 'charging', element: <Charging /> },
      { path: 'parking', element: <Parking /> },
      { path: 'geofence', element: <Geofence /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}
