Racing Plate - Complete Bundle
=============================

This bundle includes:
- backend/: Node/Express API using MongoDB (Atlas/local)
- frontend/: Static HTML/CSS/JS UI with dark ocean theme
- frontend/assets/: placeholder images. Replace with your Figma/Drive assets.

How to run locally (backend):
  cd backend
  copy .env.example .env
  set MONGO_URI in .env (mongodb://localhost:27017/mabwas OR Atlas URI)
  npm install
  npm run dev

How to run frontend:
  Open frontend/index.html in browser OR serve with a static server. Replace assets in frontend/assets with your real images from Figma/Drive.

Note: I could not automatically fetch your Figma/Drive images. Download them and place them in frontend/assets. Filenames: logo.png, plate-placeholder.png, and any others you need.
