# Fleet Overview Real Lesotho Map & Icon-Only Sidebar Toggle Plan

## 1. Real Interactive Lesotho Map on Fleet Overview (`RegionalFleetMap.tsx` & `DashboardView.tsx`)
- **Real Lesotho Map Engine**:
  - Upgrade `RegionalFleetMap.tsx` to render an authentic, interactive map of the **Kingdom of Lesotho** centered on Lesotho (`-29.6100, 28.2336`, with quick zoom to Maseru / active router pins) using real geographic map tiles (OpenStreetMap Street Map, Dark Matter, and Topographic/Satellite views) plus clear 10-District boundary anchors (`Maseru`, `Berea`, `Leribe`, `Butha-Buthe`, `Mokhotlong`, `Thaba-Tseka`, `Qacha's Nek`, `Quthing`, `Mohale's Hoek`, `Mafeteng`).
  - Plot every adopted router (`Maseru GC Clubhouse`, `Tester (for free)`, etc.) at its real Lesotho GPS coordinates / district anchor (e.g., Maseru Golf Course Clubhouse at `-29.3182, 27.4786` in Maseru District).
- **Handover-Friendly, Easy-to-Read Router Location Popup & Inspector**:
  - When a user clicks on any router pin on the Lesotho map (or selects a router from the list), display a clean, high-contrast, easy-to-read handover card showing:
    - **Router Name & Status** (e.g., `Maseru GC Clubhouse` — `ONLINE`)
    - **Deployed Location / Venue** (e.g., `Maseru Golf Course`)
    - **District** (e.g., `Maseru District`)
    - **Connected Clients** (live count)
  - Remove cluttered technical jargon from the map inspector so handover teams and stakeholders can immediately read where each router is deployed and which district it serves.
- **Restore Fleet Map to Fleet Overview (`DashboardView.tsx`)**:
  - Embed `RegionalFleetMap` directly in `DashboardView.tsx` so the interactive Lesotho map is visible right on the Fleet Overview page.

## 2. Icon-Only Side Panel Toggle (`Header.tsx` & `App.tsx`)
- **Top Header Toggle Button (`src/components/layout/Header.tsx`)**:
  - Remove the literal `<span>Side Panel</span>` text next to the `<PanelLeft />` icon so the button displays only the clean sidebar toggle icon (`PanelLeftClose` / `PanelLeft`).
- **Floating Re-Open Button (`src/App.tsx`)**:
  - Remove the literal `<span>Side Panel</span>` text from the floating bottom-left button when the sidebar is collapsed, rendering a clean icon-only button (`<PanelLeftOpen />`).
