import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Tasks from './pages/Tasks.jsx';
import Profile from './pages/Profile.jsx';
import Trash from './pages/Trash.jsx';

function Shell() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <>
      {isAuthenticated && <Navbar />}
      <Routes>
        <Route
          path="/login"
          element={!loading && isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={!loading && isAuthenticated ? <Navigate to="/" replace /> : <Register />}
        />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Tasks />} />
          <Route path="/trash" element={<Trash />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}