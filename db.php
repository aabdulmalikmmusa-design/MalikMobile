<?php
/**
 * Database connection & table initialization
 * Daily Habit Tracker
 */

header('Content-Type: application/json; charset=utf-8');

$host = '127.0.0.1';
$port = '3306';
$db_user = 'root';
$db_pass = '';
$db_name = 'habit_tracker';

$pdo = null;

try {
    // 1. Try connecting to MySQL without database to ensure DB exists
    $init_pdo = new PDO("mysql:host={$host};port={$port};charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Create database if not exists
    $init_pdo->exec("CREATE DATABASE IF NOT EXISTS `{$db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    
    // Connect to the specific database
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Create habits table
    $tableSql = "
    CREATE TABLE IF NOT EXISTS `habits` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `title` VARCHAR(255) NOT NULL,
        `is_completed_today` TINYINT(1) NOT NULL DEFAULT 0,
        `streak_count` INT NOT NULL DEFAULT 0,
        `frequency` VARCHAR(50) NOT NULL DEFAULT 'Daily',
        `icon_type` VARCHAR(50) NOT NULL DEFAULT 'water',
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($tableSql);

} catch (PDOException $e) {
    // Fallback to SQLite if MySQL is unavailable
    try {
        $sqlite_file = __DIR__ . '/habits.sqlite';
        $pdo = new PDO("sqlite:" . $sqlite_file);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        $tableSql = "
        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            is_completed_today INTEGER NOT NULL DEFAULT 0,
            streak_count INTEGER NOT NULL DEFAULT 0,
            frequency TEXT NOT NULL DEFAULT 'Daily',
            icon_type TEXT NOT NULL DEFAULT 'water',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        ";
        $pdo->exec($tableSql);
    } catch (Exception $sqliteErr) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $sqliteErr->getMessage()]);
        exit;
    }
}

// Seed initial habits from UI design if table is empty
$countStmt = $pdo->query("SELECT COUNT(*) as cnt FROM habits");
$rowCount = (int)$countStmt->fetchColumn();

if ($rowCount === 0) {
    $seedHabits = [
        [
            'title' => 'Drink 8 Glasses Water',
            'is_completed_today' => 0,
            'streak_count' => 3,
            'frequency' => 'Daily',
            'icon_type' => 'water'
        ],
        [
            'title' => 'Read 20 Minutes',
            'is_completed_today' => 0,
            'streak_count' => 5,
            'frequency' => 'Daily',
            'icon_type' => 'book'
        ],
        [
            'title' => 'No Social Media before 9AM',
            'is_completed_today' => 0,
            'streak_count' => 2,
            'frequency' => 'Weekdays',
            'icon_type' => 'nosocial'
        ],
        [
            'title' => 'Journal Writing',
            'is_completed_today' => 0,
            'streak_count' => 7,
            'frequency' => 'Daily',
            'icon_type' => 'journal'
        ],
        [
            'title' => 'Workout',
            'is_completed_today' => 0,
            'streak_count' => 4,
            'frequency' => 'Weekdays',
            'icon_type' => 'workout'
        ],
    ];

    $insertStmt = $pdo->prepare("
        INSERT INTO habits (title, is_completed_today, streak_count, frequency, icon_type)
        VALUES (:title, :is_completed_today, :streak_count, :frequency, :icon_type)
    ");

    foreach ($seedHabits as $habit) {
        $insertStmt->execute($habit);
    }
}

return $pdo;
