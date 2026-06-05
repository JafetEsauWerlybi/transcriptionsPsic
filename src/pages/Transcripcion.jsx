import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { obtenerTranscripcion, resumirTranscripcion } from '../services/api'
import './Transcripcion.css'

function formatDuracion(seg) {
  if (!seg) return '—'
  const m = Math.floor(seg / 60)
  const s = Math.floor(seg % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatTiempo(seg) {
  const m = Math.floor(seg / 60)
  const s = Math.floor(seg % 60)
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

const COLORES = ['var(--accent)', 'var(--accent2)', 'var(--warn)', '#ff9d5a', '#c45aff']

export default function Transcripcion() {
  const { id }                          = useParams()
  const navigate                        = useNavigate()
  const [trans,       setTrans]         = useState(null)
  const [loading,     setLoading]       = useState(true)
  const [tab,         setTab]           = useState('locutor') // locutor | completo
  const [resumiendo,  setResumiendo]    = useState(false)
  const [errorMsg,    setErrorMsg]      = useState('')

  async function cargar() {
    try {
      const { data } = await obtenerTranscripcion(id)
      setTrans(data)
    } catch { navigate('/') }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [id])

  async function handleResumir() {
    setResumiendo(true)
    setErrorMsg('')
    try {
      const { data } = await resumirTranscripcion(id)
      setTrans(t => ({ ...t, resumen: data.resumen }))
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error al generar resumen')
    } finally {
      setResumiendo(false)
    }
  }

  function colorLocutor(id) {
    return COLORES[id?.charCodeAt(0) % COLORES.length]
  }

  if (loading) return (
    <div className="trans-loading">
      <div className="loader-ring" />
      <p>Cargando transcripción...</p>
    </div>
  )

  if (!trans) return null

  const { locutores = [], textoCompleto, resumen, estado, duracionSegundos, creadoEn, tipo } = trans

  return (
    <div className="trans-detail">
      {/* Header */}
      <div className="td-header">
        <button className="btn-ghost back-btn" onClick={() => navigate('/')}>
          ← Volver
        </button>
        <div className="td-meta">
          <span className={`badge ${estado === 'completado' ? 'badge-green' : estado === 'procesando' ? 'badge-yellow' : 'badge-red'}`}>
            {estado}
          </span>
          <span className="td-info">{tipo === 'archivo' ? '📁 Archivo' : '🎙 En vivo'}</span>
          <span className="td-info">⏱ {formatDuracion(duracionSegundos)}</span>
          <span className="td-info">👥 {locutores.length} locutor{locutores.length !== 1 ? 'es' : ''}</span>
          <span className="td-info">📅 {new Date(creadoEn).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })}</span>
        </div>
      </div>

      {estado === 'procesando' && (
        <div className="td-processing card">
          <div className="proc-dots"><span /><span /><span /></div>
          <p>Tu audio se está transcribiendo. Regresa en unos minutos.</p>
        </div>
      )}

      {estado === 'completado' && (
        <>
          {/* Resumen IA */}
          <div className="td-resumen card">
            <div className="resumen-header">
              <div>
                <h2>Resumen con IA</h2>
                <p className="resumen-sub">Generado por Claude · análisis de la conversación</p>
              </div>
              {!resumen && (
                <button
                  className="btn-primary"
                  onClick={handleResumir}
                  disabled={resumiendo}
                >
                  {resumiendo
                    ? <><span className="spinner-sm-dark" /> Analizando...</>
                    : '✨ Generar resumen'}
                </button>
              )}
            </div>
            {errorMsg && <div className="td-error">{errorMsg}</div>}
            {resumen ? (
              <div className="resumen-content">
                {resumen.split('\n').map((linea, i) => (
                  linea.trim() ? <p key={i}>{linea}</p> : <br key={i} />
                ))}
              </div>
            ) : (
              !resumiendo && (
                <p className="resumen-placeholder">
                  Haz clic en "Generar resumen" para que Claude analice esta transcripción
                  y extraiga puntos clave, tareas y compromisos por locutor.
                </p>
              )
            )}
            {resumiendo && (
              <div className="resumen-loading">
                <div className="proc-dots"><span /><span /><span /></div>
                <p>Claude está analizando la transcripción...</p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="td-tabs">
            <button className={`td-tab ${tab === 'locutor' ? 'active' : ''}`} onClick={() => setTab('locutor')}>
              Por locutor
            </button>
            <button className={`td-tab ${tab === 'completo' ? 'active' : ''}`} onClick={() => setTab('completo')}>
              Texto completo
            </button>
          </div>

          {/* Vista por locutor */}
          {tab === 'locutor' && (
            <div className="td-speakers">
              {locutores.map(loc => (
                <div key={loc.id} className="speaker-block card">
                  <div className="speaker-title" style={{ color: colorLocutor(loc.id) }}>
                    Locutor {loc.id}
                    <span className="speaker-count">{loc.segmentos.length} segmentos</span>
                  </div>
                  <div className="speaker-segs">
                    {loc.segmentos.map((seg, i) => (
                      <div key={i} className="seg-item">
                        <span className="seg-time">{formatTiempo(seg.inicio)}</span>
                        <p className="seg-txt">{seg.texto}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vista texto completo */}
          {tab === 'completo' && (
            <div className="td-full card">
              <p className="td-full-text">{textoCompleto}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
