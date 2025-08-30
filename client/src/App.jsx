import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Movies from './pages/Movies';
import MoviesTop from './pages/MoviesTop';
import Blogs from './pages/Blogs';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import MovieDetails from './pages/MovieDetails';
import Register from './pages/Register';
import BlogPost from './pages/BlogPost';
import AdminMovieNew from './pages/AdminMovieNew.jsx';

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
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Private><Layout /></Private>}>
            <Route index element={<Movies />} />
            <Route path="top" element={<MoviesTop />} />
            <Route path="blogs" element={<Blogs />} />
            <Route path="blogs/:id" element={<BlogPost />} />
            <Route path="settings" element={<Settings />} />
            <Route path="movies/:id" element={<MovieDetails />} />
            <Route path="/admin/movies/new" element={<AdminMovieNew />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
