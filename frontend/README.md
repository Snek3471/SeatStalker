# SeatStalker Frontend

This folder contains the React frontend for SeatStalker.

## Setup Instructions
1. Install Node.js if you do not already have it.
2. Open a terminal in the `frontend` folder.
3. Install dependencies:
	```bash
	npm install
	```
4. Create a `.env` file from the example file:
	- Copy `frontend/.env.example` to `frontend/.env`
	- Make sure it includes:
	  ```bash
	  VITE_API_URL=http://localhost:8000
	  ```
5. Start the development server:
	```bash
	npm run dev
	```

The frontend runs on port `5173`.

## Backend Dependency
The frontend expects the FastAPI backend to be running locally at `http://localhost:8000`.
