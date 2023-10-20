import './App.css'
import { Route, Routes } from 'react-router-dom'
import { routes } from './router'
import { PrivateRoute } from './components/PrivateRoute.tsx'
function App() {
  return (
    <Routes>
      {routes.map((route) =>
        route.auth ? (
          <Route
            path={route.path}
            key={route.path}
            element={<PrivateRoute>{route.component}</PrivateRoute>}
          />
        ) : (
          <Route path={route.path} key={route.path} element={route.component} />
        ),
      )}
    </Routes>
  )
}

export default App
