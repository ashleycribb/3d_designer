# HVAC 3D Floorplan Engineering Platform

A professional web-based engineering productivity application designed for university facilities and HVAC controls engineering teams.

The platform eliminates the tedious manual recreation of buildings in consumer house-planning software. It converts 2D architectural floorplan PDFs into parametric 3D models, calibrates real-world dimensions using human-in-the-loop workflows, and allows engineers to place, resize, inspect, and controls-tag HVAC equipment inside rooms and plenum spaces.

---

## Key Features

1. **Architectural Floorplan PDF Processing**:
   - High-fidelity dual vector and raster pipeline using PyMuPDF (`pymupdf`) and Pillow.
   - Extracts vector paths (lines, polylines, rectangles), text annotations, room numbers, and dimensions.
   - Fallback raster preview rendering for scanned or image-based drawings.

2. **Interactive Scale Calibration ("Set Drawing Scale")**:
   - Human-in-the-loop calibration tool where the engineer clicks two known points (e.g. across a dimension marker or wall span) and enters the real-world distance (e.g., `24'-0"`, `15' 6"`, `20 ft`).
   - Computes exact drawing-to-real-world scale factor (`feet_per_pixel`).

3. **Parametric 3D Building Extrusion**:
   - Converts 2D structured geometry into parametric 3D building components:
     - Foundation slab
     - Exterior perimeter walls (brick/concrete styling)
     - Interior partitions (drywall styling)
     - Acoustical drop ceiling grid at specified finished ceiling height
     - Dedicated ceiling plenum cavity up to structural roof deck
   - Retains full associativity: walls remain individually selectable and editable in 3D.

4. **Multi-Mode Engineering Visibility**:
   - **Normal**: Full architectural view with walls, ceilings, and HVAC equipment.
   - **Ceiling Off**: Hides acoustical ceiling tiles to reveal plenum space and equipment.
   - **X-Ray**: Renders architectural walls semi-transparently (translucent drafting view) to clearly inspect equipment inside walls and plenum cavities.
   - **HVAC Only**: Isolates equipment, diffusers, and control panels without architectural distraction.
   - **Plenum Focus**: Highlights the ceiling cavity between finished ceiling and structural deck.

5. **3D Camera Presets & Measurement Tool**:
   - Perspective, Top (Orthographic CAD plan), Front, and Side elevations.
   - 3D Measurement Tool: Click any two points in 3D space to measure real-world distance in architectural feet/inches.

6. **Standardized HVAC Equipment Catalog**:
   - 17 standardized equipment types across 6 engineering categories:
     - Air Handlers: **AHU**, **RTU**, **FCU**
     - Air Distribution: **VAV Terminal Box**, **Supply Diffuser (2x2)**, **Return Grille (2x2)**, **Supply Grille**
     - Fans: **Supply Fan**, **Return Fan**, **Exhaust Fan**
     - Sensors & Controls: **Wall Thermostat**, **Temperature Sensor**, **Humidity Sensor**, **CO2 Sensor**
     - Dampers & Actuators: **Control Damper**, **Electronic Actuator**
     - Panels: **DDC Control Panel**
   - Click-to-place and drag repositioning in both 2D and 3D scenes.
   - Automatic elevation assignment based on equipment target (e.g., VAVs default to plenum cavity at 9.5' AFF, diffusers to drop ceiling at 9.0' AFF, thermostats to ADA height at 4'-6" AFF).

7. **Object Properties Inspector**:
   - Live bidirectional editing of dimensions (W × L × H), 3D position (X, Y, Z), rotation, tag, manufacturer, model, airflow min/max (CFM), and associated room.

8. **Controls & DDC Association Layer**:
   - Links field controllers, thermostats, VAV boxes, dampers, and air handlers.
   - Dedicated "Controls View" visual topology mapper.

9. **Building Vertical Configuration & Cross-Section Parser**:
   - Configurable vertical parameters: Exterior/Interior Wall Height, Wall Thickness, Floor Slab Thickness, Ceiling Height, Plenum Cavity Height.
   - Optional Cross-Section PDF analyzer: automatically extracts vertical dimensions with confidence metrics for engineer verification.

10. **Built-in Demonstration Project**:
    - Includes pre-seeded "Campus Engineering Hall - Level 1 HVAC" project with multiple rooms (Offices, Conference, Lab, Mechanical Room), calibrated scale, central AHU-1, VAV boxes, diffusers, thermostats, and control mappings.

---

## Technology Stack

- **Frontend**:
  - React 19 + TypeScript + Vite
  - Three.js for parametric 3D rendering and raycasting
  - Lucide React for engineering icons
  - Modern technical CAD/drafting UI aesthetic with dark palette (`#0f172a`, `#1e293b`)
- **Backend**:
  - Python 3.12 + FastAPI
  - PyMuPDF (`pymupdf`) for sub-pixel vector PDF parsing and raster preview generation
  - SQLAlchemy 2.0 (Async) + aiosqlite / asyncpg
  - Pydantic v2
- **Database**:
  - SQLite with `aiosqlite` for zero-configuration local development
  - Fully compatible with PostgreSQL by setting `DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname`

---

## Directory Structure

```
3d_designer/
├── backend/
│   ├── app/
│   │   ├── config.py             # Environment configuration and settings
│   │   ├── database.py           # Async SQLAlchemy engine and session
│   │   ├── main.py               # FastAPI entrypoint and middleware
│   │   ├── models/               # Relational data models (Project, Wall, Room, Equipment, etc.)
│   │   ├── schemas/              # Pydantic schemas for request/response validation
│   │   ├── services/             # Core geometry, PDF vector extraction, and demo services
│   │   │   ├── pdf_service.py    # PyMuPDF vector path & text extraction
│   │   │   ├── geometry_service.py # Wall clustering, deduplication, room detection
│   │   │   ├── cross_section.py  # Cross-section PDF analyzer
│   │   │   ├── sample_pdf.py     # Programmatic vector architectural floorplan generator
│   │   │   └── demo_service.py   # Demonstration project seeder
│   │   ├── routers/              # REST API endpoints (projects, drawings, walls, equipment, controls)
│   │   └── utils/                # Architectural imperial unit parser (24'-0" <-> decimal feet)
│   ├── tests/                    # Pytest integration and unit tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.ts         # Typed API client
│   │   ├── context/ProjectContext.tsx # Global state, selection, and Undo/Redo (Ctrl+Z/Y)
│   │   ├── components/
│   │   │   ├── layout/           # Header, LeftPanel, RightPanel, StatusBar
│   │   │   ├── workspace/        # 2D Floorplan Canvas & 3D Three.js Viewport
│   │   │   ├── controls/         # DDC Controls topology graph
│   │   │   └── modals/           # New Project, Scale, Heights, Cross-Section, Geometry Confirm
│   │   ├── utils/imperial.ts     # Frontend imperial dimension formatter
│   │   └── index.css             # High-precision engineering drafting styles
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## Quickstart & Local Development

### Prerequisites
- Node.js (v18+) and npm
- Python (3.11+)

### 1. Backend Setup

From the repository root `3d_designer`:

```powershell
# Option A (Easiest - from root):
python run_backend.py

# Option B (From root with uvicorn):
python -m uvicorn backend.app.main:app --reload --port 8000

# Option C (From backend directory):
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

The backend server will start at `http://127.0.0.1:8000`.
- API documentation (Swagger UI): `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### 2. Frontend Setup

In a second terminal window:

```powershell
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Verification & Walkthrough

1. **Load Demonstration Project**:
   - On initial launch, the pre-configured demonstration project *"Campus Engineering Hall - Level 1 HVAC"* is automatically loaded.
   - You can also click **"Load Demo"** in the top navigation bar at any time.
2. **Explore 3D Building**:
   - Orbit using Left-Click drag, Pan with Right-Click drag, and Zoom with Mouse Wheel.
   - Click the camera preset buttons: **Persp**, **Top**, **Front**, **Side**.
   - Switch visibility modes: **Normal**, **Ceiling Off**, **X-Ray**, **HVAC Only**, **Plenum Focus**.
3. **Inspect & Edit Objects**:
   - Click any wall or equipment solid (e.g. `AHU-1`, `VAV-101`, `TSTAT-101`).
   - In the Right Panel Inspector, edit width, height, elevation AFF, or airflow CFM. Notice the 3D model updates in real time.
4. **Test 3D Measurement**:
   - Click **Measure** in the top toolbar, then click two 3D points on the building to see the distance in feet and inches.
5. **Switch to 2D Floorplan**:
   - Click **2D Floorplan** in the top bar to inspect the high-resolution vector PDF background, wall lines, room zones, and equipment footprints.
   - Select **Draw Wall** to draw custom wall segments with angle snapping.
6. **Set Drawing Scale**:
   - Click **Set Scale**, choose two reference points, and input the real-world distance (e.g. `24'-0"`).
7. **Controls View**:
   - Click **Controls View** in the top bar to visualize and add associations (e.g. `TSTAT-101` CONTROLS `VAV-101`, `AHU-1` FEEDS `VAV-101`).

---

## Disclaimer

> **Engineering Notice**: Generated geometry and detected parameters must be reviewed and verified by qualified personnel before use for engineering, construction, commissioning, or life-safety decisions.
