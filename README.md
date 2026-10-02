# 📱 Daily Habit Tracker - Mobile App

A clean, modern Daily Habit Tracker standalone web application and REST API built with pure PHP, MySQL (MariaDB), and Vanilla JavaScript, matching the provided UI design pixel-by-pixel.

---

## 🌟 Features

- **Pixel-by-Pixel UI Replication**: Matches the provided design mockup with the iPhone 15/16 Pro bezel frame, Dynamic Island, status bar, header title with 3D target and trophy assets, hero progress card with animated SVG circular gauge, dynamic habit cards, floating action button (FAB), and bottom navigation.
- **Full PWA (Progressive Web App) Capabilities**:
  - Installable on mobile home screens (Android, iOS Safari, iPadOS, Desktop Chrome/Edge).
  - Standalone viewport execution without browser navigation bars or URL address input.
  - Offline-first Service Worker (`sw.js`) caching core app shell, styles, icons, and static assets.
  - Web App Manifest (`manifest.json`) with custom 192x192, 512x512, and maskable icons.
- **Dynamic Real-Time Interactivity & Fetch API**:
  - **Checkbox Toggle**: Tapping any checkbox dispatches a `fetch()` `POST` request to update `is_completed_today` in MySQL with optimistic UI updates and auto-incrementing streaks.
  - **Instant Append**: Adding a habit via the bottom sheet submits data via `POST` and **instantly appends** the new habit card to the UI DOM without reloading the page.
  - **Live Progress Gauges**: Recomputes "X/Y Done" and animates the circular SVG percentage ring dynamically.
  - **Confetti Celebration**: Bursts colorful confetti when reaching 100% completion today!
- **Dual Viewport Switcher**:
  - **Device Frame**: Shows the iPhone mockup with the top hero presentation header.
  - **Mobile Screen Only**: Expands the app edge-to-edge for native mobile browser viewports.
- **Resilient Backend & Database**:
  - Automatically initializes MySQL database `habit_tracker` and `habits` table.
  - Seeds initial habits matching the mockup if table is empty.
  - Fallback to SQLite if MySQL service is not available.

---

## 🗄️ Database Schema

The database table `habits` includes the following structure:

```sql
CREATE TABLE `habits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `is_completed_today` TINYINT(1) NOT NULL DEFAULT 0,
  `streak_count` INT NOT NULL DEFAULT 0,
  `frequency` VARCHAR(50) NOT NULL DEFAULT 'Daily',
  `icon_type` VARCHAR(50) NOT NULL DEFAULT 'water',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🚀 API Endpoints (Laravel & XAMPP REST Standard)

Base URL: `http://localhost/MalikMobile/` (or your Laravel `http://127.0.0.1:8000/api`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/habits` | Fetches all habits as JSON (`HabitController::index`) |
| `POST` | `/api/habits` | Creates a new habit (`HabitController::store`) |
| `PATCH` | `/api/habits/{id}/toggle` | Toggles completion & increments/decrements streak (`HabitController::toggle`) |
| `PUT` | `/api/habits/{id}` | Updates habit title/frequency/icon (`HabitController::update`) |
| `DELETE` | `/api/habits/{id}` | Deletes a habit by ID (`HabitController::destroy`) |

---

## 🦄 Laravel Implementation (Ready to Use)

For Laravel projects, the complete source files are provided in the `laravel/` folder:
- **Model**: [`laravel/app/Models/Habit.php`](file:///c:/xampp/htdocs/MalikMobile/laravel/app/Models/Habit.php)
- **Controller**: [`laravel/app/Http/Controllers/Api/HabitController.php`](file:///c:/xampp/htdocs/MalikMobile/laravel/app/Http/Controllers/Api/HabitController.php)
- **Migration**: [`laravel/database/migrations/2026_10_02_000000_create_habits_table.php`](file:///c:/xampp/htdocs/MalikMobile/laravel/database/migrations/2026_10_02_000000_create_habits_table.php)
- **Seeder**: [`laravel/database/seeders/HabitSeeder.php`](file:///c:/xampp/htdocs/MalikMobile/laravel/database/seeders/HabitSeeder.php)
- **Routes**: [`laravel/routes/api.php`](file:///c:/xampp/htdocs/MalikMobile/laravel/routes/api.php)

---

## 📂 Project Directory Structure

```text
c:\xampp\htdocs\MalikMobile\
├── api/
│   ├── .htaccess            # API URL rewriting rules
│   ├── habits.php           # Direct endpoint alias
│   └── index.php            # RESTful API Router & Controller
├── assets/
│   ├── target.jpg           # 3D Dartboard Target Graphic
│   └── trophy.jpg           # 3D Trophy Graphic
├── css/
│   └── app.css              # Custom styling & animations
├── js/
│   └── app.js               # Vanilla JavaScript API client & DOM manipulation
├── .htaccess                # Root Apache URL rewrite rules
├── db.php                   # Database connection & auto-migration
├── index.html               # Frontend presentation & mobile mockup markup
├── index.php                # Entrypoint serving application
└── schema.sql               # MySQL DDL & seed data script
```

---

## 🌐 How to Run

1. Ensure **Apache** and **MySQL** are running in the XAMPP Control Panel.
2. Open your web browser and navigate to:
   ```text
   http://localhost/MalikMobile/
   ```
3. Test from your phone by visiting `http://<your-local-ip>/MalikMobile/`.
