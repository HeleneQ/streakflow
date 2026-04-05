const express = require("express");
const cors = require("cors");
const pg = require("pg");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("google/generative-ai");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

app.get("/habits/suggest", async (req,res) =>  {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
        const prompt = "Suggest 5 short, positive daily habit names (max 4 words each) for a habit tracker. Return ONLY a JSON array of strings. Example: ['Drink Water', 'Read 10 pages']";
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const cleanedText = text.replace(/```json|```/g, "").trim();
        const suggestions = JSON.parse(cleanedText);

        res.json(suggestions);
    } catch (error) {
        console.error('AI Suggestion Error:', error);
        // Fallback habits if AI fails
        res.json(["Drink Water", "Meditation", "Exercise", "Reading", "Journaling"]);
    }
});

app.listen(port, () => {
  console.log("Server running on port", port);
});