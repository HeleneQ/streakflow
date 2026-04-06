const express = require("express");
const cors = require("cors");
const pg = require("pg");
const dotenv = require("dotenv");
const Groq = require("groq-sdk"); 

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// PostgreSQL connection
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    options: "-c timezone=Europe/Helsinki" 
});

///=====================
/// Requests
///=====================

// GET habits
app.get("/habits", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM habits ORDER BY created_at DESC");
        res.json(result.rows);
    } catch(error){
        console.error('Error fetching habits:', error);
        res.status(500).json({ error: 'Failed to fetch habits' });
    }
});

// CREATE habit
app.post("/habits", async (req, res) => {
    const { habit_name } = req.body;

    if (!habit_name) {
        return res.status(400).json({ error: "Habit name required" });
    }

    try {
        const result = await pool.query(
            "INSERT INTO habits (habit_name) VALUES ($1) RETURNING *",
            [habit_name]
        );
        res.json(result.rows[0]);
    } catch(error){
        console.error('Error creating habits:', error);
        res.status(500).json({ error: 'Failed to create habits' });
    }
    
});

// GET today habits
app.get("/habits/today", async (req, res) => {
    try{
        const result = await pool.query(`
            SELECT 
            h.habit_id,
            h.habit_name,
            COALESCE(hdc.is_completed, false) AS done
            FROM habits h
            LEFT JOIN habit_daily_completions hdc
            ON h.habit_id = hdc.habit_id
            AND hdc.completion_date = CURRENT_DATE
        `);

        res.json(result.rows);
    } catch(error){
        console.error('Error fetching day habits:', error);
        res.status(500).json({ error: 'Failed to fetch day habits' });
    }
});

// TOGGLE completion
app.post("/habit-completions", async (req, res) => {
    const { habit_id, is_completed, completion_date } = req.body;

    try{
        const result = await pool.query(`
            INSERT INTO habit_daily_completions (habit_id, completion_date, is_completed)
            VALUES ($1, COALESCE($3, CURRENT_DATE), $2)
            ON CONFLICT (habit_id, completion_date)
            DO UPDATE SET is_completed = EXCLUDED.is_completed
            RETURNING *;
        `, [habit_id, is_completed, completion_date || null]);

        res.json(result.rows[0]);
    } catch(error){
        console.error('Error creating completion:', error);
        res.status(500).json({ error: 'Failed to create completion' });
    }
});

// WEEK DATA
app.get("/habits/week", async (req, res) => {
    try{
        const result = await pool.query(`
            SELECT 
            h.habit_id,
            h.habit_name,
            hdc.completion_date,
            hdc.is_completed
            FROM habits h
            LEFT JOIN habit_daily_completions hdc
            ON h.habit_id = hdc.habit_id
            AND hdc.completion_date >= CURRENT_DATE - INTERVAL '6 days'
        `);

        res.json(result.rows);
    } catch(error){
        console.error('Error fetching week habits:', error);
        res.status(500).json({ error: 'Failed to fetch week habits' });
    }
});

app.delete("/habits/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query("DELETE FROM habits WHERE habit_id = $1", [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Habit not found" });
        }
        res.json({ message: "Habit deleted successfully" });
    } catch (error) {
        console.error('Error deleting habit:', error);
        res.status(500).json({ error: 'Failed to delete habit' });
    }
});

/* Get all history for long term stats */

app.get("/habits/stats-all", async (req, res) => { 
    try {
        const result = await pool.query(`
            SELECT h.habit_id, h.habit_name, hdc.completion_date, hdc.is_completed
            FROM habits h
            LEFT JOIN habit_daily_completions hdc ON h.habit_id = hdc.habit_id
            ORDER BY hdc.completion_date DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error); // Good to log the error to your terminal
        res.status(500).json({ error: 'Failed to fetch all history' });
    }
});

/* get AI suggestions */

app.get("/habits/suggest", async (req, res) => {
    try {
        const existingHabitsResult = await pool.query("SELECT habit_name FROM habits");
        const existingHabits = existingHabitsResult.rows.map(h => h.habit_name);

        // 3. Update the AI call logic
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a productivity coach. Return ONLY a raw JSON array of strings."
                },
                {
                    role: "user",
                    content: `A user tracks these habits: ${existingHabits.join(", ") || 'none'}. 
                    Suggest 5 new, short, and motivating habits. 
                    Example format: ["Drink water", "Read 5 pages"]`
                }
            ],
            // Llama 3.3 70B is very fast and great at following JSON instructions
            model: "llama-3.3-70b-versatile", 
            temperature: 0.7,
            // Groq supports JSON mode for more reliable parsing
            response_format: { type: "json_object" } 
        });

        const content = chatCompletion.choices[0].message.content;
        console.log("Raw Groq Response:", content);

        const parsed = JSON.parse(content);
        
        // Handle cases where the AI might wrap the array in an object (e.g., { "habits": [...] })
        const suggestions = Array.isArray(parsed) ? parsed : (parsed.habits || Object.values(parsed)[0]);

        res.json(suggestions);

    } catch (error) {
        console.error('Groq AI Error:', error);
        // Fallback
        res.json(["Read 10 mins", "Drink Water", "Morning Stretch", "Journaling", "Meditation"]);
    }
});


/* Get AI Welcome Message based on today's progress */
app.get("/habits/welcome-message", async (req, res) => {
    try {
        // 1. Get today's habit status from DB
        const result = await pool.query(`
            SELECT h.habit_name, COALESCE(hdc.is_completed, false) AS done
            FROM habits h
            LEFT JOIN habit_daily_completions hdc
            ON h.habit_id = hdc.habit_id AND hdc.completion_date = CURRENT_DATE
        `);

        const habits = result.rows;
        const total = habits.length;
        const completed = habits.filter(h => h.done).length;
        const pendingNames = habits.filter(h => !h.done).map(h => h.habit_name);

        // 2. Prepare the AI Prompt
        let statusContext = "";
        if (total === 0) {
            statusContext = "The user hasn't created any habits yet.";
        } else if (completed === total) {
            statusContext = `Perfect day! All ${total} habits are done.`;
        } else {
            statusContext = `Progress: ${completed}/${total} done. Still needs to do: ${pendingNames.join(", ")}.`;
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a motivating, friendly productivity coach. Give a very short (one sentence), punchy, and encouraging greeting based on the user's progress. Do not use placeholders like [User Name]. Use a bit of personality."
                },
                {
                    role: "user",
                    content: statusContext
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.8,
            max_tokens: 50
        });

        const message = chatCompletion.choices[0].message.content.trim();
        res.json({ message });

    } catch (error) {
        console.error('Welcome AI Error:', error);
        res.json({ message: "Keep pushing, you're doing great!" }); // Fallback
    }
});

/* Server running */

app.listen(port, () => {
  console.log("Server running on port", port);
});