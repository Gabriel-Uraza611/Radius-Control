# Radius Control – Guía de construcción del MVP (7 h)

> Guía estricta para que un agente/equipo ejecute en orden. **No es código**, son los cimientos.
> Cada fase tiene criterio de aceptación: no pasar a la siguiente sin cumplirlo.

## 0. Alcance del MVP (lo único que importa hoy)

1. Registro / login de usuarios (JWT + persistencia en Postgres).
2. Mapa de Google Maps en el front.
3. Crear una alerta haciendo clic en el mapa (categoría + descripción).
4. Las alertas aparecen **en tiempo real** en todos los usuarios conectados (WebSocket).
5. **Detección de alertas duplicadas** (mismo robo/crimen) → se agrupan en un *incidente*.
6. Desplegable con `docker compose up`.

**Fuera de alcance:** cuadrantes policiales, panel de operador, mapa de calor, evidencia foto/audio, CAD, notificaciones push.

## 1. Stack y decisiones

| Capa | Decisión |
|---|---|
| Backend | Kotlin 2.x, Java 21, Maven, Spring Boot 3.x |
| Arquitectura | **Monolito modular** (paquetes por módulo, comunicación por servicios/eventos) |
| BD | PostgreSQL 16 (imagen `postgis/postgis` para escalar a cuadrantes luego) + Flyway |
| Auth | Spring Security + JWT (BCrypt) |
| Tiempo real | Spring WebSocket + **STOMP** (broker simple en memoria) |
| Front | React + TypeScript + Vite, Google Maps (`@vis.gl/react-google-maps`), `@stomp/stompjs` |
| Despliegue | Docker Compose: `db`, `backend`, `frontend` (nginx) |

**Contrato de API (fuente de verdad, ambos lados lo respetan):**

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | No | `{name,email,password}` → `{token,user}` |
| POST | `/api/auth/login` | No | `{email,password}` → `{token,user}` |
| GET | `/api/auth/me` | Sí | Usuario actual |
| POST | `/api/alerts` | Sí | `{category,description,lat,lng}` → incidente resultante + `merged` |
| GET | `/api/incidents/active` | Sí | Incidentes de las últimas 24 h |
| WS | `/ws` (STOMP) | Sí (JWT en header `Authorization` del CONNECT) | Suscribirse a `/topic/incidents` |

Evento WS (`/topic/incidents`): `{type: "INCIDENT_CREATED" | "INCIDENT_UPDATED", incident: {id,category,lat,lng,reportCount,lastReportedAt,description}}`

Categorías: `ROBBERY`, `ASSAULT`, `SUSPICIOUS`, `VANDALISM`, `OTHER`.

---

# PARTE 1 – BACKEND

## 1.1 Árbol de carpetas (monorepo)

```
radius-control/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── kotlin/com/radiuscontrol/
│       │   │   ├── RadiusControlApplication.kt
│       │   │   ├── shared/
│       │   │   │   ├── config/
│       │   │   │   │   ├── SecurityConfig.kt
│       │   │   │   │   ├── WebSocketConfig.kt
│       │   │   │   │   └── CorsConfig.kt
│       │   │   │   ├── error/
│       │   │   │   │   ├── ApiError.kt
│       │   │   │   │   └── GlobalExceptionHandler.kt
│       │   │   │   └── geo/
│       │   │   │       └── GeoUtils.kt
│       │   │   ├── user/
│       │   │   │   ├── User.kt
│       │   │   │   ├── UserRepository.kt
│       │   │   │   └── UserService.kt
│       │   │   ├── auth/
│       │   │   │   ├── AuthController.kt
│       │   │   │   ├── AuthDtos.kt
│       │   │   │   ├── AuthService.kt
│       │   │   │   ├── JwtService.kt
│       │   │   │   ├── JwtAuthFilter.kt
│       │   │   │   └── StompAuthInterceptor.kt
│       │   │   ├── alert/
│       │   │   │   ├── AlertController.kt
│       │   │   │   ├── AlertDtos.kt
│       │   │   │   ├── Category.kt
│       │   │   │   ├── Alert.kt
│       │   │   │   ├── Incident.kt
│       │   │   │   ├── AlertRepository.kt
│       │   │   │   ├── IncidentRepository.kt
│       │   │   │   ├── IncidentMatcher.kt
│       │   │   │   ├── AlertService.kt
│       │   │   │   └── IncidentEvent.kt
│       │   │   └── realtime/
│       │   │       └── IncidentBroadcaster.kt
│       │   └── resources/
│       │       ├── application.yml
│       │       └── db/migration/
│       │           └── V1__init.sql
│       └── test/kotlin/com/radiuscontrol/
│           ├── auth/AuthFlowTest.kt
│           └── alert/IncidentMatcherTest.kt
└── frontend/        (ver Parte 2)
```

## 1.2 Qué va en cada archivo y cómo se conecta

**Regla de módulos:** un módulo **nunca** usa el repositorio de otro; solo su *service* o eventos. `alert` no conoce WebSockets: publica un evento y `realtime` lo escucha.

### Raíz
- `docker-compose.yml`: servicios `db` (postgis/postgis:16-3.4, volumen persistente, healthcheck), `backend` (depende de `db` healthy, recibe env), `frontend` (nginx, expone 80).
- `.env.example`: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET` (≥32 chars), `JWT_EXPIRATION_MINUTES`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAP_ID`. Se copia a `.env` (no versionado).

### `backend/pom.xml`
Parent `spring-boot-starter-parent`. Plugin `kotlin-maven-plugin` con `compilerPlugins`: **`spring`** (all-open) y **`jpa`** (no-arg), `jvmTarget` 21. Dependencias: `web`, `security`, `data-jpa`, `websocket`, `validation`, `actuator`, `postgresql`, `flyway-core` + `flyway-database-postgresql`, `jackson-module-kotlin`, `kotlin-reflect`, `jjwt-api/impl/jackson`, y test (`spring-boot-starter-test`, `spring-security-test`, `testcontainers-postgresql`).

### `backend/Dockerfile`
Multi-stage: etapa 1 `maven:3-eclipse-temurin-21` ejecuta `mvn -DskipTests package`; etapa 2 `eclipse-temurin:21-jre` copia el jar y expone 8080.

### `resources/application.yml`
Datasource por variables de entorno, `jpa.hibernate.ddl-auto: validate` (el esquema lo manda Flyway), Flyway activo, `app.jwt.secret` y `app.jwt.expiration-minutes` desde env, `management.endpoints.web.exposure.include: health`.

### `db/migration/V1__init.sql`
- `CREATE EXTENSION IF NOT EXISTS postgis;` (a futuro; hoy se usan lat/lng simples).
- `users(id uuid PK, name, email UNIQUE, password_hash, created_at)`.
- `incidents(id uuid PK, category, description, lat, lng, report_count, first_reported_at, last_reported_at)` + índice `(category, last_reported_at)` y `(lat, lng)`.
- `alerts(id uuid PK, user_id FK, incident_id FK, category, description, lat, lng, created_at)` + `UNIQUE (user_id, incident_id)` (un usuario no infla un mismo incidente).

### `shared/`
- `SecurityConfig.kt`: stateless; permite `/api/auth/**`, `/ws/**` (la auth del WS va en el interceptor STOMP), `/actuator/health`; el resto exige JWT. Registra `JwtAuthFilter` antes del filtro de usuario/contraseña. Bean `PasswordEncoder` (BCrypt).
- `CorsConfig.kt`: orígenes permitidos (`http://localhost:5173`, `http://localhost`) para desarrollo.
- `WebSocketConfig.kt`: endpoint `/ws` (SockJS **no**, WebSocket nativo), broker simple en `/topic`, prefijo de app `/app`; registra `StompAuthInterceptor` en el canal de entrada.
- `ApiError.kt` + `GlobalExceptionHandler.kt`: respuestas de error uniformes `{status,message,fieldErrors?}` para validación, credenciales inválidas, email duplicado, no encontrado.
- `GeoUtils.kt`: función Haversine (distancia en metros) y cálculo de *bounding box* (lat/lng mín-máx dado centro y radio). Lo usa solo `alert`.

### `user/`
- `User.kt`: entidad JPA. `UserRepository.kt`: `findByEmail`, `existsByEmail`. `UserService.kt`: crear usuario (hash ya recibido), buscar por email/id. **No sabe de JWT.**

### `auth/`
- `AuthDtos.kt`: `RegisterRequest`, `LoginRequest` (con validaciones), `AuthResponse(token, user)`, `UserDto` (nunca expone `password_hash`).
- `AuthService.kt`: registro (valida email único → BCrypt → `UserService` → `JwtService`) y login (verifica hash).
- `JwtService.kt`: genera y valida tokens (subject = userId, claims email/name), firma HS256 con `JWT_SECRET`.
- `JwtAuthFilter.kt`: lee `Authorization: Bearer`, valida y puebla el `SecurityContext`.
- `StompAuthInterceptor.kt`: en el frame `CONNECT` lee el header `Authorization`, valida con `JwtService`; si falla, rechaza la conexión. Esto asegura que el WS tiene la misma seguridad que REST.
- `AuthController.kt`: `/register`, `/login`, `/me`.

### `alert/` (núcleo del dominio)
- `Category.kt`: enum de categorías.
- `Incident.kt`: **un crimen real** (centroide, categoría, contador de reportes, ventana de tiempo). `Alert.kt`: **un reporte individual** de un usuario, siempre ligado a un incidente.
- `AlertRepository.kt` / `IncidentRepository.kt`: el de incidentes tiene la query de candidatos (misma categoría, `last_reported_at` ≥ ahora−30 min, dentro del bounding box) y la de activos (últimas 24 h).
- `IncidentMatcher.kt`: **detección de duplicados** (ver 1.3).
- `AlertService.kt`: orquesta `crearAlerta`: valida → `IncidentMatcher` busca candidato → si hay, actualiza incidente (contador +1, recalcula centroide, `last_reported_at`); si no, crea incidente → guarda `Alert` → publica `IncidentEvent`. Todo en una transacción.
- `IncidentEvent.kt`: evento de Spring (`CREATED` / `UPDATED` + snapshot del incidente).
- `AlertDtos.kt`: `CreateAlertRequest` (lat −90..90, lng −180..180, descripción ≤ 280), `IncidentDto`, `CreateAlertResponse(incident, merged)`.
- `AlertController.kt`: `POST /api/alerts`, `GET /api/incidents/active`. Toma el usuario del `SecurityContext`.

### `realtime/`
- `IncidentBroadcaster.kt`: `@TransactionalEventListener(AFTER_COMMIT)` sobre `IncidentEvent` → `SimpMessagingTemplate.convertAndSend("/topic/incidents", …)`. **Solo emite tras commit** para no mostrar alertas que se revierten.

### Tests mínimos
- `AuthFlowTest.kt`: register → login → `/me` con token; `/me` sin token = 401.
- `IncidentMatcherTest.kt`: casos de duplicado (cerca+misma categoría+tiempo = fusiona; lejos / otra categoría / vieja = incidente nuevo).

### Flujo completo de una alerta
```
Front (clic en mapa) → POST /api/alerts (JWT)
  → JwtAuthFilter → AlertController → AlertService
      → IncidentMatcher (¿duplicado?) → IncidentRepository / AlertRepository (Postgres)
      → publica IncidentEvent
  ← respuesta REST {incident, merged}
IncidentBroadcaster (tras commit) → /topic/incidents → TODOS los clientes STOMP suscritos
Front: actualiza/crea marcador sin recargar
```

## 1.3 ⚠️ Requisito clave: detección de alertas del mismo crimen

**Estrategia MVP (proximidad + tiempo + categoría), implementada en `IncidentMatcher`:**

1. Candidatos = incidentes con **misma categoría**, reportados hace **≤ 30 min**, dentro de **≤ 150 m** (prefiltro por bounding box en SQL, distancia exacta con Haversine).
2. Si hay varios, elegir el **más cercano**.
3. Si hay match: no se crea marcador nuevo; se incrementa `report_count` y se emite `INCIDENT_UPDATED` (el front puede mostrar "N reportes").
4. Un mismo usuario no puede sumar dos veces al mismo incidente (restricción `UNIQUE (user_id, incident_id)`).
5. Los tres umbrales (150 m, 30 min, 1 categoría) van en `application.yml` (`app.incident.radius-meters`, `window-minutes`) para poder ajustarlos sin recompilar.

**Evolución (NO hacer hoy, dejar anotado):** comparar descripciones con `pg_trgm` (similitud) como señal extra de desempate; pasar a `geometry` + `ST_DWithin` de PostGIS; permitir categoría distinta si la similitud de texto es alta; confirmación manual ("yo también lo vi").

## 1.4 Fases de desarrollo del backend (en orden)

| # | Fase | Tiempo |
|---|---|---|
| B0 | Esqueleto + Docker + BD | 20 min |
| B1 | Módulo `user` + migración | 20 min |
| B2 | Módulo `auth` (JWT) | 40 min |
| B3 | Módulo `alert` + detección de duplicados | 50 min |
| B4 | Módulo `realtime` (STOMP) | 40 min |
| B5 | Errores, CORS, tests | 20 min |
| B6 | Empaquetado Docker | 15 min |

**B0 – Esqueleto**
1. Crear `pom.xml` y `RadiusControlApplication.kt`; `mvn spring-boot:run` arranca.
2. Crear `docker-compose.yml` solo con `db` y `.env`; `docker compose up db`.
3. Configurar `application.yml` con la BD.
✅ La app arranca y se conecta a Postgres; `/actuator/health` = UP.

**B1 – Usuarios**
1. Escribir `V1__init.sql` completo (users, incidents, alerts).
2. Crear `User`, `UserRepository`, `UserService`.
✅ Flyway aplica la migración y `ddl-auto: validate` no falla.

**B2 – Auth**
1. `JwtService`, `AuthDtos`, `AuthService`, `AuthController`.
2. `SecurityConfig` + `JwtAuthFilter` + `CorsConfig` + manejo de errores básico.
✅ Register y login devuelven token; `/api/auth/me` funciona con token y da 401 sin él; email duplicado devuelve 409.

**B3 – Alertas e incidentes**
1. Entidades, repositorios, enum.
2. `GeoUtils` y `IncidentMatcher` (+ `IncidentMatcherTest`).
3. `AlertService` transaccional, `AlertController`, DTOs con validación.
4. `GET /api/incidents/active`.
✅ Dos POST cercanos (<150 m, misma categoría) generan **1 incidente con report_count=2**; uno lejano genera un 2º incidente.

**B4 – Tiempo real**
1. `WebSocketConfig` con broker `/topic` y endpoint `/ws`.
2. `StompAuthInterceptor` (JWT en CONNECT).
3. `IncidentEvent` + `IncidentBroadcaster` (AFTER_COMMIT).
✅ Con un cliente STOMP de prueba (o el front), una conexión con token recibe el mensaje al crear una alerta desde otra sesión; sin token la conexión se rechaza.

**B5 – Endurecimiento mínimo**
1. `GlobalExceptionHandler` con formato uniforme.
2. Tests `AuthFlowTest` e `IncidentMatcherTest` en verde.
3. Privacidad (Ley 1581): los DTO de incidentes **no** exponen datos del usuario que reportó.
✅ `mvn test` pasa.

**B6 – Docker**
1. `backend/Dockerfile` multi-stage.
2. Añadir servicio `backend` al compose con las variables de entorno.
✅ `docker compose up --build` levanta `db` + `backend`; el endpoint de health responde desde el contenedor.

---

# PARTE 2 – FRONTEND

> Prototipo simple: pocas pantallas, sin librerías de UI pesadas, sin router complejo, estado con Context + hooks.

## 2.1 Árbol de carpetas

```
frontend/
├── Dockerfile
├── nginx.conf
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── .env.example
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types/
    │   └── index.ts
    ├── api/
    │   ├── http.ts
    │   ├── authApi.ts
    │   └── alertApi.ts
    ├── realtime/
    │   └── stompClient.ts
    ├── auth/
    │   ├── AuthContext.tsx
    │   └── ProtectedRoute.tsx
    ├── hooks/
    │   └── useIncidents.ts
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── RegisterPage.tsx
    │   └── MapPage.tsx
    └── components/
        ├── MapView.tsx
        ├── IncidentMarker.tsx
        ├── CreateAlertModal.tsx
        └── Navbar.tsx
```

## 2.2 Qué va en cada archivo y cómo se conecta

- **`types/index.ts`**: tipos TS espejo del contrato (`User`, `AuthResponse`, `Incident`, `Category`, `IncidentEvent`, `CreateAlertRequest`). Único lugar donde se definen.
- **`api/http.ts`**: wrapper de `fetch` con base `/api`, adjunta `Authorization: Bearer <token>`, y ante 401 limpia sesión y redirige a login.
- **`api/authApi.ts`**: `register`, `login`, `me`. **`api/alertApi.ts`**: `createAlert`, `getActiveIncidents`.
- **`auth/AuthContext.tsx`**: guarda `user` y `token` (en `localStorage`), expone `login/register/logout`; al montar valida el token con `/me`.
- **`auth/ProtectedRoute.tsx`**: si no hay sesión, redirige a `/login`.
- **`realtime/stompClient.ts`**: crea el cliente `@stomp/stompjs` hacia `/ws` con el token en `connectHeaders.Authorization`, reconexión automática, función `subscribeIncidents(callback)` sobre `/topic/incidents`.
- **`hooks/useIncidents.ts`**: **pegamento principal.** Carga `getActiveIncidents()` al inicio, se suscribe por STOMP y fusiona eventos en el estado (`CREATED` agrega; `UPDATED` reemplaza por `id`). Devuelve `incidents`.
- **`pages/LoginPage.tsx` / `RegisterPage.tsx`**: formularios simples → `AuthContext`.
- **`pages/MapPage.tsx`**: usa `useIncidents`, renderiza `Navbar`, `MapView` y controla el estado del modal (coordenadas clicadas).
- **`components/MapView.tsx`**: `APIProvider` + `Map` de Google (key y mapId desde `import.meta.env`), centrado en Tuluá (≈ 4.0847, −76.1954). Un clic en el mapa emite `(lat,lng)` hacia `MapPage`. Renderiza un `IncidentMarker` por incidente.
- **`components/IncidentMarker.tsx`**: marcador con color por categoría e `InfoWindow` (categoría, descripción, "N reportes", hora).
- **`components/CreateAlertModal.tsx`**: select de categoría + descripción (≤ 280) → `createAlert`. Si `merged=true`, muestra aviso "Se sumó a un reporte existente".
- **`components/Navbar.tsx`**: nombre del usuario + logout.
- **`vite.config.ts`**: proxy de desarrollo `/api` → `http://localhost:8080` y `/ws` → `ws://localhost:8080` (evita CORS).
- **`nginx.conf`**: sirve el build (fallback a `index.html`) y hace proxy de `/api` y `/ws` (con headers `Upgrade`/`Connection`) al servicio `backend:8080`.
- **`Dockerfile`**: etapa 1 `node` build (recibe `VITE_GOOGLE_MAPS_API_KEY` como `ARG`); etapa 2 `nginx` copia `dist` y `nginx.conf`.

### Flujo en el front
```
Login → token → AuthContext → MapPage
MapPage → useIncidents: GET activos + STOMP /topic/incidents
Clic en mapa → CreateAlertModal → POST /api/alerts
Evento WS llega a TODOS (incluido quien creó) → useIncidents actualiza → marcador aparece/actualiza
```
> Evitar duplicados visuales: el estado se indexa por `incident.id`; no agregar manualmente la respuesta del POST (llega por WS).

## 2.3 Fases de desarrollo del frontend (en orden)

| # | Fase | Tiempo |
|---|---|---|
| F0 | Scaffold Vite + TS | 15 min |
| F1 | Auth (login/registro/sesión) | 30 min |
| F2 | Mapa de Google | 25 min |
| F3 | Crear alerta | 30 min |
| F4 | Tiempo real | 30 min |
| F5 | Docker + integración final | 30 min |

**F0** – `npm create vite` (react-ts); instalar `@vis.gl/react-google-maps`, `@stomp/stompjs`, `react-router-dom`. Crear `types/` y configurar proxy.
✅ `npm run dev` muestra la app base.

**F1** – `http.ts`, `authApi.ts`, `AuthContext`, `ProtectedRoute`, `LoginPage`, `RegisterPage`, rutas en `App.tsx`.
✅ Registrar, cerrar sesión, iniciar sesión; recargar la página mantiene la sesión; `/` sin sesión redirige a `/login`.

**F2** – `MapView` + `MapPage` + `Navbar`. Crear la API key de Google (Maps JavaScript API) y un Map ID; restringir la key por dominio (`localhost`).
✅ El mapa carga centrado en Tuluá con la key en `.env`.

**F3** – `CreateAlertModal`, `alertApi.createAlert`, captura del clic en el mapa. Cargar y pintar los incidentes activos con `IncidentMarker`.
✅ Hacer clic, enviar la alerta y que quede guardada (visible al recargar la página).

**F4** – `stompClient.ts` + `useIncidents`.
✅ **Prueba de oro:** dos navegadores (uno en incógnito) con usuarios distintos; al crear una alerta en uno, aparece **sin recargar** en el otro. Dos alertas cercanas de la misma categoría muestran un solo marcador con "2 reportes".

**F5** – `Dockerfile`, `nginx.conf`, añadir `frontend` al compose.
✅ `docker compose up --build` y abrir `http://localhost` → flujo completo funcionando.

---

# PARTE 3 – Cierre

## 3.1 Presupuesto de tiempo (7 h)

| Bloque | Tiempo |
|---|---|
| Backend B0–B6 | ~3 h 25 min |
| Frontend F0–F5 | ~2 h 40 min |
| Buffer / bugs / demo | ~55 min |

Si el tiempo se acaba: **recortar** tests (B5), InfoWindow detallado y `RegisterPage` separada (usar un solo formulario con toggle). **No recortar:** auth, WS, detección de duplicados.

## 3.2 Checklist final del MVP (demo)

- [ ] `docker compose up --build` levanta todo desde cero.
- [ ] Registro/login con persistencia (reiniciar contenedores no pierde usuarios).
- [ ] Mapa de Google visible.
- [ ] Crear alerta con clic en el mapa.
- [ ] Alerta visible en tiempo real en otro usuario.
- [ ] Dos reportes del mismo hecho se agrupan en un incidente.

## 3.3 Extras recomendados (breves)

- **Seguridad:** `JWT_SECRET` fuera del repo; rate limit por usuario en `POST /api/alerts` (post-MVP); restringir la API key de Google por dominio.
- **Spam/abuso:** el `UNIQUE (user_id, incident_id)` ya frena el reporte repetido; a futuro, reputación de usuario.
- **Caducidad:** el front solo muestra incidentes de las últimas 24 h; un job de limpieza queda para después.
- **Privacidad (Ley 1581):** no exponer identidad del reportante; evitar guardar datos innecesarios.
- **Roadmap tras el MVP (orden sugerido):** 1) cuadrantes con PostGIS (`ST_Contains`) · 2) rol operador + panel · 3) mapa de calor · 4) evidencia multimedia (almacenamiento de objetos) · 5) similitud textual para duplicados · 6) notificaciones push.
