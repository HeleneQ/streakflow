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
const API = "http://localhost:5000";


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

/* Init */

document.addEventListener("DOMContentLoaded", () => {
  setDate();
  fetchToday();
  loadWeek();
  loadStats();
  setupForm();
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

      li.appendChild(checkbox);
      li.appendChild(label);

      todayHabitsList.appendChild(li);

      if (h.done) completed++;
    });

    completedHabits.textContent =
      `${completed} / ${habits.length} habits completed`;

  } catch (err) {
    showError("Failed to load today's habits");
  }
}

/* Toggle */

async function toggleHabit(id, state) {
  try {
    await fetch(`${API}/habit-completions`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        habit_id: id,
        is_completed: state
      })
    });

    fetchToday();
    loadWeek();
    loadStats();

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
      let rowHTML = `<tr><th scope="row">${h.name}</th>`;

      days.forEach(d => {
        const key = toLocalDateKey(d);
        const status = h.completions[key];

        let text = "Pending"; 
        let cssClass = "status-pending";

        if (status === true) {
          text = "Done";
          cssClass = "status-done";
        } else if (status === false) {
          text = "Missed";
          cssClass = "status-missed";
        }

        rowHTML += `<td class="${cssClass}">${text}</td>`;
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
    const res = await fetch(`${API}/habits/week`);
    const data = await res.json();

    const habits = {};

    data.forEach(row => {
      if (!habits[row.habit_id]) {
        habits[row.habit_id] = {
          name: row.habit_name,
          total: 0,
          done: 0
        };
      }

      if (row.completion_date) {
        habits[row.habit_id].total++;
        if (row.is_completed) habits[row.habit_id].done++;
      }
    });

    const list = Object.values(habits);

    // TOTAL
    totalHabitsEl.textContent = list.length;

    // WEEKLY RATE
    const avg = list.reduce((acc, h) =>
      acc + (h.done / (h.total || 1)), 0
    ) / (list.length || 1);

    weeklyRateEl.textContent = Math.round(avg * 100) + "%";

    // BEST / WORST
    const sorted = [...list].sort(
      (a, b) => (b.done / b.total) - (a.done / a.total)
    );

    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    if (best) {
      topName.textContent = best.name;
      topRate.textContent =
        Math.round((best.done / best.total) * 100) + "%";
    }

    if (worst) {
      worstName.textContent = worst.name;
      worstRate.textContent =
        Math.round((worst.done / worst.total) * 100) + "%";
    }

  } catch {
    showError("Failed to load stats");
  }
}

/* Error handling */

function showError(msg) {
  errorDisplay.textContent = msg;
}