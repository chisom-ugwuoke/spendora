/**
 * Money Tracker - Personal Naira Expense Manager
 * Vanilla JavaScript implementation
 */

// ==========================================================================
// Constants & State
// ==========================================================================
const STORAGE_KEY = 'money_tracker_expenses_v1';
const THEME_STORAGE_KEY = 'money_tracker_theme_pref';

let expenses = [];
let activeSearchQuery = '';
let activeSortOption = 'date-desc';
let pendingDeleteId = null;

// DOM Elements
const expenseForm = document.getElementById('expenseForm');
const expenseDescription = document.getElementById('expenseDescription');
const expenseAmount = document.getElementById('expenseAmount');
const expenseDate = document.getElementById('expenseDate');
const descError = document.getElementById('descError');
const amountError = document.getElementById('amountError');
const dateError = document.getElementById('dateError');

const expenseList = document.getElementById('expenseList');
const emptyState = document.getElementById('emptyState');
const noSearchResults = document.getElementById('noSearchResults');
const noSearchText = document.getElementById('noSearchText');
const resetSearchBtn = document.getElementById('resetSearchBtn');

const totalCount = document.getElementById('totalCount');
const totalAmount = document.getElementById('totalAmount');
const expenseCountBadge = document.getElementById('expenseCountBadge');

const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const searchStatusBar = document.getElementById('searchStatusBar');

// Edit Modal Elements
const editModal = document.getElementById('editModal');
const editExpenseForm = document.getElementById('editExpenseForm');
const editExpenseId = document.getElementById('editExpenseId');
const editExpenseDescription = document.getElementById('editExpenseDescription');
const editExpenseAmount = document.getElementById('editExpenseAmount');
const editExpenseDate = document.getElementById('editExpenseDate');
const editDescError = document.getElementById('editDescError');
const editAmountError = document.getElementById('editAmountError');
const editDateError = document.getElementById('editDateError');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Delete Modal Elements
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteItemDesc = document.getElementById('deleteItemDesc');
const deleteItemAmount = document.getElementById('deleteItemAmount');
const deleteItemDate = document.getElementById('deleteItemDate');

// Theme Elements
const themeToggleBtn = document.getElementById('themeToggleBtn');
const toggleIcon = document.getElementById('toggleIcon');
const toastContainer = document.getElementById('toastContainer');

// ==========================================================================
// Theme Management (Automatic Device Detection + Manual Override)
// ==========================================================================
const mediaQueryDark = window.matchMedia('(prefers-color-scheme: dark)');

function getEffectiveTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }
  // Automatically detect system preference
  return mediaQueryDark.matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
    toggleIcon.textContent = 'light_mode';
    toggleIcon.setAttribute('title', 'Switch to light mode');
    themeToggleBtn.setAttribute('title', 'Switch to light mode');
    themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
  } else {
    root.setAttribute('data-theme', 'light');
    toggleIcon.textContent = 'dark_mode';
    toggleIcon.setAttribute('title', 'Switch to dark mode');
    themeToggleBtn.setAttribute('title', 'Switch to dark mode');
    themeToggleBtn.setAttribute('aria-label', 'Switch to dark mode');
  }
}

function handleThemeToggle() {
  const currentTheme = getEffectiveTheme();
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  applyTheme(nextTheme);
}

// Listen to device/OS theme preference changes in real-time (only if user hasn't set a manual preference)
mediaQueryDark.addEventListener('change', (e) => {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (!storedTheme) {
    const newTheme = e.matches ? 'dark' : 'light';
    applyTheme(newTheme);
  }
});

// ==========================================================================
// Formatting & Utilities
// ==========================================================================

/**
 * Format any number as Nigerian Naira (₦) with proper grouping and 2 decimals
 * @param {number|string} amount
 * @returns {string} e.g. "₦15,400.00"
 */
function formatNaira(amount) {
  const val = Number(amount) || 0;
  return '₦' + val.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format date string (YYYY-MM-DD) into readable format without timezone shift
 * @param {string} dateString
 * @returns {string} e.g. "Nov 5, 2026"
 */
function formatDateDisplay(dateString) {
  if (!dateString) return 'No date';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const dateObj = new Date(year, month, day);

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Get today's local date formatted as YYYY-MM-DD for date inputs
 * @returns {string}
 */
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Display toast notification
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconName = 'check_circle';
  if (type === 'danger') iconName = 'delete';
  if (type === 'info') iconName = 'info';

  toast.innerHTML = `
    <span class="material-symbols-outlined toast-icon">${iconName}</span>
    <span>${escapeHTML(message)}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 2800);
}

/**
 * Escape HTML to prevent XSS injection
 */
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// Storage Operations
// ==========================================================================
const LEGACY_SAMPLE_DESCRIPTIONS = [
  'Weekly grocery shopping at supermarket',
  'Monthly electricity bill (NEPA/PHCN)',
  'Vehicle fueling / transportation'
];

function isLegacySampleExpense(item) {
  if (!item || typeof item !== 'object') return false;
  return LEGACY_SAMPLE_DESCRIPTIONS.includes(item.description);
}

function loadExpensesFromStorage() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return [];
    }
    const parsed = JSON.parse(rawData);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Clean up any previously persisted sample/mock records from localStorage
    const hasSampleRecords = parsed.some(isLegacySampleExpense);
    if (hasSampleRecords) {
      const sanitized = parsed.filter(item => !isLegacySampleExpense(item));
      saveExpensesToStorage(sanitized);
      return sanitized;
    }

    return parsed;
  } catch (err) {
    console.error('Error loading expenses from localStorage:', err);
    return [];
  }
}

function saveExpensesToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving expenses to localStorage:', err);
    showToast('Failed to save changes to browser storage', 'danger');
  }
}

// ==========================================================================
// Data & Sorting Logic
// ==========================================================================
function getFilteredAndSortedExpenses() {
  const query = activeSearchQuery.trim().toLowerCase();

  // Filter by description
  let filtered = expenses.filter(exp => {
    if (!query) return true;
    return exp.description.toLowerCase().includes(query);
  });

  // Sort
  filtered.sort((a, b) => {
    switch (activeSortOption) {
      case 'date-desc':
        return b.date.localeCompare(a.date) || (b.createdAt - a.createdAt);
      case 'date-asc':
        return a.date.localeCompare(b.date) || (a.createdAt - b.createdAt);
      case 'amount-desc':
        return b.amount - a.amount;
      case 'amount-asc':
        return a.amount - b.amount;
      case 'name-asc':
        return a.description.localeCompare(b.description);
      default:
        return b.createdAt - a.createdAt;
    }
  });

  return filtered;
}

// ==========================================================================
// Render Logic
// ==========================================================================
function renderUI(highlightId = null) {
  updateStatistics();
  renderExpenseList(highlightId);
}

function updateStatistics() {
  const count = expenses.length;
  const total = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  totalCount.textContent = count.toLocaleString();
  totalAmount.textContent = formatNaira(total);
  expenseCountBadge.textContent = count;
}

function renderExpenseList(highlightId = null) {
  const filtered = getFilteredAndSortedExpenses();
  const total = expenses.length;
  const isSearching = activeSearchQuery.trim().length > 0;

  // Search status text
  if (isSearching) {
    clearSearchBtn.classList.remove('hidden');
    searchStatusBar.textContent = `Showing ${filtered.length} of ${total} recorded expenses for "${activeSearchQuery.trim()}"`;
  } else {
    clearSearchBtn.classList.add('hidden');
    searchStatusBar.textContent = total > 0 ? `Showing all ${total} recorded expenses` : '';
  }

  // Clear list
  expenseList.innerHTML = '';

  // Handle empty states
  if (total === 0) {
    emptyState.classList.remove('hidden');
    noSearchResults.classList.add('hidden');
    expenseList.classList.add('hidden');
    return;
  }

  if (filtered.length === 0 && isSearching) {
    emptyState.classList.add('hidden');
    noSearchResults.classList.remove('hidden');
    noSearchText.textContent = `No recorded expenses found matching "${activeSearchQuery.trim()}".`;
    expenseList.classList.add('hidden');
    return;
  }

  // Hide empty state containers & show list
  emptyState.classList.add('hidden');
  noSearchResults.classList.add('hidden');
  expenseList.classList.remove('hidden');

  // Render items
  filtered.forEach(exp => {
    const li = document.createElement('li');
    li.className = 'expense-item';
    li.id = `expense-${exp.id}`;

    if (highlightId && exp.id === highlightId) {
      li.classList.add('highlight-animation');
    }

    li.innerHTML = `
      <div class="expense-left">
        <div class="expense-icon-badge" aria-hidden="true">
          <span class="material-symbols-outlined">payments</span>
        </div>
        <div class="expense-info">
          <span class="expense-desc">${escapeHTML(exp.description)}</span>
          <div class="expense-meta">
            <span class="material-symbols-outlined">event</span>
            <span class="expense-date">${formatDateDisplay(exp.date)}</span>
          </div>
        </div>
      </div>
      <div class="expense-right">
        <div class="expense-amount">${formatNaira(exp.amount)}</div>
        <div class="item-actions">
          <button
            type="button"
            class="action-btn edit-btn"
            data-id="${exp.id}"
            title="Edit this expense"
            aria-label="Edit expense: ${escapeHTML(exp.description)}"
          >
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button
            type="button"
            class="action-btn delete-btn"
            data-id="${exp.id}"
            title="Delete this expense"
            aria-label="Delete expense: ${escapeHTML(exp.description)}"
          >
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `;

    expenseList.appendChild(li);
  });
}

// ==========================================================================
// Form Validation & Handling (Add Expense)
// ==========================================================================
let hasAttemptedAddSubmit = false;
let hasAttemptedEditSubmit = false;

/**
 * Validate a description input field
 * @param {HTMLInputElement} input
 * @param {HTMLElement} errorEl
 * @returns {boolean}
 */
function validateDescription(input, errorEl) {
  const container = input.parentElement;
  const val = input.value.trim();

  if (!val) {
    errorEl.textContent = 'Please enter a description for this expense.';
    container.classList.add('input-error');
    return false;
  }

  errorEl.textContent = '';
  container.classList.remove('input-error');
  return true;
}

/**
 * Validate an amount input field
 * @param {HTMLInputElement} input
 * @param {HTMLElement} errorEl
 * @returns {boolean}
 */
function validateAmount(input, errorEl) {
  const container = input.parentElement;
  const rawVal = input.value.trim();

  if (rawVal === '') {
    if (input.validity && input.validity.badInput) {
      errorEl.textContent = 'Please enter a valid numeric amount.';
      container.classList.add('input-error');
      return false;
    }
    errorEl.textContent = 'Please enter an amount.';
    container.classList.add('input-error');
    return false;
  }

  const num = parseFloat(rawVal);
  if (isNaN(num)) {
    errorEl.textContent = 'Please enter a valid amount.';
    container.classList.add('input-error');
    return false;
  }

  if (num <= 0) {
    errorEl.textContent = 'Amount must be greater than ₦0.00.';
    container.classList.add('input-error');
    return false;
  }

  errorEl.textContent = '';
  container.classList.remove('input-error');
  return true;
}

/**
 * Validate a date input field
 * @param {HTMLInputElement} input
 * @param {HTMLElement} errorEl
 * @returns {boolean}
 */
function validateDate(input, errorEl) {
  const container = input.parentElement;
  const val = input.value.trim();

  if (!val) {
    errorEl.textContent = 'Please select a date.';
    container.classList.add('input-error');
    return false;
  }

  const dateObj = new Date(val);
  if (isNaN(dateObj.getTime())) {
    errorEl.textContent = 'Please select a valid date.';
    container.classList.add('input-error');
    return false;
  }

  errorEl.textContent = '';
  container.classList.remove('input-error');
  return true;
}

// Real-time inline validation listeners for Add Expense Form
expenseDescription.addEventListener('input', () => {
  if (hasAttemptedAddSubmit || expenseDescription.parentElement.classList.contains('input-error')) {
    validateDescription(expenseDescription, descError);
  }
});

expenseAmount.addEventListener('input', () => {
  if (hasAttemptedAddSubmit || expenseAmount.parentElement.classList.contains('input-error')) {
    validateAmount(expenseAmount, amountError);
  }
});

expenseDate.addEventListener('input', () => {
  if (hasAttemptedAddSubmit || expenseDate.parentElement.classList.contains('input-error')) {
    validateDate(expenseDate, dateError);
  }
});

expenseDate.addEventListener('change', () => {
  if (hasAttemptedAddSubmit || expenseDate.parentElement.classList.contains('input-error')) {
    validateDate(expenseDate, dateError);
  }
});

expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  hasAttemptedAddSubmit = true;

  const isDescValid = validateDescription(expenseDescription, descError);
  const isAmountValid = validateAmount(expenseAmount, amountError);
  const isDateValid = validateDate(expenseDate, dateError);

  if (!isDescValid || !isAmountValid || !isDateValid) {
    return;
  }

  const newExpense = {
    id: 'exp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    description: expenseDescription.value.trim(),
    amount: parseFloat(parseFloat(expenseAmount.value).toFixed(2)),
    date: expenseDate.value,
    createdAt: Date.now()
  };

  expenses.unshift(newExpense);
  saveExpensesToStorage(expenses);

  // Reset inputs & validation state
  hasAttemptedAddSubmit = false;
  expenseDescription.value = '';
  expenseAmount.value = '';
  expenseDate.value = getTodayDateString();
  expenseDescription.parentElement.classList.remove('input-error');
  expenseAmount.parentElement.classList.remove('input-error');
  expenseDate.parentElement.classList.remove('input-error');
  descError.textContent = '';
  amountError.textContent = '';
  dateError.textContent = '';
  expenseDescription.blur();

  renderUI(newExpense.id);
  showToast(`Added: ${newExpense.description} (${formatNaira(newExpense.amount)})`, 'success');
});

// Reset button also restores today's date and clears validation
expenseForm.addEventListener('reset', () => {
  hasAttemptedAddSubmit = false;
  setTimeout(() => {
    expenseDate.value = getTodayDateString();
    descError.textContent = '';
    amountError.textContent = '';
    dateError.textContent = '';
    expenseDescription.parentElement.classList.remove('input-error');
    expenseAmount.parentElement.classList.remove('input-error');
    expenseDate.parentElement.classList.remove('input-error');
  }, 0);
});

// ==========================================================================
// Edit Expense Modal Logic
// ==========================================================================
function openEditModal(expenseId) {
  const expense = expenses.find(item => item.id === expenseId);
  if (!expense) return;

  hasAttemptedEditSubmit = false;
  editExpenseId.value = expense.id;
  editExpenseDescription.value = expense.description;
  editExpenseAmount.value = expense.amount;
  editExpenseDate.value = expense.date;

  // Clear errors
  editDescError.textContent = '';
  editAmountError.textContent = '';
  editDateError.textContent = '';
  editExpenseDescription.parentElement.classList.remove('input-error');
  editExpenseAmount.parentElement.classList.remove('input-error');
  editExpenseDate.parentElement.classList.remove('input-error');

  editModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  hasAttemptedEditSubmit = false;
  editDescError.textContent = '';
  editAmountError.textContent = '';
  editDateError.textContent = '';
  editExpenseDescription.parentElement.classList.remove('input-error');
  editExpenseAmount.parentElement.classList.remove('input-error');
  editExpenseDate.parentElement.classList.remove('input-error');
  editModal.classList.add('hidden');
  document.body.style.overflow = '';
}

// Real-time inline validation listeners for Edit Expense Form
editExpenseDescription.addEventListener('input', () => {
  if (hasAttemptedEditSubmit || editExpenseDescription.parentElement.classList.contains('input-error')) {
    validateDescription(editExpenseDescription, editDescError);
  }
});

editExpenseAmount.addEventListener('input', () => {
  if (hasAttemptedEditSubmit || editExpenseAmount.parentElement.classList.contains('input-error')) {
    validateAmount(editExpenseAmount, editAmountError);
  }
});

editExpenseDate.addEventListener('input', () => {
  if (hasAttemptedEditSubmit || editExpenseDate.parentElement.classList.contains('input-error')) {
    validateDate(editExpenseDate, editDateError);
  }
});

editExpenseDate.addEventListener('change', () => {
  if (hasAttemptedEditSubmit || editExpenseDate.parentElement.classList.contains('input-error')) {
    validateDate(editExpenseDate, editDateError);
  }
});

editExpenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  hasAttemptedEditSubmit = true;

  const isDescValid = validateDescription(editExpenseDescription, editDescError);
  const isAmountValid = validateAmount(editExpenseAmount, editAmountError);
  const isDateValid = validateDate(editExpenseDate, editDateError);

  if (!isDescValid || !isAmountValid || !isDateValid) {
    return;
  }

  const id = editExpenseId.value;
  const targetIndex = expenses.findIndex(item => item.id === id);

  if (targetIndex === -1) {
    showToast('Expense record not found', 'danger');
    closeEditModal();
    return;
  }

  expenses[targetIndex] = {
    ...expenses[targetIndex],
    description: editExpenseDescription.value.trim(),
    amount: parseFloat(parseFloat(editExpenseAmount.value).toFixed(2)),
    date: editExpenseDate.value
  };

  saveExpensesToStorage(expenses);
  closeEditModal();
  renderUI(id);
  showToast('Expense updated successfully', 'success');
});

closeEditModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);

// ==========================================================================
// Delete Expense Confirmation Modal Logic
// ==========================================================================
function openDeleteModal(expenseId) {
  const expense = expenses.find(item => item.id === expenseId);
  if (!expense) return;

  pendingDeleteId = expense.id;
  deleteItemDesc.textContent = expense.description;
  deleteItemAmount.textContent = formatNaira(expense.amount);
  deleteItemDate.textContent = formatDateDisplay(expense.date);

  deleteModal.classList.remove('hidden');
  confirmDeleteBtn.focus();
  document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
  deleteModal.classList.add('hidden');
  pendingDeleteId = null;
  document.body.style.overflow = '';
}

function handleConfirmDelete() {
  if (!pendingDeleteId) return;

  const targetIndex = expenses.findIndex(item => item.id === pendingDeleteId);
  if (targetIndex !== -1) {
    const deletedDesc = expenses[targetIndex].description;
    expenses.splice(targetIndex, 1);
    saveExpensesToStorage(expenses);
    renderUI();
    showToast(`Deleted "${deletedDesc}"`, 'danger');
  }

  closeDeleteModal();
}

closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
cancelDeleteBtn.addEventListener('click', closeDeleteModal);
confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

// Close modals when clicking backdrop
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

// Global Escape Key Listener for Modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!editModal.classList.contains('hidden')) {
      closeEditModal();
    }
    if (!deleteModal.classList.contains('hidden')) {
      closeDeleteModal();
    }
  }
});

// ==========================================================================
// Delegated Click Handling on Expense Items (Edit & Delete)
// ==========================================================================
expenseList.addEventListener('click', (e) => {
  const editBtn = e.target.closest('.edit-btn');
  const deleteBtn = e.target.closest('.delete-btn');

  if (editBtn) {
    const id = editBtn.dataset.id;
    openEditModal(id);
    return;
  }

  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    openDeleteModal(id);
    return;
  }
});

// ==========================================================================
// Search & Filter Listeners
// ==========================================================================
searchInput.addEventListener('input', (e) => {
  activeSearchQuery = e.target.value;
  renderExpenseList();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  activeSearchQuery = '';
  searchInput.focus();
  renderExpenseList();
});

resetSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  activeSearchQuery = '';
  searchInput.focus();
  renderExpenseList();
});

// Theme button listener
themeToggleBtn.addEventListener('click', handleThemeToggle);

// ==========================================================================
// Initialization
// ==========================================================================
function initApp() {
  // Set default date input value to today
  expenseDate.value = getTodayDateString();

  // Initialize theme based on automatic detection
  const initialTheme = getEffectiveTheme();
  applyTheme(initialTheme);

  // Load expenses and render
  expenses = loadExpensesFromStorage();
  renderUI();
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

