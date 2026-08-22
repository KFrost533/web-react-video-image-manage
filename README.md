# React Web UI

Personal-use full-stack project with:

- Frontend: React
- Backend API: Java (Spring Boot)
- Backend: Java (Spring Boot)

Windows users are expected to start this project through batch files.

## Project Structure

- `frontend/` React app
- `backend/src/main/java/` Spring Boot source
- `backend/target/` built jars/classes
- `batch/` Windows startup and setup scripts
- `docs/` static documentation

## Requirements

- Node.js 14+
- Java 11+

## Recommended Run Flow (Windows / Batch)

1. Run setup once (or when dependencies change):

```bat
batch\ui-setup-all.bat
```

2. Start backend + frontend:

```bat
batch\ui-start.bat
```

This opens two terminals:

- Java backend (Spring Boot)
- React frontend on http://localhost:3000

## Batch Files

- `batch/ui-setup-all.bat`
  - Wrapper script that calls `batch/ui-setup.bat`
- `batch/ui-setup.bat`
  - Installs root/frontend npm dependencies
- `batch/ui-start.bat`
  - Starts Java backend from `backend/target/*.jar` when available
  - Falls back to `mvn spring-boot:run -DskipTests` when no runnable jar exists
  - Starts React frontend with `npm start`

## Setup

If you want to use npm command instead of direct batch execution:

```bash
npm run setup
```

This performs the same setup as the batch scripts.

- install root/frontend npm dependencies

## Run

### Batch (recommended)

```bat
batch\ui-start.bat
```

### npm command

```bash
npm run start:all
```

This launches:

- Java backend (Spring Boot)
- React frontend on `http://localhost:3000`

## Stop

Close the two terminal windows opened by `batch/ui-start.bat`:

- `ReactWebUI-Backend`
- `ReactWebUI-Frontend`

If startup fails, verify root/frontend dependencies are installed with `npm install`.

## Docs

Open docs: `docs/index.html`

## Notes

- The backend uses JavaCV/FFmpeg through Maven dependencies for video processing.

---

Installation complete. Start developing with the batch commands above.
