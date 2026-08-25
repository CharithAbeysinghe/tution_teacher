
  # Tuition Teacher Website Design

  This is a code bundle for Tuition Teacher Website Design. The original project is available at https://www.figma.com/design/LP35wK49XhhP8lzSRCaoJs/Tuition-Teacher-Website-Design.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Running the full stack

  Backend API (first time):
      cd server
      npm install
      npm run seed     # creates demo data + admin account (admin@aravindatuition.lk / admin123)

  Run backend:
      npm run dev      # http://localhost:3000

  Frontend (repo root):
      npm install
      npm run dev      # proxies /api to localhost:3000

  Production:
      npm run build            # builds frontend to dist/
      cd server && npm start   # serves API + dist on one port
  