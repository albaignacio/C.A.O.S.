# ⚽ C.A.O.S · Gestión del equipo

App web para administrar el equipo de fútbol amateur **C.A.O.S**: plantel de jugadores, armado de formaciones sobre la cancha y estadísticas de partidos (goles, asistencias y MVP). Pensada para usarse principalmente **desde el celular**.

- **Frontend:** React + Vite + TypeScript
- **Estilos:** Tailwind CSS (paleta celeste y blanco)
- **Backend:** Supabase (PostgreSQL + Storage)

La app es **abierta, sin login**: cualquiera que la abra ve y edita el mismo plantel, formaciones y estadísticas (data compartida). ⚠️ Si la publicás, cualquier persona con el link puede editar los datos.

---

## 📋 Requisitos previos

- [Node.js](https://nodejs.org/) 18 o superior (probado con Node 22).
- Una cuenta gratuita en [Supabase](https://supabase.com/).

---

## 🟢 Paso 1 — Configurar Supabase

### 1.1 Crear el proyecto

1. Entrá a [app.supabase.com](https://app.supabase.com/) e iniciá sesión.
2. **New project** → elegí una organización, ponele un nombre (ej. `caos`), generá una **Database Password** (guardala) y elegí la región más cercana.
3. Esperá 1–2 minutos a que el proyecto termine de aprovisionarse.

### 1.2 Correr el SQL (schema + RLS + storage)

1. En el menú lateral, entrá a **SQL Editor**.
2. **New query**, abrí el archivo [`supabase/schema.sql`](supabase/schema.sql) de este repo, copiá **todo** el contenido, pegalo y tocá **Run**.
3. Debería decir *Success*. Esto crea todas las tablas, la vista de estadísticas, las políticas de seguridad (RLS) y el bucket de fotos.
4. **New query** de nuevo → corré también [`supabase/open-access.sql`](supabase/open-access.sql). Esto habilita el acceso **sin login** (permite el rol anónimo). **Sin este paso la app no vería ni guardaría datos.**

> Los scripts son idempotentes: los podés correr más de una vez sin romper nada.

### 1.3 Cargar datos de prueba (opcional pero recomendado)

1. Otra vez en **SQL Editor → New query**.
2. Copiá y pegá el contenido de [`supabase/seed.sql`](supabase/seed.sql) y tocá **Run**.
3. Esto carga ~16 jugadores ficticios y 2 partidos de ejemplo con estadísticas para que puedas probar todo enseguida.

### 1.4 Verificar el bucket de Storage

El `schema.sql` ya crea el bucket **`player-photos`** como público. Para confirmarlo:

1. Andá a **Storage** en el menú lateral.
2. Tenés que ver un bucket llamado **`player-photos`** con la etiqueta *Public*.

> Si por algún motivo no aparece, crealo a mano: **New bucket** → nombre `player-photos` → marcá **Public bucket** → **Save**. (Las políticas de acceso ya quedaron creadas por el SQL.)

### 1.5 Autenticación

No hace falta configurar nada: **la app no usa login**. Se entra directo. (Podés ignorar la sección de *Authentication* de Supabase.)

### 1.6 Copiar las credenciales (keys)

1. La forma más fácil: botón **Connect** (arriba a la derecha) → pestaña **App Frameworks**. Ahí ves la **URL** y la **key pública** con botón de copiar.
2. O bien: **Project Settings** (engranaje) → **Data API** (la **Project URL**) y **API Keys** (la key pública).
3. Esos dos valores van en el `.env` del paso 2:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **key pública** (la `anon` que empieza con `eyJ...`, o la **Publishable key** `sb_publishable_...`) → `VITE_SUPABASE_ANON_KEY`

> Usá **siempre** la key pública (anon / publishable). **Nunca** la `service_role` / `sb_secret_...` en el frontend.

---

## 🔵 Paso 2 — Configurar el proyecto local

Desde la carpeta del proyecto (`C.A.O.S`):

### 2.1 Instalar dependencias

```bash
npm install
```

### 2.2 Crear el archivo `.env`

Copiá el ejemplo y completalo con tus credenciales del paso 1.6:

```bash
# En Windows (PowerShell)
Copy-Item .env.example .env

# En Mac/Linux
cp .env.example .env
```

Editá `.env` y pegá tus valores:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-public-key
```

> El `.env` está en el `.gitignore`, así que tus keys no se van a subir a git.

---

## 🚀 Paso 3 — Levantar el proyecto

```bash
npm run dev
```

Abrí el navegador en la URL que muestra la consola (normalmente **http://localhost:5173**).

La app entra **directo al Plantel, sin login**. Ya podés gestionar el plantel, armar formaciones y cargar estadísticas.

### Otros comandos

```bash
npm run build     # Compila para producción (genera /dist)
npm run preview   # Sirve el build de producción localmente
```

Para probarla desde el **celular** en tu misma red WiFi: corré `npm run dev` y entrá desde el teléfono a `http://LA-IP-DE-TU-PC:5173` (Vite muestra la dirección "Network" en la consola).

---

## 📁 Estructura del proyecto

```
C.A.O.S/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── .env.example
├── supabase/
│   ├── schema.sql          # Tablas, vista, RLS y bucket de storage
│   └── seed.sql            # Datos de prueba (jugadores + partidos)
└── src/
    ├── main.tsx
    ├── App.tsx             # Rutas + protección por auth
    ├── index.css           # Tailwind + estilos base
    ├── lib/
    │   ├── supabase.ts     # Cliente de Supabase
    │   ├── formations.ts   # Definición de las 7 formaciones
    │   └── helpers.ts      # Utilidades (iniciales, colores, fechas)
    ├── types/index.ts      # Tipos TypeScript del modelo de datos
    ├── contexts/
    │   └── AuthContext.tsx # Sesión / login / logout
    ├── hooks/
    │   └── usePlayers.ts   # Carga del plantel
    ├── components/         # UI reutilizable (Avatar, Modal, cancha, etc.)
    └── pages/
        ├── LoginPage.tsx
        ├── PlayersPage.tsx     # Plantel
        ├── LineupsPage.tsx     # Formaciones
        └── StatsPage.tsx       # Estadísticas
```

---

## 🗄️ Modelo de datos

| Tabla | Descripción |
|-------|-------------|
| `players` | Plantel: nombre, apodo, número, posición, foto. |
| `lineups` | Alineaciones guardadas: nombre, formación, fecha. |
| `lineup_positions` | Jugador asignado a cada puesto de una alineación. |
| `matches` | Partidos: rival, fecha, goles a favor / en contra. |
| `match_stats` | Goles, asistencias y MVP por jugador en cada partido. |
| `player_season_stats` | *(vista)* Acumulado de temporada por jugador. |

Reglas garantizadas por la base de datos:
- Un jugador **no puede ocupar dos puestos** en la misma alineación.
- **Un solo MVP por partido**.
- Acceso **abierto** (RLS permite anon + authenticated): la app funciona sin login.

---

## 🎨 Diseño

Paleta **celeste + blanco** con el blanco bien predominante. El celeste (`#4aa8e0`) se usa como acento en el header, botones, la cancha y los destacados. Layout responsive con navegación inferior tipo app en el celular y navegación superior en desktop.

---

## 🛠️ Problemas comunes

- **"Faltan las variables de entorno de Supabase"**: no creaste el `.env` o le faltan valores. Revisá el paso 2.2 y **reiniciá** `npm run dev` (Vite solo lee el `.env` al arrancar).
- **Entra a la app pero el plantel está vacío y no puedo agregar jugadores**: te falta correr [`supabase/open-access.sql`](supabase/open-access.sql) (paso 1.2.4). Sin eso, la app sin login no tiene permiso para leer ni escribir.
- **No se sube la foto del jugador**: revisá que exista el bucket `player-photos` y que sea público (paso 1.4).
- **Las tablas aparecen vacías / error de permisos**: asegurate de haber corrido `schema.sql` **y** `open-access.sql` completos.
```
