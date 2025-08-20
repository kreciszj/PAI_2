import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Movies from './pages/Movies';
import Blogs from './pages/Blogs';
import MyBlog from './pages/MyBlog';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import MovieDetails from './pages/MovieDetails';

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
          <Route
            path="/"
            element={
              <Private>
                <Layout />
              </Private>
            }
          >
            <Route index element={<Movies />} />
            <Route path="blogs" element={<Blogs />} />
            <Route path="my-blog" element={<MyBlog />} />
            <Route path="settings" element={<Settings />} />
            <Route path="movies/:id" element={<MovieDetails />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
