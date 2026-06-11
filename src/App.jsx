import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Transcripcion from "./pages/Transcripcion";
import SubirAudio from "./pages/SubirAudio";
import TiempoReal from "./pages/TiempoReal";
import Perfil from "./pages/Perfil";
import Layout from "./components/Layout";

function PrivateRoute({ children }) {
  const { isAuth } = useAuth();
  return isAuth ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="subir" element={<SubirAudio />} />
          <Route path="tiempo-real" element={<TiempoReal />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="t/:id" element={<Transcripcion />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
