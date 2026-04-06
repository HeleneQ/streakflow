/**
 * StreakFlow - Habit Tracker JavaScript
 * ======================================
 * This script handles all dynamic functionality for the habit tracking app in the frontend part:
 * 2. Dynamic date display
 * 3. Checkbox interactions and streak management
 * 4. Adding new habits
 * 5. Weekly table generation
 * 6. Statistics calculation
 * 7. Delete habits functionality
 * 8. Toast notifications
 */

/* API URL */
const API = "https://streakflow-xgoi.onrender.com";
//const API = "http://localhost:5000";

/* Get all DOM constants*/
const toggleThemeBtn = document.getElementById('toggle-theme');

const errorDisplay = document.getElementById('error-display')

const todayHeading = document.getElementById('today-heading');
const completedHabits = document.getElementById('completed_habits');
const habitsForm = document.getElementById('habits-form');
const todayHabitsList = document.getElementById('today_habits-list');

const weekHeading = document.getElementById('week-heading');
const tableHead = document.querySelector('[data-role="table-head"]');
const tableBody = document.querySelector('[data-role="table-body"]');
const tableCaption = document.querySelector('caption');

const statsTitle = document.getElementById('stats');
const totalHabitsEl = document.querySelector('[data-role="total-habits"]');
const weeklyRateEl = document.querySelector('[data-role="weekly-rate"]');
const bestStreakEl = document.querySelector('[data-role="best-streak"]');
const totalDaysEl = document.querySelector('[data-role="total-days"]');

const topName = document.querySelector('[data-role="top-name"]');
const topCurrentStreak = document.querySelector('[data-role="top-current-streak"]');
const topBestStreak = document.querySelector('[data-role="top-best-streak"]');
const topRate = document.querySelector("[data-role='top-rate']");

const worstName = document.querySelector('[data-role="worst-name"]');
const worstCurrentStreak = document.querySelector('[data-role="worst-current-streak"]');
const worstBestStreak = document.querySelector('[data-role="worst-best-streak"]');
const worstRate = document.querySelector('[data-role="worst-rate"]');

const createHabitForm = document.querySelector('#create-habit form');
const habitNameInput = document.getElementById('habit-name');
const formMessage = document.querySelector('[data-role="form-message"]');

const suggestBtn = document.getElementById('get-suggestions-btn');
const suggestionsList = document.getElementById('suggestions-list');

const aiMessageEl = document.getElementById('ai-message');

/* Init */

document.addEventListener("DOMContentLoaded", () => {
  setDate();
  fetchToday();
  loadWeek();
  loadStats();
  setupForm();
  updateWelcomeMessage();
});

/* Theme toggle */

const savedTheme = localStorage.getItem('theme');

if (savedTheme === 'dark') {
  document.body.classList.add('dark-mode');
}

toggleThemeBtn.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-mode');

  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});


/* Display Today's Date */

function setDate(){
  const today = new Date();
  todayHeading.textContent = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

/* Handle suggestions */

suggestBtn.addEventListener('click', async () => {
    suggestBtn.disabled = true;
    suggestBtn.textContent = "Thinking...";
    suggestionsList.innerHTML = "";

    try {
        const res = await fetch(`${API}/habits/suggest`);
        if (!res.ok) throw new Error("Failed to get suggestions");
        
        const suggestions = await res.json();

        suggestions.forEach(text => {
            const chip = document.createElement('button');
            chip.type = "button";
            chip.className = "suggestion-chip";
            chip.textContent = `+ ${text}`;
            
            // When clicked, fill the input
            chip.addEventListener('click', () => {
                habitNameInput.value = text;
                habitNameInput.focus();
            });

            suggestionsList.appendChild(chip);
        });
    } catch (err) {
        console.error(err);
        showError("Could not load suggestions.");
    } finally {
        suggestBtn.disabled = false;
        suggestBtn.textContent = "Suggest Ideas (by AI)";
    }
});

/* Today's Habits */

async function fetchToday() {
  try {
    const res = await fetch(`${API}/habits/today`);
    if (!res.ok) throw new Error('Failed to fetch today habits');
    
    const habits = await res.json();

    todayHabitsList.innerHTML = "";

    let completed = 0;

    habits.forEach(h => {
      const li = document.createElement("li");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = h.done;

      checkbox.addEventListener("change", () => {
        toggleHabit(h.habit_id, checkbox.checked);
      });

      const label = document.createElement("label");
      label.textContent = h.habit_name;

      const btn = document.createElement("button");
      btn.textContent = "Delete";
      btn.className = "delete-habit-btn";
      btn.addEventListener("click", () => deleteHabit(h.habit_id));

      li.appendChild(checkbox);
      li.appendChild(label);
      li.appendChild(btn);

      todayHabitsList.appendChild(li);

      if (h.done) completed++;
    });

    completedHabits.textContent =
      `${completed} / ${habits.length} habits completed`;

  } catch (err) {
    showError("Failed to load today's habits");
  }
}

/* Delete habit */

async function deleteHabit(id) {
  if (!confirm("Are you sure you want to delete this habit? All progress data will be lost.")) {
    return;
  }
  try {
    const res = await fetch(`${API}/habits/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Delete failed");

    // Refresh all UI components
    fetchToday();
    loadWeek();
    loadStats();
    
    console.log("Habit deleted");
    
  } catch (err) {
    console.error(err);
    showError("Failed to delete the habit");
  }
}

/* Toggle */

async function toggleHabit(id, state, date=null) {
  try {
    await fetch(`${API}/habit-completions`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        habit_id: id,
        is_completed: state,
        completion_date: date
      })
    });

    fetchToday();
    loadWeek();
    loadStats();
    updateWelcomeMessage();

  } catch {
    showError("Failed to update habit");
  }
}


/* Week table */

function getLocalISODate(date) {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
}

async function loadWeek() {
  /**
   * Helper function to get a YYYY-MM-DD string using LOCAL time
   * This prevents the "previous day" bug caused by UTC offsets.
   */
  const toLocalDateKey = (dateInput) => {
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  try {
    const res = await fetch(`${API}/habits/week`);
    if (!res.ok) throw new Error('Failed to fetch week habits');

    const data = await res.json();

    // Reset table content
    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    // 1. Generate the last 7 days (ending with today)
    const days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    // 2. Generate Table Header
    let headRow = "<tr><th scope='col'>Habit</th>";
    days.forEach(d => {
      headRow += `<th scope='col'>${d.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric"
      })}</th>`;
    });
    headRow += "</tr>";
    tableHead.innerHTML = headRow;

    // 3. Update Table Caption
    const firstDate = toLocalDateKey(days[0]);
    const lastDate = toLocalDateKey(days[6]);
    tableCaption.textContent = `Habit completion from ${firstDate} to ${lastDate}`;

    // 4. Group data by habit_id
    const grouped = {};
    data.forEach(row => {
      if (!grouped[row.habit_id]) {
        grouped[row.habit_id] = {
          id: row.habit_id,
          name: row.habit_name,
          completions: {} // Format: { "2023-10-28": true }
        };
      }

      if (row.completion_date) {
        // Fix: Convert database date to Local Date String
        const dateKey = toLocalDateKey(row.completion_date);
        grouped[row.habit_id].completions[dateKey] = row.is_completed;
      }
    });

    // 5. Generate Table Body Rows
    Object.values(grouped).forEach(h => {
      const todayKey = toLocalDateKey(new Date());
      let rowHTML = `<tr><th scope="row">${h.name}</th>`;

      days.forEach(d => {
        const key = toLocalDateKey(d);
        const status = h.completions[key];

        let text = ""; 
        let cssClass = "";
        const isDone = status === true;

        if (isDone) {
          text = "Done";
          cssClass = "status-done";
        } else if (key === todayKey) {
          text = "Pending";
          cssClass = "status-pending";
        } else {
          text = "Missed";
          cssClass = "status-missed";
        }

        rowHTML += `<td 
          class="${cssClass}" 
          style="cursor: pointer; user-select: none;"
          onclick="toggleHabit(${h.id}, ${!isDone}, '${key}')"
        >${text}</td>`;
      });

      rowHTML += "</tr>";
      tableBody.innerHTML += rowHTML;
    });

  } catch (err) {
    console.error("Error in loadWeek:", err);
    showError("Failed to load weekly data");
  }
}


/* Create Habit */

function setupForm() {
  createHabitForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = habitNameInput.value;

    if (!name) {
      formMessage.textContent = "Habit name is required";
      return;
    }

    try {
      await fetch(`${API}/habits`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          habit_name: name
        })
      });

      formMessage.textContent = "Habit created!";
      createHabitForm.reset();

      fetchToday();
      loadWeek();
      loadStats();
    } catch {
      formMessage.textContent = "Error creating habit";
    }
  });
}


/* Stats */

async function loadStats() {
  try {
    const res = await fetch(`${API}/habits/stats-all`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json();

    if (data.length === 0) return;

    const habitsMap = {};
    const uniqueDaysTracked = new Set();
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. Process data into a usable Map
    data.forEach(row => {
      if (!habitsMap[row.habit_id]) {
        habitsMap[row.habit_id] = {
          name: row.habit_name,
          completions: [], // List of dates where is_completed was true
          allEntries: []   // Every record for this habit
        };
      }
      
      if (row.completion_date) {
        const dateKey = new Date(row.completion_date).toISOString().split('T')[0];
        uniqueDaysTracked.add(dateKey);
        
        habitsMap[row.habit_id].allEntries.push({ date: dateKey, completed: row.is_completed });
        if (row.is_completed) {
          habitsMap[row.habit_id].completions.push(dateKey);
        }
      }
    });

    // 2. Calculate individual stats for each habit
    const habitsList = Object.values(habitsMap).map(habit => {
      // Sort dates descending for current streak calculation
      const sortedDates = habit.allEntries.sort((a, b) => b.date.localeCompare(a.date));
      
      // Calculate Current Streak
      let currentStreak = 0;
      let checkDate = new Date(); // Start from today
      
      // If today isn't done, check if yesterday was the end of a streak
      const doneToday = habit.completions.includes(todayStr);
      
      for (let i = 0; i < 1000; i++) { // Safety limit
        const dStr = checkDate.toISOString().split('T')[0];
        if (habit.completions.includes(dStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // If we reach a day not completed, and it's not "today" (which might not be done yet), streak breaks
          if (dStr !== todayStr) break; 
          else checkDate.setDate(checkDate.getDate() - 1);
        }
      }

      // Calculate Best Streak
      let bestStreak = 0;
      let tempStreak = 0;
      const ascDates = [...new Set(habit.completions)].sort(); // unique sorted dates
      
      for (let i = 0; i < ascDates.length; i++) {
        const current = new Date(ascDates[i]);
        const next = ascDates[i+1] ? new Date(ascDates[i+1]) : null;
        
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;

        // If next date is not exactly 1 day ahead, reset temp
        if (next) {
          const diffTime = Math.abs(next - current);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 1) tempStreak = 0;
        }
      }

      const completionRate = habit.allEntries.length > 0 
        ? (habit.completions.length / habit.allEntries.length) 
        : 0;

      return {
        ...habit,
        currentStreak,
        bestStreak,
        completionRate
      };
    });

    // 3. Global Stats
    totalHabitsEl.textContent = habitsList.length;
    totalDaysEl.textContent = uniqueDaysTracked.size;
    
    const overallBest = Math.max(...habitsList.map(h => h.currentStreak), 0);
    bestStreakEl.textContent = overallBest + " days";

    const avgRate = habitsList.reduce((acc, h) => acc + h.completionRate, 0) / (habitsList.length || 1);
    weeklyRateEl.textContent = Math.round(avgRate * 100) + "%";

    // 4. Top Performer vs Needs Attention
    const sortedByRate = [...habitsList].sort((a, b) => b.completionRate - a.completionRate);
    
    const best = sortedByRate[0];
    const worst = sortedByRate[sortedByRate.length - 1];

    if (best) {
      topName.textContent = best.name;
      topCurrentStreak.textContent = best.currentStreak + " days";
      topBestStreak.textContent = best.bestStreak + " days";
      topRate.textContent = Math.round(best.completionRate * 100) + "%";
    }

    if (worst) {
      worstName.textContent = worst.name;
      worstCurrentStreak.textContent = worst.currentStreak + " days";
      worstBestStreak.textContent = worst.bestStreak + " days";
      worstRate.textContent = Math.round(worst.completionRate * 100) + "%";
    }

  } catch (err) {
    console.error(err);
    showError("Failed to calculate statistics");
  }
}

/* Display AI message */

async function updateWelcomeMessage() {
  try {
    aiMessageEl.textContent = "Updating status..."; // Loading state
    const res = await fetch(`${API}/habits/welcome-message`);
    const data = await res.json();
    aiMessageEl.textContent = data.message;
  } catch (err) {
    aiMessageEl.textContent = "One day at a time. You've got this!";
  }
}

/* Error handling */

function showError(msg) {
  errorDisplay.textContent = msg;
}