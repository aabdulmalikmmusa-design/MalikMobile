/**
 * Daily Habit Tracker - Vanilla JavaScript Application
 * Interacts with RESTful PHP API (/api/habits)
 * Features:
 *   - Optimistic checkbox toggle with fetch() persistence
 *   - "Add Habit" form with instant UI appending
 *   - PWA Service Worker registration & home-screen installation prompt
 *   - Real-time progress calculations & confetti celebration
 */

(function () {
  'use strict';

  // API Base Endpoint
  const API_URL = 'api/index.php';

  // App State
  let habits = [];
  let editingHabit = null;
  let activeIcon = 'water';
  let activeFreq = 'Daily';
  let deferredInstallPrompt = null;

  // DOM Elements
  const habitsListEl = document.getElementById('habits-list');
  const progressCountEl = document.getElementById('progress-count');
  const progressPercentageEl = document.getElementById('progress-percentage');
  const progressRingValEl = document.getElementById('progress-ring-val');
  const progressSubtextEl = document.getElementById('progress-subtext');

  // Modals & Forms
  const habitModal = document.getElementById('habit-modal');
  const habitForm = document.getElementById('habit-form');
  const modalTitleEl = document.getElementById('modal-title');
  const habitIdInput = document.getElementById('habit-id-input');
  const habitTitleInput = document.getElementById('habit-title-input');
  const btnDeleteHabit = document.getElementById('btn-delete-habit');
  const btnSubmitHabit = document.getElementById('btn-submit-habit');

  // Viewport switchers & Install Button
  const btnViewDevice = document.getElementById('btn-view-device');
  const btnViewMobile = document.getElementById('btn-view-mobile');
  const btnInstallApp = document.getElementById('btn-install-app');

  // Confetti Canvas
  const confettiCanvas = document.getElementById('confetti-canvas');
  let confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
  let confettiParticles = [];
  let confettiAnimationId = null;

  // SVG Icon Templates matching the design categories
  const ICONS = {
    water: `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
      </svg>`,
    book: `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>`,
    nosocial: `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
        <line x1="2" y1="2" x2="22" y2="22" stroke-width="2.2"/>
      </svg>`,
    journal: `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>`,
    workout: `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="13" cy="4" r="2"/>
        <path d="M13.9 8.5a1.5 1.5 0 0 0-1.8-.4l-3.3 1.8a1 1 0 0 0-.4 1.3l1.2 2.3-2.6 3.1a1 1 0 0 0 1.5 1.3l3.2-3.8.7-2.7 2.1 2.1v4.5a1 1 0 1 0 2 0v-5.2a1 1 0 0 0-.3-.7l-2.3-2.3.6-1.9 2.5 1.2a1 1 0 0 0 1.3-.5 1 1 0 0 0-.5-1.3l-3.3-1.6z"/>
      </svg>`,
    star: `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>`,
    meditation: `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="5" r="2"/>
        <path d="M5 20l4-5 3 2 3-2 4 5"/>
        <path d="M7 11l5 4 5-4"/>
      </svg>`
  };

  /**
   * Main Initialization
   */
  async function init() {
    setupPWA();
    detectStandaloneMode();
    setupAuthLaunch();
    setupEventListeners();
    await fetchHabits();
  }

  /**
   * Setup Service Worker & PWA Install Prompts
   */
  function setupPWA() {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registered successfully! Scope:', registration.scope);
          })
          .catch((err) => {
            console.warn('Service Worker registration failed:', err);
          });
      });
    }

    // 2. Intercept beforeinstallprompt for native Add to Home Screen
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (btnInstallApp) {
        btnInstallApp.style.display = 'inline-flex';
      }
    });

    if (btnInstallApp) {
      btnInstallApp.addEventListener('click', async () => {
        if (!deferredInstallPrompt) {
          // If iOS Safari, guide user
          const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
          if (isIos) {
            alert('To install on iOS: Tap the "Share" button at the bottom and select "Add to Home Screen" 📲');
            return;
          }
          showToast('App is ready to install from your browser menu.');
          return;
        }
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('🎉 Installing Daily Habit Tracker!');
          btnInstallApp.style.display = 'none';
        }
        deferredInstallPrompt = null;
      });
    }

    // 3. App successfully installed
    window.addEventListener('appinstalled', () => {
      showToast('🎉 Habits is installed on your device!');
      if (btnInstallApp) btnInstallApp.style.display = 'none';
    });
  }

  /**
   * Check if running as standalone full-screen web app
   */
  function detectStandaloneMode() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isSmallMobile = window.innerWidth <= 520;

    if (isStandalone || isSmallMobile) {
      document.body.classList.add('mobile-only-mode');
      if (btnViewMobile) btnViewMobile.classList.add('active');
      if (btnViewDevice) btnViewDevice.classList.remove('active');
    }
  }

  /**
   * Fetch all habits from PHP API on load
   */
  async function fetchHabits() {
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      habits = Array.isArray(data) ? data : (data.data || []);
      renderHabits();
      updateProgressCard();
    } catch (err) {
      console.error('Failed to load habits:', err);
      showToast('⚠️ Could not connect to API server.');
    }
  }

  /**
   * Render complete list of habits
   */
  function renderHabits() {
    if (!habitsListEl) return;
    habitsListEl.innerHTML = '';

    if (habits.length === 0) {
      habitsListEl.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <p>No habits yet. Tap the <strong>+</strong> button below to start tracking!</p>
        </div>
      `;
      return;
    }

    habits.forEach((habit) => {
      const card = createHabitCard(habit);
      habitsListEl.appendChild(card);
    });
  }

  function resolveIcon(habit) {
    if (habit.icon_type && ICONS[habit.icon_type]) return habit.icon_type;
    const t = (habit.title || '').toLowerCase();
    if (t.includes('water') || t.includes('drink') || t.includes('hydrate')) return 'water';
    if (t.includes('read') || t.includes('book') || t.includes('study')) return 'book';
    if (t.includes('social') || t.includes('phone') || t.includes('media') || t.includes('screen')) return 'nosocial';
    if (t.includes('journal') || t.includes('write') || t.includes('diary')) return 'journal';
    if (t.includes('workout') || t.includes('gym') || t.includes('run') || t.includes('exercise')) return 'workout';
    if (t.includes('meditat') || t.includes('breath') || t.includes('yoga')) return 'meditation';
    return 'star';
  }

  function resolveFrequency(habit) {
    if (habit.frequency) return habit.frequency;
    const t = (habit.title || '').toLowerCase();
    if (t.includes('weekday') || t.includes('social') || t.includes('workout')) return 'Weekdays';
    return 'Daily';
  }

  /**
   * Create Habit Card Element
   */
  function createHabitCard(habit) {
    const card = document.createElement('div');
    const isCompleted = Number(habit.is_completed_today) === 1;
    card.className = `habit-card ${isCompleted ? 'completed' : ''}`;
    card.dataset.id = habit.id;

    const iconType = resolveIcon(habit);
    const iconSvg = ICONS[iconType] || ICONS.water;
    const frequency = resolveFrequency(habit);

    card.innerHTML = `
      <div class="habit-left">
        <div class="habit-icon-badge icon-${iconType}">
          ${iconSvg}
        </div>
        <div class="habit-text">
          <span class="habit-title">${escapeHtml(habit.title)}</span>
          <div class="habit-meta">
            <span class="repeat-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="17 1 21 5 17 9"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            </span>
            <span>${escapeHtml(frequency)}</span>
            ${habit.streak_count > 0 ? `<span class="streak-tag">🔥 ${habit.streak_count}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="habit-right">
        <button class="btn-edit-habit" title="Edit habit" data-id="${habit.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>
        <button class="habit-checkbox ${isCompleted ? 'checked' : ''}" data-id="${habit.id}" title="Toggle completion">
          <svg class="check-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    `;

    // 1. Checkbox click -> triggers fetch() request to update is_completed_today in backend
    const checkbox = card.querySelector('.habit-checkbox');
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      handleToggleCheckbox(habit.id, card);
    });

    // 2. Edit button click
    const editBtn = card.querySelector('.btn-edit-habit');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(habit);
    });

    return card;
  }

  /**
   * When a user taps a checkbox:
   * Triggers fetch() request to update is_completed_today in PHP backend database
   */
  async function handleToggleCheckbox(id, cardEl) {
    const habit = habits.find((h) => Number(h.id) === Number(id));
    if (!habit) return;

    const previousStatus = Number(habit.is_completed_today);
    const newStatus = previousStatus === 1 ? 0 : 1;
    const previousStreak = Number(habit.streak_count) || 0;
    const newStreak = newStatus === 1 ? previousStreak + 1 : Math.max(0, previousStreak - 1);

    // --- 1. Optimistic UI update ---
    habit.is_completed_today = newStatus;
    habit.streak_count = newStreak;

    // Update Card in DOM
    const checkbox = cardEl.querySelector('.habit-checkbox');
    if (newStatus === 1) {
      cardEl.classList.add('completed');
      checkbox.classList.add('checked');
    } else {
      cardEl.classList.remove('completed');
      checkbox.classList.remove('checked');
    }

    // Update streak tag in DOM if present
    const metaEl = cardEl.querySelector('.habit-meta');
    let streakTag = metaEl.querySelector('.streak-tag');
    if (newStreak > 0) {
      if (!streakTag) {
        streakTag = document.createElement('span');
        streakTag.className = 'streak-tag';
        metaEl.appendChild(streakTag);
      }
      streakTag.textContent = `🔥 ${newStreak}`;
    } else if (streakTag) {
      streakTag.remove();
    }

    // Update Hero Card & Progress Ring
    updateProgressCard();

    // Trigger celebration if all habits done
    if (newStatus === 1) {
      showToast('🎯 Habit checked! Keep it up!');
      checkAllCompleted();
    }

    // --- 2. Send fetch() PATCH request to PHP / Laravel backend database ---
    try {
      const response = await fetch(`api/habits/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          is_completed_today: newStatus,
          streak_count: newStreak
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const result = await response.json();
      const updated = result.habit || result;
      if (updated && updated.id) {
        habit.is_completed_today = Number(updated.is_completed_today);
        habit.streak_count = Number(updated.streak_count);
      }
    } catch (err) {
      console.error('Failed to update habit status:', err);
      // Revert optimistic update
      habit.is_completed_today = previousStatus;
      habit.streak_count = previousStreak;
      if (previousStatus === 1) {
        cardEl.classList.add('completed');
        checkbox.classList.add('checked');
      } else {
        cardEl.classList.remove('completed');
        checkbox.classList.remove('checked');
      }
      updateProgressCard();
      showToast('⚠️ Could not sync with database. Reverting.');
    }
  }

  /**
   * "Add Habit" form submission:
   * Submits data via POST to PHP server and appends the new habit to UI INSTANTLY
   */
  async function handleSaveHabit(e) {
    e.preventDefault();
    const title = habitTitleInput.value.trim();
    if (!title) {
      showToast('⚠️ Please enter a habit title.');
      return;
    }

    btnSubmitHabit.disabled = true;
    btnSubmitHabit.textContent = editingHabit ? 'Saving...' : 'Adding...';

    const isEdit = Boolean(editingHabit);
    const payload = {
      title: title,
      frequency: activeFreq,
      icon_type: activeIcon
    };

    if (isEdit) {
      payload.id = editingHabit.id;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Save failed');
      const result = await response.json();

      closeModal();

      if (isEdit) {
        // Edit existing habit
        editingHabit.title = title;
        editingHabit.frequency = activeFreq;
        editingHabit.icon_type = activeIcon;
        renderHabits();
        updateProgressCard();
        showToast('✨ Habit updated successfully!');
      } else {
        // --- Append new habit to UI INSTANTLY ---
        const newHabit = (result && result.habit) ? result.habit : (result && result.id ? result : {
          id: Date.now(),
          title: title,
          frequency: activeFreq,
          icon_type: activeIcon,
          is_completed_today: 0,
          streak_count: 0
        });

        // Add to local state
        habits.push(newHabit);

        // Remove empty state if present
        const emptyState = habitsListEl.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        // Create card DOM element and append instantly
        const newCard = createHabitCard(newHabit);
        newCard.style.animation = 'slideInCard 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)';
        habitsListEl.appendChild(newCard);

        // Update progress card
        updateProgressCard();

        showToast('🎉 New habit added to your tracker!');

        // Scroll new card smoothly into view
        newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch (err) {
      console.error(err);
      showToast('⚠️ Error communicating with server.');
    } finally {
      btnSubmitHabit.disabled = false;
      btnSubmitHabit.textContent = isEdit ? 'Save Changes' : 'Add Habit';
    }
  }

  /**
   * Delete Habit via DELETE /api/habits/{id}
   */
  async function handleDeleteHabit() {
    if (!editingHabit) return;
    const confirmDelete = confirm(`Are you sure you want to delete "${editingHabit.title}"?`);
    if (!confirmDelete) return;

    btnDeleteHabit.disabled = true;
    btnDeleteHabit.textContent = 'Deleting...';

    const targetId = editingHabit.id;

    try {
      const response = await fetch(`api/habits/${targetId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId })
      });

      if (!response.ok) throw new Error('Delete failed');

      // Remove from state
      habits = habits.filter((h) => Number(h.id) !== Number(targetId));

      // Remove from DOM immediately
      const cardEl = habitsListEl.querySelector(`.habit-card[data-id="${targetId}"]`);
      if (cardEl) {
        cardEl.style.transition = 'all 0.3s ease';
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'scale(0.9)';
        setTimeout(() => {
          cardEl.remove();
          if (habits.length === 0) renderHabits();
        }, 300);
      }

      closeModal();
      updateProgressCard();
      showToast('🗑️ Habit deleted.');
    } catch (err) {
      console.error(err);
      showToast('⚠️ Error deleting habit.');
    } finally {
      btnDeleteHabit.disabled = false;
      btnDeleteHabit.textContent = 'Delete';
    }
  }

  /**
   * Update Progress Card & Circular Ring
   */
  function updateProgressCard() {
    const total = habits.length;
    const completed = habits.filter((h) => Number(h.is_completed_today) === 1).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Update text
    progressCountEl.textContent = `${completed}/${total} Done`;
    progressPercentageEl.textContent = `${percentage}%`;

    // Dynamic encouraging message
    if (percentage === 100 && total > 0) {
      progressSubtextEl.textContent = "Awesome job! You're 100% done! 🎉";
    } else if (percentage >= 50) {
      progressSubtextEl.textContent = "More than halfway there! Great job!";
    } else {
      progressSubtextEl.textContent = "Keep going, you're doing great!";
    }

    // Update SVG Circle Ring (Radius = 34, circumference = 2 * π * 34 ≈ 213.628)
    const circumference = 213.628;
    const offset = circumference - (percentage / 100) * circumference;
    progressRingValEl.style.strokeDashoffset = offset;

    // Glowing color change when complete
    if (percentage === 100 && total > 0) {
      progressRingValEl.style.stroke = '#10B981';
    } else {
      progressRingValEl.style.stroke = '#818CF8';
    }
  }

  /**
   * Check if all habits are completed and trigger confetti celebration
   */
  function checkAllCompleted() {
    const total = habits.length;
    const completed = habits.filter((h) => Number(h.is_completed_today) === 1).length;
    if (total > 0 && completed === total) {
      fireConfetti();
    }
  }

  /**
   * Open Modal to Create a New Habit
   */
  function openCreateModal() {
    editingHabit = null;
    modalTitleEl.textContent = 'Create New Habit';
    habitIdInput.value = '';
    habitTitleInput.value = '';
    activeIcon = 'water';
    activeFreq = 'Daily';
    btnDeleteHabit.style.display = 'none';
    btnSubmitHabit.textContent = 'Add Habit';

    updateModalSelectors();
    habitModal.classList.add('open');
    setTimeout(() => habitTitleInput.focus(), 250);
  }

  /**
   * Open Modal to Edit Existing Habit
   */
  function openEditModal(habit) {
    editingHabit = habit;
    modalTitleEl.textContent = 'Edit Habit';
    habitIdInput.value = habit.id;
    habitTitleInput.value = habit.title;
    activeIcon = habit.icon_type || 'water';
    activeFreq = habit.frequency || 'Daily';
    btnDeleteHabit.style.display = 'inline-block';
    btnSubmitHabit.textContent = 'Save Changes';

    updateModalSelectors();
    habitModal.classList.add('open');
    setTimeout(() => habitTitleInput.focus(), 250);
  }

  function closeModal() {
    habitModal.classList.remove('open');
  }

  function updateModalSelectors() {
    document.querySelectorAll('.icon-select-opt').forEach((opt) => {
      opt.classList.toggle('selected', opt.dataset.icon === activeIcon);
    });

    document.querySelectorAll('.freq-pill').forEach((pill) => {
      pill.classList.toggle('selected', pill.dataset.freq === activeFreq);
    });
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // FAB Add
    const fabBtn = document.getElementById('fab-add');
    if (fabBtn) fabBtn.addEventListener('click', openCreateModal);

    // Nav Item "+ New"
    const navNewBtn = document.getElementById('nav-item-new');
    if (navNewBtn) navNewBtn.addEventListener('click', openCreateModal);

    // Modal Close
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
    habitModal.addEventListener('click', (e) => {
      if (e.target === habitModal) closeModal();
    });

    // Form Submit
    if (habitForm) habitForm.addEventListener('submit', handleSaveHabit);

    // Delete Button
    if (btnDeleteHabit) btnDeleteHabit.addEventListener('click', handleDeleteHabit);

    // Icon Selector in Modal
    document.querySelectorAll('.icon-select-opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        activeIcon = opt.dataset.icon;
        updateModalSelectors();
      });
    });

    // Frequency Selector in Modal
    document.querySelectorAll('.freq-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        activeFreq = pill.dataset.freq;
        updateModalSelectors();
      });
    });

    // Viewport Mode Switcher
    if (btnViewDevice && btnViewMobile) {
      btnViewDevice.addEventListener('click', () => {
        document.body.classList.remove('mobile-only-mode');
        btnViewDevice.classList.add('active');
        btnViewMobile.classList.remove('active');
      });

      btnViewMobile.addEventListener('click', () => {
        document.body.classList.add('mobile-only-mode');
        btnViewMobile.classList.add('active');
        btnViewDevice.classList.remove('active');
      });
    }

    // Hamburger button
    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) {
      btnMenu.addEventListener('click', () => {
        showToast('📱 Daily Habit Tracker v1.0.0 (PWA Ready)');
      });
    }
  }

  /**
   * Setup Auth Launch Screen (Login & Create Account)
   */
  function setupAuthLaunch() {
    const authScreen = document.getElementById('auth-launch-screen');
    const authSheet = document.getElementById('auth-sheet');
    const authSheetTitle = document.getElementById('auth-sheet-title');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const userAvatar = document.getElementById('user-avatar');

    if (!authScreen) return;

    // Check existing session
    const savedUser = localStorage.getItem('habits_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        updateUserAvatar(u.name || u.email);
        authScreen.classList.add('dismissed');
      } catch (e) {
        localStorage.removeItem('habits_user');
      }
    }

    // Open Create Account Sheet
    const btnOpenCreate = document.getElementById('btn-open-create');
    if (btnOpenCreate) {
      btnOpenCreate.addEventListener('click', () => {
        authSheetTitle.textContent = 'Create Account';
        formLogin.style.display = 'none';
        formRegister.style.display = 'block';
        authSheet.classList.add('open');
        setTimeout(() => {
          const regName = document.getElementById('register-name');
          if (regName) regName.focus();
        }, 250);
      });
    }

    // Open Login Sheet
    const btnOpenLogin = document.getElementById('btn-open-login');
    if (btnOpenLogin) {
      btnOpenLogin.addEventListener('click', () => {
        authSheetTitle.textContent = 'Log In';
        formRegister.style.display = 'none';
        formLogin.style.display = 'block';
        authSheet.classList.add('open');
        setTimeout(() => {
          const logEmail = document.getElementById('login-email');
          if (logEmail) logEmail.focus();
        }, 250);
      });
    }

    // Close Auth Sheet
    const btnCloseSheet = document.getElementById('btn-close-auth-sheet');
    if (btnCloseSheet) {
      btnCloseSheet.addEventListener('click', () => {
        authSheet.classList.remove('open');
      });
    }

    // Switch links
    const linkToRegister = document.getElementById('link-to-register');
    if (linkToRegister) {
      linkToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        authSheetTitle.textContent = 'Create Account';
        formLogin.style.display = 'none';
        formRegister.style.display = 'block';
      });
    }

    const linkToLogin = document.getElementById('link-to-login');
    if (linkToLogin) {
      linkToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        authSheetTitle.textContent = 'Log In';
        formRegister.style.display = 'none';
        formLogin.style.display = 'block';
      });
    }

    // Continue as Guest
    const btnGuest = document.getElementById('btn-auth-guest');
    if (btnGuest) {
      btnGuest.addEventListener('click', () => {
        const guestUser = { name: 'Guest User', email: 'guest@habits.app' };
        localStorage.setItem('habits_user', JSON.stringify(guestUser));
        updateUserAvatar('GU');
        authScreen.classList.add('dismissed');
        showToast('👋 Welcome! Exploring as Guest');
      });
    }

    // Login Form Submit
    if (formLogin) {
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const namePart = email.split('@')[0] || 'User';
        const user = { name: namePart.charAt(0).toUpperCase() + namePart.slice(1), email: email };
        localStorage.setItem('habits_user', JSON.stringify(user));
        updateUserAvatar(user.name);
        authSheet.classList.remove('open');
        authScreen.classList.add('dismissed');
        showToast(`👋 Welcome back, ${user.name}!`);
      });
    }

    // Register Form Submit
    if (formRegister) {
      formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const user = { name: name, email: email };
        localStorage.setItem('habits_user', JSON.stringify(user));
        updateUserAvatar(name);
        authSheet.classList.remove('open');
        authScreen.classList.add('dismissed');
        showToast(`🎉 Account created! Welcome, ${name}!`);
      });
    }

    // Avatar Click -> Profile / Logout Action
    if (userAvatar) {
      userAvatar.addEventListener('click', () => {
        const currentUser = JSON.parse(localStorage.getItem('habits_user') || '{"name":"User"}');
        const choice = confirm(`Signed in as: ${currentUser.name}\n\nWould you like to log out?`);
        if (choice) {
          localStorage.removeItem('habits_user');
          authScreen.classList.remove('dismissed');
          showToast('🔒 Logged out successfully');
        }
      });
    }
  }

  function updateUserAvatar(nameOrInitials) {
    const userAvatar = document.getElementById('user-avatar');
    if (!userAvatar || !nameOrInitials) return;
    const parts = nameOrInitials.trim().split(/\s+/);
    let initials = 'YN';
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts[0]) {
      initials = parts[0].slice(0, 2).toUpperCase();
    }
    userAvatar.textContent = initials;
  }

  /**
   * Floating Toast Notification
   */
  let toastTimeout = null;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = msg;
    toast.classList.add('show');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  /**
   * Confetti Celebration Effect
   */
  function fireConfetti() {
    if (!confettiCanvas) return;
    confettiCanvas.width = confettiCanvas.offsetWidth;
    confettiCanvas.height = confettiCanvas.offsetHeight;

    confettiParticles = [];
    const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

    for (let i = 0; i < 70; i++) {
      confettiParticles.push({
        x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 40,
        y: confettiCanvas.height / 2 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 8,
        vy: -(Math.random() * 8 + 4),
        size: Math.random() * 7 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 10,
        gravity: 0.22,
        opacity: 1
      });
    }

    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
    animateConfetti();
  }

  function animateConfetti() {
    if (!confettiCtx) return;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiParticles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.spin;
      p.opacity -= 0.009;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.globalAlpha = Math.max(0, p.opacity);
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      confettiCtx.restore();
    });

    confettiParticles = confettiParticles.filter((p) => p.opacity > 0 && p.y < confettiCanvas.height + 20);

    if (confettiParticles.length > 0) {
      confettiAnimationId = requestAnimationFrame(animateConfetti);
    } else {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
