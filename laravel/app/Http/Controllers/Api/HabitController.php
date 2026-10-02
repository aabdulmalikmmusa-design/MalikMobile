<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Habit;
use Illuminate\Http\Request;

class HabitController extends Controller
{
    public function index()
    {
        return response()->json(Habit::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $habit = Habit::create([
            'title' => $validated['title'],
            'is_completed_today' => false,
            'streak_count' => 0,
        ]);

        return response()->json($habit, 201);
    }

    public function update(Request $request, Habit $habit)
    {
        // Toggle completion status or update properties sent from the frontend
        $habit->update($request->only(['title', 'is_completed_today', 'streak_count']));

        return response()->json($habit);
    }

    public function destroy(Habit $habit)
    {
        $habit->delete();

        return response()->json(null, 204);
    }
}
