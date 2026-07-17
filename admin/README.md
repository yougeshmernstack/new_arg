# Admin Panel (React)

## Setup
1. Copy `.env.example` to `.env` if needed
2. `npm install`
3. `npm start` (runs on port 3000)

## Env
- `REACT_APP_API_BASE_URL` — backend root (default `http://localhost:6500`)
- `REACT_APP_API_PREFIX` — `/admin`
- Full API URL = base + prefix → `http://localhost:6500/admin`

## Structure
```
src/
  api/           axios + endpoint modules
  components/    layout, ProtectedRoute
  context/       AuthContext
  hooks/
  pages/         login, dashboard, franchises, distributors, audit
  routes/
  styles/
  utils/
```
