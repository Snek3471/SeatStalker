# SeatStalker

## Project Overview
SeatStalker is a web application for UMD students to register with their UMD email, search for course sections, watch seats for classes they care about, and receive email alerts when seats open up.

## Prerequisites
- Python 3.10+
- PostgreSQL
- A SendGrid account and API key

## Setup Steps
1. Clone the repository.
2. Create your environment file from the example:
   - Copy `.env.example` to `.env`
   - Update values for your database and SendGrid credentials
3. Run `schema.sql` against your PostgreSQL database to create required tables.
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```
6. Run the scheduler-based poller:
   ```bash
   python scheduler.py
   ```

## Frontend
The app has a React frontend and a FastAPI backend that work together as a full stack application. The backend runs on port `8000`, and the frontend runs on port `5173`.

Both services must be running locally for the app to work:
- Start the backend with `uvicorn main:app --reload`
- Start the frontend with `npm run dev` from the `frontend` folder

The frontend reads `VITE_API_URL=http://localhost:8000` from `frontend/.env` and uses it to communicate with the backend.

## API Endpoint Documentation

### `POST /users`
Create a user.

Request body:
```json
{
  "email": "user@example.com",
  "name": "User Name"
}
```

Response:
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User Name"
}
```

### `POST /watchlist`
Add a section to a user's watchlist. The app resolves `course_id` from the UMD sections API for the provided `section_id`.

Request body:
```json
{
  "email": "user@example.com",
  "section_id": "CMSC131-0101"
}
```

Response:
```json
{
  "message": "Watchlist entry added",
  "email": "user@example.com",
  "section_id": "CMSC131-0101",
  "course_id": "CMSC131"
}
```

### `DELETE /watchlist`
Remove a section from a user's watchlist.

Request body:
```json
{
  "email": "user@example.com",
  "section_id": "CMSC131-0101"
}
```

Response:
```json
{
  "message": "Watchlist entry removed",
  "email": "user@example.com",
  "section_id": "CMSC131-0101"
}
```

### `GET /watchlist/{email}`
Return all sections currently watched by a user.

Example request:
```http
GET /watchlist/user@example.com
```

Response:
```json
{
  "email": "user@example.com",
  "watchlist": [
    {
      "section_id": "CMSC131-0101",
      "course_id": "CMSC131",
      "added_at": "2026-06-16T10:00:00"
    }
  ]
}
```
