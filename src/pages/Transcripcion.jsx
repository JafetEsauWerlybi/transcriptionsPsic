import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { obtenerTranscripcion, resumirTranscripcion } from '../services/api'
import 'bootstrap-icons/font/bootstrap-icons.css'
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
  const [tab,         setTab]           = useState('timeline')
  const [resumiendo,  setResumiendo]    = useState(false)
  const [errorMsg,    setErrorMsg]      = useState('')
  const [editandoLocutores, setEditandoLocutores] = useState(false)
  const [nombresLocutores, setNombresLocutores] = useState({})
  const [guardandoNombres, setGuardandoNombres] = useState(false)
  const [resumenExpanded, setResumenExpanded] = useState(false)

  async function cargar() {
    try {
      const { data } = await obtenerTranscripcion(id)
      setTrans(data)
      setNombresLocutores(data.nombresLocutores || {})
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

  function obtenerNombreLocutor(id) {
    return nombresLocutores[id] || `Locutor ${id}`
  }

  function renderConFormato(texto) {
    const partes = texto.split(/(\*\*[^*]+\*\*)/g)
    return partes.map((parte, i) => {
      if (parte.startsWith('**') && parte.endsWith('**')) {
        return <strong key={i}>{parte.slice(2, -2)}</strong>
      }
      return parte
    })
  }

  function parseResumen(texto) {
    if (!texto) return []

    const bloques = []
    const lineas = texto.split('\n')
    let i = 0

    while (i < lineas.length) {
      const linea = lineas[i]
      const trimmed = linea.trim()

      // Saltar vacías y separadores
      if (!trimmed || trimmed === '---' || trimmed === '|---|---|') {
        i++
        continue
      }

      // Títulos con # o numerados (1., 2., etc)
      if (trimmed.match(/^#+\s/) || trimmed.match(/^\d+\.\s+/)) {
        const titulo = trimmed.replace(/^#+\s*|\d+\.\s+/, '').trim()
        bloques.push({ tipo: 'titulo', contenido: titulo })
        i++
      }
      // Bloque de nota (>)
      else if (trimmed.startsWith('>')) {
        const nota = trimmed.replace(/^>\s*/, '').trim()
        bloques.push({ tipo: 'nota', contenido: nota })
        i++
      }
      // Tabla (detectar por |)
      else if (trimmed.startsWith('|')) {
        const filas = []
        while (i < lineas.length && lineas[i].trim().startsWith('|')) {
          const lineaTabla = lineas[i].trim()
          // Saltar líneas de separador (|---|---|)
          if (!lineaTabla.match(/^\|[-:\s|]+\|?$/)) {
            const fila = lineaTabla.split('|').filter(c => c.trim())
            if (fila.length > 0) filas.push(fila)
          }
          i++
        }
        if (filas.length > 0) bloques.push({ tipo: 'tabla', filas })
      }
      // Lista de items
      else if (trimmed.match(/^[-*]\s/) || trimmed.match(/^\d+\.\s/)) {
        const items = []
        while (i < lineas.length) {
          const l = lineas[i].trim()
          if (!l || !l.match(/^[-*]\s/) && !l.match(/^\d+\.\s/)) break
          const item = l.replace(/^[-*]\s+|\d+\.\s+/, '').trim()
          items.push(item)
          i++
        }
        bloques.push({ tipo: 'items', items })
      }
      // Párrafo normal
      else {
        let parrafo = trimmed
        i++
        while (i < lineas.length) {
          const siguiente = lineas[i].trim()
          if (!siguiente || siguiente.match(/^[#|>*\-]/) || siguiente.match(/^\d+\./)) break
          parrafo += ' ' + siguiente
          i++
        }
        bloques.push({ tipo: 'parrafo', contenido: parrafo })
      }
    }

    return bloques
  }

  async function guardarNombresLocutores() {
    setGuardandoNombres(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/transcripciones/${id}/nombres-locutores`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nombresLocutores })
      })
      if (res.ok) setEditandoLocutores(false)
    } catch (err) {
      console.error(err)
    } finally {
      setGuardandoNombres(false)
    }
  }

  function obtenerSegmentosOrdenados() {
    const segmentos = []
    trans.locutores.forEach(locutor => {
      locutor.segmentos.forEach(seg => {
        segmentos.push({ ...seg, locutor: locutor.id })
      })
    })
    return segmentos.sort((a, b) => a.inicio - b.inicio)
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
      <div className="td-header">
        <button className="btn-ghost back-btn" onClick={() => navigate('/')}>
          <i className="bi bi-arrow-left" /> Volver
        </button>
        <div className="td-meta">
          <span className={`badge ${estado === 'completado' ? 'badge-green' : estado === 'procesando' ? 'badge-yellow' : 'badge-red'}`}>
            {estado}
          </span>
          <span className="td-info"><i className={`bi ${tipo === 'archivo' ? 'bi-file-earmark-audio' : 'bi-mic'}`} /> {tipo === 'archivo' ? 'Archivo' : 'En vivo'}</span>
          <span className="td-info"><i className="bi bi-hourglass-split" /> {formatDuracion(duracionSegundos)}</span>
          <span className="td-info"><i className="bi bi-people" /> {locutores.length} locutor{locutores.length !== 1 ? 'es' : ''}</span>
          <span className="td-info"><i className="bi bi-calendar" /> {new Date(creadoEn).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })}</span>
        </div>
      </div>

      {trans.audioUrl && (
        <div className="td-player card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <i className="bi bi-volume-up" style={{ fontSize: '20px', color: 'var(--accent)' }} />
            <audio controls style={{ flex: 1, height: '40px' }}>
              <source src={`/api/audio/${id}/download`} type="audio/mp4" />
              Tu navegador no soporta reproducción de audio
            </audio>
          </div>
        </div>
      )}

      {estado === 'procesando' && (
        <div className="td-processing card">
          <div className="proc-dots"><span /><span /><span /></div>
          <p>Tu audio se está transcribiendo. Regresa en unos minutos.</p>
        </div>
      )}

      {estado === 'completado' && (
        <div className="locutores-section card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <p className="locutores-label">Locutores encontrados:</p>
              <div className="locutores-list">
                {locutores.map((loc) => (
                  <span key={loc.id} className="locutor-tag" style={{ borderColor: colorLocutor(loc.id), color: colorLocutor(loc.id) }}>
                    {obtenerNombreLocutor(loc.id)}
                  </span>
                ))}
              </div>
            </div>
            <button
              className="btn-icon"
              onClick={() => setEditandoLocutores(true)}
              title="Editar nombres de locutores"
              style={{ marginTop: '4px' }}
            >
              <i className="bi bi-pencil" />
            </button>
          </div>
        </div>
      )}

      {estado === 'completado' && (
        <>
          <div className="td-resumen card">
            <button
              className="resumen-toggle"
              onClick={() => setResumenExpanded(!resumenExpanded)}
            >
              <div className="resumen-toggle-head">
                <h2>Resumen con IA</h2>
                <p className="resumen-sub">Generado por Claude · análisis de la conversación</p>
              </div>
              <i className={`bi ${resumenExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
            </button>

            {resumenExpanded && (
              <>
                {errorMsg && <div className="td-error">{errorMsg}</div>}
                {resumen ? (
                  <div className="resumen-content">
                    {parseResumen(resumen).map((bloque, i) => (
                      <div key={i}>
                        {bloque.tipo === 'titulo' && <h3 className="resumen-title">{renderConFormato(bloque.contenido)}</h3>}
                        {bloque.tipo === 'parrafo' && <p className="resumen-text">{renderConFormato(bloque.contenido)}</p>}
                        {bloque.tipo === 'items' && (
                          <div className="resumen-items">
                            {bloque.items.map((item, j) => (
                              <div key={j} className="resumen-item">
                                <span className="item-dot" />
                                <span>{renderConFormato(item)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {bloque.tipo === 'tabla' && (
                          <div className="resumen-tabla">
                            {bloque.filas.map((fila, j) => (
                              <div key={j} className={`tabla-fila ${j === 0 ? 'tabla-header' : ''}`}>
                                {fila.map((celda, k) => (
                                  <div key={k} className="tabla-celda">{renderConFormato(celda)}</div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                        {bloque.tipo === 'nota' && (
                          <div className="resumen-nota">
                            <i className="bi bi-exclamation-circle" />
                            <span>{renderConFormato(bloque.contenido)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : !resumiendo ? (
                  <div style={{ padding: '20px 0' }}>
                    <p className="resumen-placeholder">
                      Haz clic en "Generar resumen" para que Claude analice esta transcripción
                      y extraiga puntos clave, tareas y compromisos por locutor.
                    </p>
                    <button
                      className="btn-primary"
                      onClick={handleResumir}
                      disabled={resumiendo}
                      style={{ marginTop: '12px' }}
                    >
                      {resumiendo
                        ? <><span className="spinner-sm-dark" /> Analizando...</>
                        : <><i className="bi bi-stars" /> Generar resumen</>}
                    </button>
                  </div>
                ) : (
                  <div className="resumen-loading">
                    <div className="proc-dots"><span /><span /><span /></div>
                    <p>Claude está analizando la transcripción...</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="td-tabs">
            <button className={`td-tab ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}>
              <i className="bi bi-diagram-2" /> Timeline
            </button>
            <button className={`td-tab ${tab === 'locutor' ? 'active' : ''}`} onClick={() => setTab('locutor')}>
              Por locutor
            </button>
            <button className={`td-tab ${tab === 'completo' ? 'active' : ''}`} onClick={() => setTab('completo')}>
              Texto completo
            </button>
          </div>

          {tab === 'timeline' && (
            <div className="timeline-simple card">
              {obtenerSegmentosOrdenados().map((seg, i) => (
                <div key={i} className="timeline-line">
                  <span className="timeline-time">{formatTiempo(seg.inicio)}</span>
                  <span className="timeline-speaker" style={{ color: colorLocutor(seg.locutor) }}>{obtenerNombreLocutor(seg.locutor)}:</span>
                  <span className="timeline-text">{seg.texto}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'locutor' && (
            <div className="td-speakers">
              {locutores.map(loc => (
                <div key={loc.id} className="speaker-block card">
                  <div className="speaker-title" style={{ color: colorLocutor(loc.id) }}>
                    {obtenerNombreLocutor(loc.id)}
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

          {tab === 'completo' && (
            <div className="td-full card">
              <p className="td-full-text">{textoCompleto}</p>
            </div>
          )}
        </>
      )}

      {editandoLocutores && createPortal(
        <div className="modal-overlay" onClick={() => setEditandoLocutores(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar nombres de locutores</h2>
              <button className="modal-close" onClick={() => setEditandoLocutores(false)}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div className="modal-body">
              {locutores.map((loc) => (
                <div key={loc.id} className="edit-locutor-item">
                  <label>
                    <span className="edit-label">Locutor {loc.id}</span>
                    <input
                      type="text"
                      value={nombresLocutores[loc.id] || ''}
                      onChange={(e) => setNombresLocutores(prev => ({ ...prev, [loc.id]: e.target.value }))}
                      placeholder={`Locutor ${loc.id}`}
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setEditandoLocutores(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardarNombresLocutores} disabled={guardandoNombres}>
                {guardandoNombres ? <><span className="spinner-sm" /> Guardando...</> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
