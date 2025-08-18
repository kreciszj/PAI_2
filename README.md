# Film-Blog App

## Getting Started

1. **Clone the repo**
   ```bash
   git clone https://github.com/kreciszj/PAI_2.git
   cd PAI_2
   ```

2. **Install dependencies**
   ```bash
   cd server && npm i
   cd ../client && npm i
   ```

3. **Configure environment**
   
   Create the following files:

   **server/.env**
   ```ini
   PORT=3000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173

   # JWT
   JWT_ACCESS_TTL=900
   JWT_REFRESH_TTL=1209600
   JWT_SECRET=dev_access_secret
   JWT_REFRESH_SECRET=dev_refresh_secret

   # db
   DB_PATH=./data/app.sqlite
   ```

   **client/.env**
   ```ini
   VITE_API_URL=http://localhost:3000
   ```

4. **Start both frontend and backend**

   **Client**
   ```bash
   cd client
   npm run dev               # development (Vite)
   # production preview after build:
   npm run build && npm run preview
   ```

   **Server**
   ```bash
   cd server
   npm run dev               # development (node --watch)
   npm start                 # production
   ```

5. **URLs**
   - React app: http://localhost:5173
   - API server: http://localhost:3000
