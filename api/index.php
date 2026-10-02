<?php
/**
 * Daily Habit Tracker - RESTful API Router & Controller
 * Supports:
 *   GET    /api/habits          - Fetch all habits
 *   POST   /api/habits          - Create new habit OR update completion/details
 *   DELETE /api/habits/{id}     - Delete habit
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load database connection
require_once __DIR__ . '/../db.php';

// Determine HTTP method (support method override via header or POST body)
$method = $_SERVER['REQUEST_METHOD'];
$rawInput = file_get_contents('php://input');
$inputData = [];
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $inputData = $decoded;
    }
}
// Merge with $_POST for standard form submissions
if (!empty($_POST)) {
    $inputData = array_merge($inputData, $_POST);
}

// Support _method override
if (isset($inputData['_method'])) {
    $method = strtoupper($inputData['_method']);
} elseif (isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
    $method = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
}

// Parse request URI to extract ID if present
// e.g. /MalikMobile/api/habits/3 or /api/habits/3 or query parameter ?id=3
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathSegments = explode('/', trim($requestUri, '/'));

$habitId = null;
$isToggleRoute = false;
$lastSegment = end($pathSegments);

if ($lastSegment === 'toggle') {
    $isToggleRoute = true;
    $prevSegment = prev($pathSegments);
    if (is_numeric($prevSegment)) {
        $habitId = (int)$prevSegment;
    }
} elseif (is_numeric($lastSegment)) {
    $habitId = (int)$lastSegment;
}

if (isset($_GET['id']) && is_numeric($_GET['id'])) {
    $habitId = (int)$_GET['id'];
} elseif (isset($inputData['id']) && is_numeric($inputData['id'])) {
    $habitId = (int)$inputData['id'];
}

if ($isToggleRoute || (isset($_GET['action']) && $_GET['action'] === 'toggle')) {
    $inputData['action'] = 'toggle';
    if ($habitId) {
        $inputData['id'] = $habitId;
    }
}

// Controller logic based on HTTP method
try {
    switch ($method) {
        case 'GET':
            handleGetHabits($pdo, $habitId);
            break;

        case 'POST':
            handlePostHabits($pdo, $inputData);
            break;

        case 'DELETE':
            handleDeleteHabit($pdo, $habitId, $inputData);
            break;

        case 'PUT':
        case 'PATCH':
            handlePutHabit($pdo, $habitId, $inputData);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method Not Allowed']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * GET /api/habits or GET /api/habits/{id}
 */
function handleGetHabits($pdo, $habitId = null) {
    if ($habitId !== null && $habitId > 0) {
        $stmt = $pdo->prepare("SELECT * FROM habits WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $habitId]);
        $habit = $stmt->fetch();
        if (!$habit) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Habit not found']);
            return;
        }
        $habit['id'] = (int)$habit['id'];
        $habit['is_completed_today'] = (int)$habit['is_completed_today'];
        $habit['streak_count'] = (int)$habit['streak_count'];
        echo json_encode(['success' => true, 'data' => $habit]);
        return;
    }

    $stmt = $pdo->query("SELECT * FROM habits ORDER BY id ASC");
    $habits = $stmt->fetchAll();
    
    // Cast integers properly for clean JSON
    foreach ($habits as &$h) {
        $h['id'] = (int)$h['id'];
        $h['is_completed_today'] = (int)$h['is_completed_today'];
        $h['streak_count'] = (int)$h['streak_count'];
    }

    echo json_encode($habits);
}

/**
 * POST /api/habits
 * Handles:
 * 1. Action: toggle completion status or update habit
 * 2. Creating a new habit
 * 3. Action: delete (fallback)
 */
function handlePostHabits($pdo, $data) {
    // Check if client dispatched a delete action via POST
    if (isset($data['action']) && $data['action'] === 'delete') {
        $id = isset($data['id']) ? (int)$data['id'] : 0;
        handleDeleteHabit($pdo, $id, $data);
        return;
    }

    // Check if updating an existing habit
    if (isset($data['id']) && is_numeric($data['id']) && (int)$data['id'] > 0) {
        $id = (int)$data['id'];

        // Check if habit exists
        $stmt = $pdo->prepare("SELECT * FROM habits WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Habit not found']);
            return;
        }

        // Toggle completion status
        if (isset($data['action']) && $data['action'] === 'toggle') {
            $newStatus = $existing['is_completed_today'] ? 0 : 1;
            $newStreak = (int)$existing['streak_count'];
            if ($newStatus === 1) {
                $newStreak += 1;
            } else {
                $newStreak = max(0, $newStreak - 1);
            }

            $updateStmt = $pdo->prepare("
                UPDATE habits 
                SET is_completed_today = :status, streak_count = :streak, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");
            $updateStmt->execute([
                'status' => $newStatus,
                'streak' => $newStreak,
                'id' => $id
            ]);

            // Fetch updated
            $stmt->execute(['id' => $id]);
            $updated = $stmt->fetch();
            $updated['id'] = (int)$updated['id'];
            $updated['is_completed_today'] = (int)$updated['is_completed_today'];
            $updated['streak_count'] = (int)$updated['streak_count'];

            echo json_encode([
                'success' => true,
                'message' => 'Habit completion status updated',
                'habit' => $updated
            ]);
            return;
        }

        // Explicit is_completed_today update
        if (isset($data['is_completed_today'])) {
            $newStatus = (int)$data['is_completed_today'] ? 1 : 0;
            $newStreak = (int)$existing['streak_count'];
            
            // Adjust streak if status changed
            if ($newStatus !== (int)$existing['is_completed_today']) {
                if ($newStatus === 1) {
                    $newStreak += 1;
                } else {
                    $newStreak = max(0, $newStreak - 1);
                }
            }

            // Allow streak override if passed explicitly
            if (isset($data['streak_count']) && is_numeric($data['streak_count'])) {
                $newStreak = max(0, (int)$data['streak_count']);
            }

            $updateStmt = $pdo->prepare("
                UPDATE habits 
                SET is_completed_today = :status, streak_count = :streak, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");
            $updateStmt->execute([
                'status' => $newStatus,
                'streak' => $newStreak,
                'id' => $id
            ]);

            $stmt->execute(['id' => $id]);
            $updated = $stmt->fetch();
            $updated['id'] = (int)$updated['id'];
            $updated['is_completed_today'] = (int)$updated['is_completed_today'];
            $updated['streak_count'] = (int)$updated['streak_count'];

            echo json_encode([
                'success' => true,
                'message' => 'Habit status updated',
                'habit' => $updated
            ]);
            return;
        }

        // Full or partial habit edit (title, frequency, icon_type)
        $title = isset($data['title']) ? trim($data['title']) : $existing['title'];
        $frequency = isset($data['frequency']) ? trim($data['frequency']) : $existing['frequency'];
        $iconType = isset($data['icon_type']) ? trim($data['icon_type']) : $existing['icon_type'];
        $streak = isset($data['streak_count']) ? (int)$data['streak_count'] : (int)$existing['streak_count'];

        $updateStmt = $pdo->prepare("
            UPDATE habits 
            SET title = :title, frequency = :frequency, icon_type = :icon_type, streak_count = :streak, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ");
        $updateStmt->execute([
            'title' => $title,
            'frequency' => $frequency,
            'icon_type' => $iconType,
            'streak' => $streak,
            'id' => $id
        ]);

        $stmt->execute(['id' => $id]);
        $updated = $stmt->fetch();
        $updated['id'] = (int)$updated['id'];
        $updated['is_completed_today'] = (int)$updated['is_completed_today'];
        $updated['streak_count'] = (int)$updated['streak_count'];

        echo json_encode([
            'success' => true,
            'message' => 'Habit updated successfully',
            'habit' => $updated
        ]);
        return;
    }

    // Creating a brand new habit
    if (empty($data['title'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Habit title is required']);
        return;
    }

    $title = trim($data['title']);
    $frequency = !empty($data['frequency']) ? trim($data['frequency']) : 'Daily';
    $iconType = !empty($data['icon_type']) ? trim($data['icon_type']) : 'water';
    $isCompleted = !empty($data['is_completed_today']) ? 1 : 0;
    $streakCount = !empty($data['streak_count']) ? (int)$data['streak_count'] : 0;

    $insertStmt = $pdo->prepare("
        INSERT INTO habits (title, is_completed_today, streak_count, frequency, icon_type)
        VALUES (:title, :is_completed, :streak, :frequency, :icon_type)
    ");
    $insertStmt->execute([
        'title' => $title,
        'is_completed' => $isCompleted,
        'streak' => $streakCount,
        'frequency' => $frequency,
        'icon_type' => $iconType
    ]);

    $newId = (int)$pdo->lastInsertId();

    $stmt = $pdo->prepare("SELECT * FROM habits WHERE id = :id LIMIT 1");
    $stmt->execute(['id' => $newId]);
    $newHabit = $stmt->fetch();
    $newHabit['id'] = (int)$newHabit['id'];
    $newHabit['is_completed_today'] = (int)$newHabit['is_completed_today'];
    $newHabit['streak_count'] = (int)$newHabit['streak_count'];

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Habit created successfully',
        'habit' => $newHabit
    ]);
}

/**
 * DELETE /api/habits/{id}
 */
function handleDeleteHabit($pdo, $habitId = null, $data = []) {
    if (!$habitId && isset($data['id'])) {
        $habitId = (int)$data['id'];
    }

    if (!$habitId || $habitId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Valid Habit ID is required for deletion']);
        return;
    }

    // Check if exists
    $stmt = $pdo->prepare("SELECT id FROM habits WHERE id = :id LIMIT 1");
    $stmt->execute(['id' => $habitId]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Habit not found']);
        return;
    }

    $deleteStmt = $pdo->prepare("DELETE FROM habits WHERE id = :id");
    $deleteStmt->execute(['id' => $habitId]);

    echo json_encode([
        'success' => true,
        'message' => 'Habit deleted successfully',
        'id' => $habitId
    ]);
}

/**
 * PUT /api/habits/{id}
 */
function handlePutHabit($pdo, $habitId, $data) {
    if ($habitId) {
        $data['id'] = $habitId;
    }
    handlePostHabits($pdo, $data);
}
