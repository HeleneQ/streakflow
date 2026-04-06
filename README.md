# Streakflow  -Habit Tracker Project Report

## 1. Project Overview and Description

### 1.1 Overview

**Streakflow** is a full-stack web application designed to help users and maintain positive daily routines through a "streak-based" progress system.

As most habit trackers fail because they are either too complex, too expensive or too static (providing no emotional engagement), this webpage does not only display a simple checklist but emphasizes consistency by providing:
- A visual feedback on weekly performance: using a 7-day rolling table, users see a "chain" of success and can update it for the last week.
- Gamification: a long-term calculated statistics such as "Best Streak" calculation, providing a personal high score to beat 
- An AI-powered coaching: integration of a "Productivity Coach" AI provides a dynamic feedback loop that changes based on user performance, simulating the accountability of a real coach

### 1.2 Description

Streakflow webpage is categorized into four main functional areas:
- Today's habits
- Weekly completion
- Statistics
- Create a habit

#### A. Dynamic Daily Dashboard

The "Today" section serves as the primary user interface for daily interaction:
- **Automatic Date Localization:** Displays the current day, month, and date in a user-friendly format (e.g., "Monday, October 28").
- **Real-Time Progress Summary:** A live counter (e.g., "3 / 5 habits completed") that updates instantly as the user checks or unchecks items.
- **Quick-Action Habit List:** A list of active habits where users can mark completion with a single click in checkbox or delete habits entirely if they are no longer relevant.

#### B. Interactive Weekly Visualization

The "Weekly Habits" section provides a high-level overview of consistency:
- **7-Day Rolling Grid:** A dynamic table showing the completion status of every habit over the last seven days.
- **Status Indicators:** Color-coded cells distinguish between Done (Green), Missed (Red), and Pending (Orange/Yellow).
- **Historical Toggling:** Unlike static trackers, users can click on any cell in the past 7 days to retroactively update their progress, allowing for "catch-up" logging if a day was forgotten.

#### C. Advanced Performance Statistics

The "Statistics" engine processes raw database entries to provide actionable insights:
- **Global Metrics:** Tracks the total number of habits, the total number of unique days the app has been used, and the overall "Weekly Completion Rate" across all routines.
- **Streak Tracking:** Automatically calculates the "Best Current Streak" (the habit currently being maintained the longest) and "Best All-Time Streak" for every individual habit.
- **Automated Auditing:**
    - Top Performer: Identifies the habit with the highest completion rate and displays its specific streak data to boost morale.
    - Needs Attention: Uses completion rates to identify the habit being missed most frequently, encouraging the user to refocus on that specific goal.

#### D. AI-Powered Coaching (Groq/Llama 3.3 Integration)

The application leverages Large Language Models (LLMs) to move beyond a simple database and act as a coach:
- **Context-Aware Welcome Message:** Every time the page loads, the AI analyzes the user's progress for that specific day.
    - If 0 habits are done, it gives a "gentle push."
    - If all are done, it gives "high praise."
    - If some are done, it identifies what is left (e.g., "Don't forget to Drink Water!") and offers a punchy motivational quote.
- **Intelligent Habit Suggestions:** Within the creation form, the AI reviews the user's existing habits and suggests five new, complementary habits to help build a more balanced routine.

#### E. User Experience & Personalization

- **Persistent Dark Mode:** A theme-toggle system that uses localStorage to remember the user's preference (Light or Dark) across different browser sessions.
- **Responsive Design:** The layout adapts from a multi-column desktop view to a stacked mobile view, ensuring users can track habits on the go.
- **Toast Notifications & Feedback:** Provides immediate visual confirmation when a habit is created, deleted, or when an error occurs during API communication.
- **Accessibility Features:** Includes "Skip to Main Content" links for keyboard/screen-reader navigation and uses semantic HTML (article, section, dl) for better machine readability.

## 2. Architecture Overview

StreakFlow follows a classic **Client-Server-Database** architecture complemented by an External AI Service Layer. This ensures that the user interface remains fast and responsive while the heavy calculations (streaks and AI generation) happen on the server side and a certain ease of maintenance.

### 2.1 System Architecture Diagram

The following diagram illustrates the flow of data when a user interacts with the application:

```mermaid

graph TD
    subgraph "Client Side (Frontend)"
        A[Browser / Vanilla JS] --> B[State Manager & DOM Updater]
        B --> C[Theme & UI Components]
    end

    subgraph "Server Side (Backend)"
        D[Express.js API Server]
        E[Streak Calculation Logic]
        F[Groq AI SDK Connector]
    end

    subgraph "Data & External Services"
        G[(PostgreSQL Database)]
        H[Groq Cloud / Llama 3.3]
    end

    A -- "HTTP/JSON Requests" --> D
    D -- "SQL Queries" --> G
    D -- "Prompt Engineering" --> H
    G -- "Habit History" --> D
    H -- "AI Suggestions/Greetings" --> D
    D -- "Aggregated Data" --> A
```
### 2.2 Component Breakdown

#### A. Frontend (The client)

The StreakFlow frontend is built using a "Vanilla" stack (HTML5, CSS3, and ES6+ JavaScript) without external frameworks. This choice was made to prioritize performance, minimize load times, and demonstrate a deep understanding of core web technologies.

##### Reactive UI strategie

Despite not using a framework like React, the frontend achieves a "reactive" feel through a Fetch-and-Render pattern.

The UI is split into independent functions (``fetchToday``, ``loadWeek``, ``loadStats``). When a user performs an action—like toggling a habit—the application triggers a "chain reaction" of these functions to ensure all parts of the dashboard stay synchronized without a page reload.

The app uses the document.createElement API and innerHTML template strings to dynamically generate the weekly grid and statistics cards based on JSON data received from the backend.

##### Advanced CSS & Dark Mode

The styling strategy focuses on clean aesthetics and user accessibility:
- **CSS Custom Properties (Variables):** The entire color palette is defined using CSS variables (e.g., ``--primary-color``, ``--bg-light``). This allows for a robust Dark Mode implementation. By simply toggling a .dark-mode class on the ``<body>`` tag, the entire UI shifts colors instantaneously.
- **Persistence:** The user's theme preference is saved in ``localStorage``, ensuring the app remembers their choice even after the browser is closed.
- **Layout Engines:** A combination of CSS Grid (for the statistics cards and dashboard layout) and Flexbox (for navigation and habit list items) ensures a fully responsive experience across mobile, tablet, and desktop screens.

##### The Weekly Completion Grid

The most complex frontend component is the 7-day rolling table:
- **Dynamic Column Generation:** The table header is generated on the fly, calculating the last seven dates relative to the current moment.
- **Logic-Driven Styling:** Each cell is assigned a class (``status-done``, ``status-missed``, or ``status-pending``) based on a comparison between the habit history and the specific date column.
- **Interactive History:** Every cell in the table is an interactive button. Clicking a "Missed" day in the past sends a request to the server to retroactively update the completion status, allowing users to correct their records.

##### Client-Side Logic & Streak Calculation

While the server stores the data, the frontend handles the heavy lifting of calculating streaks to reduce server load:
- **Current Streak Algorithm:** The script iterates backward from "Today" through the sorted completion dates. If it finds a gap (a day not completed), the loop breaks, and the current count is displayed.
- **Best Streak Algorithm:** The script analyzes the entire history of a habit, looking for the longest continuous chain of consecutive dates.
- **Performance Metrics:** The frontend calculates the "Completion Rate" (Total Done / Total Days Tracked) and identifies the "Top Performer" and "Needs Attention" habits by sorting the habit objects based on their calculated rates.

##### Date Handling & Timezone Synchronization

A significant challenge in habit tracking is the "Midnight Problem," where UTC time might differ from the user's local time. The frontend uses a custom ``toLocalDateKey()`` function. This ensures that dates are always processed as ``YYYY-MM-DD`` strings in the user's local time, preventing habits from appearing on the wrong day due to timezone offsets.

##### User Feedback & Accessibility

- **Toast Notifications:** A custom notification system provides non-intrusive feedback (e.g., "Habit Created!" or "Error: Try Again") using CSS animations.
- **ARIA Roles:** Data-role attributes and semantic HTML tags (like ``article``, ``section``, and ``dl`` for statistics) ensure the app is navigable by screen readers.
- **Skip Links:** A "Skip to Main Content" link is available for keyboard-only users to bypass the navigation menu.

#### B. BackEnd (The API Server)

The backend was built with **Node.js** and **Express**. It serves as the bridge between the persistent storage and the user interface.

##### The "Upsert" Pattern (Completion Logic)

One of the most critical features of the backend is the ``/habit-completions`` endpoint. When a user marks a habit as "done" or "not done," the backend must ensure that multiple records aren't created for the same habit on the same day.

For that we utilize the PostgreSQL UPSERT (Insert or Update) logic:

```sql
INSERT INTO habit_daily_completions (habit_id, completion_date, is_completed)
VALUES ($1, COALESCE($3, CURRENT_DATE), $2)
ON CONFLICT (habit_id, completion_date)
DO UPDATE SET is_completed = EXCLUDED.is_completed;
```

##### Time-Series Data Retrieval

To populate the 7-day rolling grid without fetching the entire history of the user (which would be slow), the backend uses a specialized interval Query:

```sql
SELECT ... FROM habit_daily_completions hdc
WHERE hdc.completion_date >= CURRENT_DATE - INTERVAL '6 days';
```

This dynamically calculates the "start of the week" based on the server's clock. It ensures that the "Weekly Habits" section always shows the last 7 days including today, regardless of when the user logs in.

##### AI Orchestration & Prompt Engineering

The backend acts as a secure "proxy" for the Groq Cloud API. This is done for two reasons:
- **Security:** To keep the GROQ_API_KEY hidden from the public-facing frontend.
- **Context Construction:** Before calling the Llama 3.3 model, the server performs a database lookup to see how many habits are completed. It then constructs a structured Prompt:
    - System Role: "You are a friendly productivity coach."
    - User Role: for example "User has done 2 out of 5 habits. The habits left are: [Exercise, Read]. Give a punchy greeting."

By doing this on the backend, we reduce the amount of work the browser has to do and ensure the AI always has the most accurate data.

##### Middleware and Security

- **CORS (Cross-Origin Resource Sharing):** Configured to allow the frontend (hosted on GitHub Pages) to communicate securely with the API (hosted on Render).
- **Environment Management:** Using ``dotenv``, sensitive credentials like the ``DATABASE_URL`` and ``GROQ_API_KEY`` are kept out of the source code, adhering to industry security standards.
- **Static Serving:** The backend is configured to serve the frontend files from a ``public`` folder if needed, allowing for an "all-in-one" deployment package.

##### Timezone & Edge Case Handling

A common issue in habit trackers is the "Midnight Problem" (where a habit is logged for the wrong day due to timezone shifts).
To soluce this, the backend connection string is configured with options: ``"-c timezone=Europe/Helsinki"``. This forces the PostgreSQL database to treat CURRENT_DATE according to a specific timezone, ensuring consistency between what the user sees in Finland and what the server records in the database.

##### Error Handling and Fallbacks

The backend is designed to be Resilient:
- **AI Fallbacks:** If the Groq API is down or the rate limit is reached, the server catches the error and returns a "Hardcoded Motivation" (e.g., "Keep pushing, you're doing great!") so the user never sees an error message.
- **Database Reliability:** Every query is wrapped in a ``try...catch`` block. If a database query fails, the server sends a specific ``500 Internal Server Error`` with a JSON message, which the frontend displays in the ``error-display`` paragraph to inform the user.

#### C. Database (PostgreSQL)

The persistence layer of StreakFlow is managed by a Relational PostgreSQL database hosted in SUpabase platform.
We needed two tables to store and get the completion of created habits:
- Habits Table to store the habits and creation dates
- Completions Table to track habits daily completion

##### Table ``habits``

```sql
CREATE TABLE habits (
    habit_id BIGSERIAL PRIMARY KEY,
    habit_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

- **Role:** Each row represents a specific habit.
- **Fields:**
    - ``habit_id``: A unique auto-incrementing integer (BigSerial) used as the Primary Key.
    - ``habit_name``: The descriptive name of the habit (e.g., "Meditation").
    - ``created_at``: A timestamp capturing when the habit was first added to the system.


##### Table ``habit_daily_completion``

```sql
CREATE TABLE habit_daily_completions (
    completion_id BIGSERIAL PRIMARY KEY,
    habit_id BIGINT REFERENCES habits(habit_id) ON DELETE CASCADE,
    completion_date DATE NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_habit_date UNIQUE (habit_id, completion_date)
);
```

- **Role:** Every row tracks the status of a specific habit on a specific calendar day.
- **Foreign Key Relationship:** The ``habit_id`` column creates a link to the habits table. The ``ON DELETE CASCADE`` constraint is a critical architectural choice: if a user deletes a habit, all associated historical completion data is automatically purged, maintaining database cleanliness.
- **Data Granularity:** The ``completion_date`` uses the ``DATE`` type rather than ``TIMESTAMP``. This ensures that we track progress by day, regardless of what hour the user logs their activity.
- **Boolean Logic:** The ``is_completed`` flag allows the app to explicitly track both "Success" (True) and "Missed/Failed" (False) states.

## 3. Technology Choices and Justification

The selection of the "PERN" stack (PostgreSQL, Express, Render/Node) with a Vanilla JavaScript frontend was driven by the need for data integrity, low-latency AI interactions, and a lightweight client-side experience.

### 3.1 Frontend: Vanilla JavaScript, HTML5, and CSS3

Instead of using a modern framework like React or Vue, StreakFlow utilizes Vanilla JavaScript.

- **Justification:** For a utility-focused application like a habit tracker, a framework adds unnecessary "overhead" (larger bundle sizes and complex build steps). By using direct DOM manipulation (e.g., ``document.createElement``, ``querySelector``), the application achieves near-instant load times.
- **State Management:** I implemented a manual "fetch-and-render" cycle. Whenever a habit is toggled, a chain of updates (``fetchToday()``, ``loadWeek()``, ``loadStats()``) ensures the UI remains synchronized with the database without the complexity of a global state library like Redux.
- **CSS Custom Properties (Variables):** The use of ``:root`` variables allowed for a seamless Dark Mode implementation. By simply toggling a ``.dark-mode`` class on the ``body``, the entire UI updates instantly without requiring a page reload or heavy JavaScript logic.

### Backend: Node.js and Express

The backend acts as a RESTful API, serving JSON data to the frontend.

- **Justification:** Node.js's non-blocking I/O model is ideal for handling multiple asynchronous requests, such as simultaneous calls to the PostgreSQL database and the Groq AI API.
- **Middleware:** Express was chosen for its mature ecosystem. I utilized ``cors`` to allow frontend-backend communication across different origins and ``express.json()`` to parse incoming habit data efficiently.
- **Timezone Handling:** A specific challenge was the "Previous Day Bug" where habits would appear on the wrong day due to UTC shifts. I configured the Node environment and the SQL queries (``INTERVAL '6 days'``) to ensure that "today" is always calculated relative to the user's local perspective.

### Database: PostgreSQL (Relational)

While NoSQL databases (like MongoDB) are popular for rapid prototyping, a Relational Database Management System (RDBMS) was essential for StreakFlow.

- **Justification:** Habit tracking is inherently relational. A "Completion" record has no meaning without a corresponding "Habit" definition. PostgreSQL’s Foreign Key constraints with ``ON DELETE CASCADE`` ensure that if a user deletes a habit, all associated history is wiped cleanly, preventing "orphaned" data.
- **Complex Aggregations:** To generate the weekly view, I used a ``LEFT JOIN`` between the ``habits`` and ``habit_daily_completions`` tables. This allows the API to return a list of all habits even if they haven't been completed yet today—a task that is significantly more complex in a non-relational database.
- **Concurrency Control:** The ``UNIQUE (habit_id, completion_date)`` constraint in SQL ensures that a user cannot accidentally create two completion records for the same habit on the same day, maintaining data accuracy.

### 3.4 AI Integration: Groq (Llama 3.3 70B)

The integration of Artificial Intelligence is a core feature of StreakFlow.
- **Justification:** Most AI APIs (like OpenAI) can take 2–5 seconds to generate a response, which creates a "laggy" user experience. Groq was selected because its LPU (Language Processing Unit) architecture provides sub-second inference.
- **JSON Mode:**  utilization of Groq's ``response_format: { type: "json_object" }``. This ensures that the habit suggestions returned by the Llama 3.3 model are always in a valid JavaScript array format, preventing the application from crashing due to unexpected text formatting from the AI.
- Personalization logic: Instead of a generic "Hello," (Google Gemini AI situation when given the already created habits) the backend sends the current completion count (e.g., "2 out of 5 done") to the AI. This allows the model to generate context-aware coaching (e.g., "You're halfway there, don't stop now!").

### 3.5 Deployment and Environment

- **Vercel:** The frontend is hosted on Vercel which allows automatic Git deployments, provides secure URLs and optimal performance.
- **Render:** The backend is hosted on Render, which provides an integrated environment for Node.js and Managed PostgreSQL.
- **Security:** Sensitive credentials, including the DATABASE_URL and GROQ_API_KEY, are managed via environment variables (process.env), ensuring that API keys are never exposed in the source code or on the client side.

## Live Demo

- URL: 
    - frontend: https://streakflow-bay.vercel.app/
    - backend: https://streakflow-xgoi.onrender.com
    - The database is hosted in Supabase

No credentials needed for the webpage, though the database is the same for everyone. Current version uses a global user state.

## Set up instructions

You can interact with StreakFlow in two ways: via the live production deployment or by setting up a local development environment.

The easiest way to explore StreakFlow is through the live application (see Part Live Demo for URLs).

### 1. Run locally

To run StreakFlow on your machine, follow the following steps.

### 1.1 Prerequisites

Ensure you have the following installed:
Node.js (v16 or higher)
PostgreSQL (Local instance or remote URI)
A Groq Cloud API Key (Required for AI features).

### 1.2 Clone the repository

```bash
git clone https://github.com/HeleneQ/streakflow.git
cd streakflow
```

### 1.3 Backend Configuration

Navigate to the root directory and install dependencies:

```bash
npm install
```

Create a .env file in the root directory:

```bash
touch .env
```
Add the following variables to your .env file:

```env
PORT=5000
DATABASE_URL=postgres://username:password@localhost:5432/streakflow
GROQ_API_KEY=your_groq_api_key_here
```

### 1.4 Database Initialization

Log into your PostgreSQL terminal and run the following commands to create the necessary tables:

```sql
CREATE TABLE habits (
    habit_id BIGSERIAL PRIMARY KEY,
    habit_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE habit_daily_completions (
    completion_id BIGSERIAL PRIMARY KEY,
    habit_id BIGINT REFERENCES habits(habit_id) ON DELETE CASCADE,
    completion_date DATE NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_habit_date UNIQUE (habit_id, completion_date)
);
```

### 1.5 Frontend Configuration

Open script.js and ensure the API constant is set to point to your local server:

```javascript
// const API = "https://your-production-url.render.com"; // Comment this out
const API = "http://localhost:5000"; // Uncomment this for local dev
```

### 1.6 Run the application

#### 1.6.1. Start the Backend

```bash
node server.js
```

The server should now be running at http://localhost:5000 .

#### 1.6.2 Lauch the Frontend

Open index.html in your browser. For the best experience, use a local server extension like **Live Server** in VS Code.

### 2. Troubleshooting

- CORS Errors: Ensure the backend ``server.js`` has ``app.use(cors())`` enabled.
- Database Connection: Verify that your ``DATABASE_URL`` in the ``.env`` file matches your local PostgreSQL credentials.
- AI Features Not Working: Check that your ``GROQ_API_KEY`` is active and that you have not exceeded your rate limits ("The Free tier lets you use GroqCloud and call supported models, but your usage is capped by rate limits (requests/tokens per minute or per day)").
- Date Issues: If habits appear on the wrong day, ensure your system clock is correct. The app uses local ISO strings to sync with the database.
- Groq's delay to answer a request might be longer than expected("Note: Data can be delayed by up to 15 minutes."). Just wait.
- For live use, you sould know that the AI LLama-3.3-70b allows 30 requests per minute, 1K per day, has 12K tokens per minute and 100K per day freely.

## AI Usage Disclosure

### 1. Integrated AI Features

StreakFlow utilizes the Groq Cloud API running the Llama-3.3-70b-versatile model to provide a personalized user experience. Unlike static applications, StreakFlow uses "Live AI" to drive engagement.

- **Smart Habit Suggestions:** The ``/habits/suggest`` endpoint sends the user's current list of habits to the AI. The AI then analyzes these patterns and returns a raw JSON array of 5 complementary habits.
- **Dynamic Coaching (Welcome Message):** The ``/habits/welcome-message`` endpoint analyzes the user's completion data for the current day. It generates a context-aware, single-sentence greeting (e.g., "3/5 done—you're in the home stretch!") rather than a generic "Hello."

### 2. AI Tools Used during Development

Tools used: 
- Google AI Studio with Gemini 3 Flash Preview: Used during the coding process for architectural guidance, CSS styling, and logic troubleshooting.
- Groq Cloud API LLama-3.3-70b-versatile: Integrated into the live backend to provide real-time habit suggestions and personalized coaching messages.

### 3. What was Generated by AI

The following components were initially scaffolded or suggested by Google AI Studio:
- **Database Schema Design:** The relational structure between the ``habits`` and ``habit_daily_completions`` tables, including the use of ``BIGSERIAL`` for primary keys and the ``UNIQUE`` constraint for date-consistency.
- **CSS Foundation:** The core layout of the body, including the "Dark Mode" variable system (:root variables) and the responsive grid for the statistics cards.
- **Logic Boilerplate:** Initial structures for the loadStats() and loadWeek() functions in JavaScript, specifically the math for calculating percentage-based completion rates.
- **Prompt Engineering:** The system instructions used to ensure the Llama model returns strictly formatted JSON for the "Suggest Ideas" feature.

### 4. What was manually modified

While AI provided the "blueprints", it was necessary to understand our need to produce an ai-understandable, guided and simplified prompt. Also significant manual intervention was required to transform the code into a production-ready application:
- **Timezone Synchronization (Critical Fix):** AI-generated date logic often defaulted to UTC, causing habits to "flicker" or disappear depending on the user's timezone. I manually rewrote the toLocalDateKey function to ensure all tracking is pinned to the user's local browser time.
- **UI/UX Customization:** I manually refactored the CSS to improve accessibility (Aria-labels and skip-links, change AI generated parameters) and adjusted the "Toast" notification system to ensure it didn't overlap with the main navigation on mobile devices.
- **Error Handling & Fallbacks:** AI often assumes "happy path" API responses. I manually implemented try/catch blocks and "Fallback" content (e.g., hardcoded habit suggestions) so the app remains functional even if the Groq API limit is reached or the server is offline.


### 5. Reflection on AI as a Development Partner

Using Google AI Studio allowed me to focus on the User Experience and Feature Design rather than getting bogged down in boilerplate syntax. The AI was particularly effective at explaining why certain JavaScript errors occurred (such as asynchronous fetch races), which served as an educational tool as much as a coding one.

Moreover, AI was useful to learn more about requests, databases, ai api ans so much more. 

## Reflection and future improvments

### 1. Challenges

- **Date Synchronization:** Handling dates between a PostgreSQL server (often in UTC) and a client browser (Local Time) was the most difficult part of the project. This was solved by stripping time data and working purely with YYYY-MM-DD strings.
- **State Management:** Refreshing multiple components (Dashboard, Table, Stats) after a single click required a clean modular function approach in script.js.
- **Fetch AI:** Handling AI API on server.js and produce a complete prompt (role, content, example, format) needed to understand how Groq was handling our demand.

### 2. Future Improvements

- **User Authentication:** Add login so multiple users can have private habit lists and so be sure that all users have their own database.
- **Push Notifications:** Use Web Push API to remind users to complete habits if they haven't checked them by a certain time.
- **Data Export:** Allow users to download their habit history as a CSV file.
- **Mobile App:** Convert the project into a PWA (Progressive Web App) for an "app-like" experience on mobile.