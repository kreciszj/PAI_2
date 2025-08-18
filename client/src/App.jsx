import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';

function Private({ children }) {
  const { accessToken } = useAuth();
  return accessToken ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Private><Home /></Private>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
