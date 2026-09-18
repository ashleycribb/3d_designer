# Google AI Studio Integration Guide: HVAC 3D Blueprint Extruder

This folder configures **Google AI Studio** (`https://aistudio.google.com`) as the vision intelligence engine for the 3D Floorplan & HVAC Controls Engineering Platform.

---

## What This Accomplishes for University Facilities

1. **No Software to Install**:
   - University technicians and HVAC engineers do not need local GPUs, Python environments, or computer vision libraries on locked-down campus machines.
   - Blueprints and scanned PDFs are processed in the cloud by Google Gemini multimodal models.
2. **Instant 2D-to-3D Conversion**:
   - Gemini detects architectural wall centerlines, classifies interior vs. exterior walls, labels room zones, and pinpoints diffuser and thermostat symbols.
   - The web app automatically receives the structured JSON output and extrudes the building into a Three.js 3D space with drop ceilings and plenum cavities.

---

## Step-by-Step Setup in Google AI Studio

### Step 1: Create the Project / Prompt in Google AI Studio
1. Navigate to **[Google AI Studio](https://aistudio.google.com/)** and sign in with your Google / University account.
2. Click **"Create New Prompt"** -> choose **"Chat Prompt"** or **"Freeform Prompt"**.
3. In the Model dropdown, select **Gemini 2.0 Flash** or **Gemini 1.5 Pro**.

### Step 2: Set the System Instructions
1. Open the **System Instructions** expandable section on the left sidebar.
2. Open [`system_prompt.txt`](./system_prompt.txt) in this folder.
3. Copy the entire contents and paste it into the **System Instructions** box in Google AI Studio.

### Step 3: Enable Structured Output (JSON Schema)
1. On the right configuration sidebar, scroll down to **"Advanced Settings"** -> **"Structured Output"** (or Response Mime Type).
2. Toggle Structured Output to **JSON**.
3. Paste the contents of [`response_schema.json`](./response_schema.json) into the schema definition field.
4. Set **Temperature** to `0.1` (low temperature ensures strict geometric consistency and coordinate precision).

### Step 4: Test with a Floorplan Blueprint
1. Click the **"+"** / **"Insert"** icon in the prompt input area and upload any architectural PDF or floorplan image.
2. Type: `"Extract all walls, rooms, and HVAC equipment symbols."`
3. Click **"Run"**.
4. Gemini will inspect the drawing visually and return clean, structured walls, rooms, and equipment ready for 3D extrusion.

### Step 5: Connect to the 3D Designer Web Application
1. In Google AI Studio, click **"Get API Key"** in the top navigation or go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Click **"Create API Key"** (free tier available).
3. In the 3D Designer web application:
   - Click the **"AI Blueprint"** (`Sparkles` icon) button in the top toolbar dock.
   - Paste your API key into the Gemini API Key field and click **"Save Key"**.
   - Click **"Run AI Reconstruction with Gemini"** to instantly extrude your uploaded floorplan!
