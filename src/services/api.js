import axios from "axios";

const api = axios.create({ baseURL: 'https://transcriptionspsicbef-production.up.railway.app/api' });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// AUTH
export const register = (data) => api.post("/auth/register", data);
export const login = (data) => api.post("/auth/login", data);
export const obtenerPerfil = () => api.get("/auth/perfil");
export const actualizarPerfil = (data) => api.put("/auth/perfil", data);

// AUDIO
export const subirAudio = (formData) => api.post("/audio/upload", formData);
export const obtenerEstado = (id) => api.get(`/audio/${id}/estado`);

// TRANSCRIPCIONES
export const listarTranscripciones = () => api.get("/transcripciones");
export const obtenerTranscripcion = (id) => api.get(`/transcripciones/${id}`);
export const eliminarTranscripcion = (id) =>
  api.delete(`/transcripciones/${id}`);
export const resumirTranscripcion = (id) =>
  api.post(`/transcripciones/${id}/resumir`);

export default api;
