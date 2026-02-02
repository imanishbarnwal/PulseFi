# Yellow Frontend

A React + Vite + Tailwind CSS frontend for the Yellow Hackathon Demo.

## Setup

1.  Make sure the Backend is running on port 3000.
    ```bash
    cd ../yellow-backend
    npm start
    ```

2.  Install dependencies here:
    ```bash
    npm install
    ```

3.  Run the frontend:
    ```bash
    npm run dev
    ```

4.  Open `http://localhost:5173`.

## Flow
1.  **Landing**: Introduction.
2.  **Deposit**: Select an amount (triggers session start and agent start).
3.  **Active**: Shows countdown and live logs from the Agent.
4.  **Settled**: Shows settlement details.
