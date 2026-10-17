(() => {
  "use strict";

  const STORAGE_KEY = "taskflow.tasks.v1";
  const THEME_KEY = "taskflow.theme.v1";
  const taskForm = document.querySelector("#taskForm");
  const taskInput = document.querySelector("#taskInput");
  const taskList = document.querySelector("#taskList");
  const taskCount = document.querySelector("#taskCount");
  const allCount = document.querySelector("#allCount");
  const activeCount = document.querySelector("#activeCount");
  const completedCount = document.querySelector("#completedCount");
  const clearCompleted = document.querySelector("#clearCompleted");
  const emptyState = document.querySelector("#emptyState");
  const emptyTitle = document.querySelector("#emptyTitle");
  const emptyCopy = document.querySelector("#emptyCopy");
  const statusMessage = document.querySelector("#statusMessage");
  const themeToggle = document.querySelector("#themeToggle");
  const themeIcon = document.querySelector("#themeIcon");
  const todayLabel = document.querySelector("#todayLabel");
  const filterButtons = [...document.querySelectorAll("[data-filter]")];

  let tasks = loadTasks();
  let currentFilter = "all";
  let editingId = null;

  todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short", month: "short", day: "numeric"
  }).format(new Date());

  function loadTasks() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.filter(task =>
        task && typeof task.id === "string" &&
        typeof task.text === "string" &&
        typeof task.completed === "boolean"
      ) : [];
    } catch {
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      announce("Tasks could not be saved in this browser.");
    }
  }

  function announce(message) {
    statusMessage.textContent = "";
    window.setTimeout(() => { statusMessage.textContent = message; }, 20);
  }

  function visibleTasks() {
    if (currentFilter === "active") return tasks.filter(task => !task.completed);
    if (currentFilter === "completed") return tasks.filter(task => task.completed);
    return tasks;
  }

  function updateCounts() {
    const active = tasks.filter(task => !task.completed).length;
    const completed = tasks.length - active;
    taskCount.textContent = tasks.length;
    allCount.textContent = tasks.length;
    activeCount.textContent = active;
    completedCount.textContent = completed;
    clearCompleted.disabled = completed === 0;
  }

  function makeButton(label, symbol, className, action, taskId) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `icon-button ${className || ""}`.trim();
    button.setAttribute("aria-label", label);
    button.title = label;
    button.textContent = symbol;
    button.dataset.action = action;
    button.dataset.taskId = taskId;
    return button;
  }

  function render() {
    taskList.replaceChildren();
    const shown = visibleTasks();

    shown.forEach(task => {
      const item = document.createElement("li");
      item.className = `task-item${task.completed ? " is-completed" : ""}`;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-check";
      checkbox.checked = task.completed;
      checkbox.setAttribute("aria-label", `Mark "${task.text}" as ${task.completed ? "active" : "completed"}`);
      checkbox.dataset.taskId = task.id;

      const content = document.createElement("div");
      content.className = "task-content";
      const title = document.createElement("span");
      title.className = "task-title";
      title.textContent = task.text;
      content.append(title);

      const meta = document.createElement("span");
      meta.className = "task-meta";
      meta.textContent = task.completed ? "Completed" : "In progress";
      content.append(meta);

      const actions = document.createElement("div");
      actions.className = "task-actions";

      actions.append(makeButton("Edit task", "✎", "edit", "edit", task.id));
      actions.append(makeButton("Delete task", "×", "delete", "delete", task.id));

      item.append(checkbox, content, actions);
      taskList.append(item);
    });

    updateCounts();
    emptyState.hidden = shown.length !== 0;
    if (tasks.length === 0) {
      emptyTitle.textContent = "A fresh start";
      emptyCopy.textContent = "Add your first task above and make today count.";
    } else if (shown.length === 0 && currentFilter === "active") {
      emptyTitle.textContent = "All caught up";
      emptyCopy.textContent = "There are no active tasks right now.";
    } else if (shown.length === 0) {
      emptyTitle.textContent = "Nothing completed yet";
      emptyCopy.textContent = "Completed tasks will appear here.";
    }

    filterButtons.forEach(button => {
      const active = button.dataset.filter === currentFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  // Event delegation: one click listener handles all task action buttons,
  // including buttons created later when the list is re-rendered.
  taskList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action][data-task-id]");
    if (!button || !taskList.contains(button)) return;

    const task = tasks.find(entry => entry.id === button.dataset.taskId);
    if (!task) return;

    if (button.dataset.action === "edit") {
      beginEdit(task);
    } else if (button.dataset.action === "delete") {
      tasks = tasks.filter(entry => entry.id !== task.id);
      if (editingId === task.id) {
        editingId = null;
        taskInput.value = "";
        taskForm.querySelector("button[type='submit']").innerHTML = "<span aria-hidden='true'>＋</span> Add task";
      }
      saveTasks();
      render();
      announce("Task deleted.");
    }
  });

  // Delegated change listener handles completion checkboxes in the task list.
  taskList.addEventListener("change", event => {
    const checkbox = event.target;
    if (!checkbox.matches("input.task-check[data-task-id]")) return;

    const task = tasks.find(entry => entry.id === checkbox.dataset.taskId);
    if (!task) return;

    task.completed = checkbox.checked;
    saveTasks();
    render();
    announce(task.completed ? "Task marked completed." : "Task marked active.");
  });

  function beginEdit(task) {
    editingId = task.id;
    taskInput.value = task.text;
    taskForm.querySelector("button[type='submit']").innerHTML = "<span aria-hidden='true'>✓</span> Save edit";
    taskInput.focus();
    announce("Editing task. Update the text and select Save edit.");
  }

  taskForm.addEventListener("submit", event => {
    event.preventDefault();
    const text = taskInput.value.trim();
    if (!text) {
      taskInput.focus();
      return;
    }

    if (editingId) {
      const task = tasks.find(entry => entry.id === editingId);
      if (task) task.text = text;
      editingId = null;
      taskForm.querySelector("button[type='submit']").innerHTML = "<span aria-hidden='true'>＋</span> Add task";
      announce("Task updated.");
    } else {
      tasks.unshift({
        id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text,
        completed: false,
        createdAt: new Date().toISOString()
      });
      announce("Task added.");
    }

    taskInput.value = "";
    saveTasks();
    render();
    taskInput.focus();
  });

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      render();
    });
  });

  clearCompleted.addEventListener("click", () => {
    const count = tasks.filter(task => task.completed).length;
    if (!count) return;
    tasks = tasks.filter(task => !task.completed);
    saveTasks();
    render();
    announce(`${count} completed ${count === 1 ? "task" : "tasks"} cleared.`);
  });

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const dark = theme === "dark";
    themeIcon.textContent = dark ? "☀" : "☾";
    themeToggle.setAttribute("aria-label", `Switch to ${dark ? "light" : "dark"} mode`);
    themeToggle.querySelector(".theme-label").textContent = dark ? "Light mode" : "Dark mode";
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* theme still works for this session */ }
  }

  let savedTheme = "light";
  try {
    savedTheme = localStorage.getItem(THEME_KEY) || "light";
  } catch { /* use default */ }
  setTheme(savedTheme === "dark" ? "dark" : "light");

  themeToggle.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  render();
})();
