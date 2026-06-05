# PROYECTO: App de Transcripción con Diarización — PsicoAudios

Una aplicación web y móvil (Android / Google Play) que permite:

1. **Subir archivos de audio** y transcribirlos automáticamente, separando las voces de cada locutor
2. **Usar el micrófono en tiempo real** y transcribir en vivo, también separando locutores

Post-procesamiento inteligente con Claude API: resúmenes, minutas, puntos clave por locutor.

---

## Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| **Backend** | Node.js + Express + WebSockets (ws) | Único backend para web y móvil |
| **Transcripción** | AssemblyAI | Diarización incluida, $50 crédito gratis |
| **Base de datos** | Azure Cosmos DB (NoSQL) | Free tier disponible |
| **Storage de audios** | Azure Blob Storage | ~$0.018/GB/mes |
| **Autenticación** | JWT + bcrypt | Sin terceros por ahora |
| **Frontend web** | React + Vite | |
| **App móvil** | React Native | Android primero, Google Play |
| **Hosting Backend** | Railway | Plan Hobby ~$87 MXN/mes |
| **Hosting Frontend** | Azure Static Web Apps | Gratis |
| **Post-procesamiento IA** | Claude API (Anthropic) | Resúmenes, minutas, tareas |

---

## Por qué estas decisiones

- **AssemblyAI sobre Deepgram**: diarización más barata (+$0.02/hr vs +$0.12/hr) y más precisa en audio con interrupciones. Precio base $0.0025/min.
- **Railway sobre Azure App Service**: más simple para Node.js, WebSockets sin config extra, deploy desde GitHub. ~$87 MXN/mes.
- **Cosmos DB NoSQL**: los datos de transcripción son documentos naturalmente, sin esquema rígido, fácil de agregar campos.
- **React Native**: reutiliza ~70% del código del frontend web.
- **Un solo backend**: tanto la web como la app móvil consumen las mismas rutas REST y el mismo WebSocket.

---

## Arquitectura

```
React Web          React Native App
     │                    │
     └──────────┬──────────┘
           REST / WS
                │
     ┌──────────▼──────────┐
     │   RAILWAY            │
     │   Node.js + Express  │
     │   WebSocket (ws)     │
     │   Multer             │
     │   AssemblyAI SDK     │
     │   Claude API SDK     │
     └──────┬──────────┬───┘
            │          │
     ┌──────▼──┐  ┌────▼────────┐
     │  Azure  │  │  Azure      │
     │  Blob   │  │  Cosmos DB  │
     │ (audio) │  │  (datos)    │
     └─────────┘  └─────────────┘
```

---

## Estructura del proyecto Frontend (React + Vite)

```
src/
├── components/
│   └── Layout.jsx          # Sidebar + wrapper de navegación principal
├── pages/
│   ├── Login.jsx            # Autenticación
│   ├── Register.jsx         # Registro
│   ├── Dashboard.jsx        # Listado de transcripciones del usuario
│   ├── SubirAudio.jsx       # Upload de archivo + polling de estado
│   ├── TiempoReal.jsx       # Grabación en vivo por micrófono (WebSocket)
│   └── Transcripcion.jsx    # Vista detallada: resumen IA, segmentos por locutor
├── context/
│   └── AuthContext.jsx      # Estado global de auth (token en localStorage)
├── services/
│   └── api.js               # Instancia Axios — base URL /api, auto-auth header
├── App.jsx                  # Router con PrivateRoute
└── index.css                # Variables CSS globales (colores, spacing, tipografía)
```

## Comandos frontend

```bash
npm run dev      # Servidor de desarrollo en http://localhost:5173
npm run build    # Build de producción
npm run preview  # Previsualizar build
```

Proxy Vite: `/api` → `http://localhost:3000` | `/ws` → `ws://localhost:3000`

---

## Estructura del proyecto Backend (Node.js)

```
backend/
├── src/
│   ├── config/
│   │   ├── azure.js              # Blob Storage + Cosmos DB
│   │   └── assemblyai.js         # AssemblyAI SDK
│   ├── routes/
│   │   ├── auth.js               # POST /register, POST /login
│   │   ├── audio.js              # POST /upload, GET /:id/estado
│   │   └── transcripciones.js    # CRUD + /resumir
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── audioController.js
│   │   └── transcripcionController.js
│   ├── middleware/
│   │   ├── auth.js               # Verificar JWT
│   │   └── upload.js             # Multer config
│   ├── services/
│   │   ├── assemblyService.js    # Lógica transcripción
│   │   ├── blobService.js        # Azure Blob
│   │   ├── claudeService.js      # Resúmenes con Claude
│   │   └── cosmosService.js      # Leer/escribir Cosmos DB
│   ├── websocket/
│   │   └── transcribeSocket.js   # Tiempo real
│   └── index.js
├── .env
├── package.json
└── railway.toml
```

---

## Endpoints de la API

```
AUTH
POST   /api/auth/register
POST   /api/auth/login

AUDIO
POST   /api/audio/upload              → Recibe archivo, sube a Blob, manda a AssemblyAI
GET    /api/audio/:id/estado          → Polling del estado de transcripción

TRANSCRIPCIONES
GET    /api/transcripciones           → Lista del usuario autenticado
GET    /api/transcripciones/:id       → Detalle completo con segmentos por locutor
DELETE /api/transcripciones/:id       → Eliminar
POST   /api/transcripciones/:id/resumir → Llama a Claude API

WEBSOCKET
WS     /ws/live                       → Streaming micrófono en tiempo real
```

---

## Flujos principales

### Flujo 1 — Subir audio

```
1. Usuario sube archivo (mp3, wav, m4a)
2. Multer recibe el archivo en el backend
3. Se sube a Azure Blob Storage → obtiene URL pública
4. Se manda URL a AssemblyAI con diarización activada
5. AssemblyAI devuelve transcript_id
6. Se guarda en Cosmos DB con estado "procesando"
7. Cliente hace polling cada 3s a /audio/:id/estado
8. AssemblyAI termina → backend actualiza Cosmos DB a "completado"
9. Cliente muestra transcripción con locutores separados
```

### Flujo 2 — Micrófono en tiempo real

```
1. Cliente abre WebSocket a /ws/live
2. Backend abre WebSocket hacia AssemblyAI
3. Cliente captura audio con MediaRecorder (web) o expo-av (mobile)
4. Envía chunks de audio cada 250ms al backend via WS
5. Backend reenvía chunks a AssemblyAI
6. AssemblyAI devuelve texto parcial + locutor en tiempo real
7. Backend reenvía al cliente
8. Al terminar, se guarda transcripción completa en Cosmos DB
```

### Flujo 3 — Post-procesamiento con Claude

```
1. Transcripción ya guardada en Cosmos DB
2. Usuario solicita resumen o minuta
3. Backend obtiene el texto de Cosmos DB
4. Lo envía a Claude API con prompt especializado
5. Claude devuelve resumen, puntos clave, tareas por locutor
6. Se guarda resultado y se muestra al usuario
```

---

## Modelo de datos Cosmos DB

```json
{
  "id": "trans-uuid",
  "usuarioId": "user-uuid",
  "tipo": "archivo | tiempo_real",
  "estado": "procesando | completado | error",
  "audioUrl": "https://blob.azure.com/...",
  "duracionSegundos": 183,
  "locutores": [
    {
      "id": "A",
      "segmentos": [
        { "inicio": 0.0, "fin": 3.5, "texto": "Buenos días a todos" }
      ]
    },
    {
      "id": "B",
      "segmentos": [
        { "inicio": 4.1, "fin": 7.8, "texto": "Hola, gracias por unirse" }
      ]
    }
  ],
  "textoCompleto": "Buenos días a todos. Hola, gracias por unirse...",
  "resumen": null,
  "puntosClave": [],
  "creadoEn": "2026-06-01T10:00:00Z"
}
```

---

## Costos estimados mensuales (MXN)

| Servicio | USD/mes | MXN/mes (~$17.33) |
|---|---|---|
| Railway Hobby | $5 | ~$87 |
| AssemblyAI (uso moderado) | $0–10 | $0–$173 |
| Azure Cosmos DB (free tier) | $0 | $0 |
| Azure Blob Storage | ~$1 | ~$17 |
| Claude API | ~$2–5 | ~$35–87 |
| **Total** | **~$8–21** | **~$139–363** |

---

## Fases de desarrollo

```
Semana 1–2   Setup: Railway, Azure, AssemblyAI, estructura base Node.js
Semana 3–4   Auth + subida de archivos + transcripción básica
Semana 5–6   WebSocket tiempo real con micrófono
Semana 7     Integración Claude API (resúmenes y minutas)
Semana 8     Frontend React web conectado al backend
Semana 9–10  React Native para Android
Semana 11–12 Pruebas, pulir, publicar en Google Play
```

---

## Estado actual del proyecto

- [x] Decisiones de arquitectura tomadas
- [x] Stack tecnológico definido
- [x] Flujos diseñados
- [x] Modelo de datos definido
- [x] Frontend React (UI en revisión de UX)
- [ ] Auth re-activada (actualmente desactivada para desarrollo de UI)
- [ ] Setup inicial del backend Node.js
- [ ] Conexión Azure (Blob + Cosmos DB)
- [ ] Integración AssemblyAI
- [ ] Auth con JWT
- [ ] WebSocket tiempo real
- [ ] App React Native
- [ ] Publicación Google Play

---

## Notas de desarrollo

- **Auth desactivada temporalmente**: Las llamadas API en `Login.jsx` y `Register.jsx` están comentadas. `PrivateRoute` hace bypass. Re-activar antes de conectar al backend real.
- **Foco actual**: revisión y mejoras de UX/UI en el frontend React.
- **Sin TypeScript por ahora** — proyecto en JS/JSX.
- **Sin librerías de componentes UI** — todo el diseño es CSS propio con variables en `index.css`.

---

## Links de referencia

- AssemblyAI docs: https://www.assemblyai.com/docs
- Azure Cosmos DB: https://learn.microsoft.com/azure/cosmos-db
- Azure Blob Storage: https://learn.microsoft.com/azure/storage/blobs
- Railway: https://railway.app
- Claude API: https://console.anthropic.com
- React Native: https://reactnative.dev