import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { listarTranscripciones, eliminarTranscripcion } from "../services/api";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Dashboard.css";

function formatDuracion(seg) {
  if (!seg) return "—";
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function badgeEstado(estado) {
  const map = {
    completado: { cls: "badge-green", txt: "Completado" },
    procesando: { cls: "badge-yellow", txt: "Procesando" },
    error: { cls: "badge-red", txt: "Error" },
  };
  const b = map[estado] || { cls: "badge-yellow", txt: estado };
  return <span className={`badge ${b.cls}`}>{b.txt}</span>;
}

const IconFile = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const IconMic = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);
const IconTrash = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export default function Dashboard() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  async function cargar() {
    try {
      const { data } = await listarTranscripciones();
      setLista(data);
    } catch {
      /* sin token aún */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleEliminar(e, id) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("¿Eliminar esta transcripción?")) return;
    setDeleting(id);
    try {
      await eliminarTranscripcion(id);
      setLista((l) => l.filter((t) => t.id !== id));
    } catch {
      alert("Error al eliminar");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Mis transcripciones</h1>
          <p className="dash-sub">{lista.length} sesiones guardadas</p>
        </div>
        <div className="dash-actions">
          <Link to="/subir" className="btn-ghost">
            <IconFile /> Subir audio
          </Link>
          <Link to="/tiempo-real" className="btn-primary">
            <IconMic /> Grabar en vivo
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="dash-empty">
          <div className="loader-ring" />
          <p>Cargando...</p>
        </div>
      ) : lista.length === 0 ? (
        <div className="dash-empty">
          <i className="bi bi-mic empty-icon" />
          <h2>Sin transcripciones aún</h2>
          <p>Sube un archivo de audio o usa el micrófono para empezar</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <Link to="/subir" className="btn-ghost">
              <IconFile /> Subir audio
            </Link>
            <Link to="/tiempo-real" className="btn-primary">
              <IconMic /> Grabar en vivo
            </Link>
          </div>
        </div>
      ) : (
        <div className="trans-list">
          {lista.map((t, i) => (
            <Link
              key={t.id}
              to={`/t/${t.id}`}
              className="trans-row"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="trans-icon">
                {t.tipo === "archivo" ? <IconFile /> : <IconMic />}
              </div>
              <div className="trans-info">
                <span className="trans-date">{formatFecha(t.creadoEn)}</span>
                <span className="trans-preview">
                  {t.textoCompleto
                    ? t.textoCompleto.substring(0, 90) + "…"
                    : "Procesando transcripción..."}
                </span>
              </div>
              <div className="trans-meta">
                {badgeEstado(t.estado)}
                <span className="trans-dur">
                  {formatDuracion(t.duracionSegundos)}
                </span>
                <span className="trans-loc">
                  {t.locutores?.length || 0} locutor
                  {t.locutores?.length !== 1 ? "es" : ""}
                </span>
              </div>
              <button
                className="trans-del"
                onClick={(e) => handleEliminar(e, t.id)}
                disabled={deleting === t.id}
                title="Eliminar"
              >
                {deleting === t.id ? (
                  <span className="spinner-sm" />
                ) : (
                  <IconTrash />
                )}
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
