<?php

namespace Database\Seeders;

use App\Models\Habit;
use Illuminate\Database\Seeder;

class HabitSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $habits = [
            [
                'title' => 'Drink 8 Glasses Water',
                'is_completed_today' => false,
                'streak_count' => 3,
                'frequency' => 'Daily',
                'icon_type' => 'water',
            ],
            [
                'title' => 'Read 20 Minutes',
                'is_completed_today' => false,
                'streak_count' => 5,
                'frequency' => 'Daily',
                'icon_type' => 'book',
            ],
            [
                'title' => 'No Social Media before 9AM',
                'is_completed_today' => false,
                'streak_count' => 2,
                'frequency' => 'Weekdays',
                'icon_type' => 'nosocial',
            ],
            [
                'title' => 'Journal Writing',
                'is_completed_today' => false,
                'streak_count' => 7,
                'frequency' => 'Daily',
                'icon_type' => 'journal',
            ],
            [
                'title' => 'Workout',
                'is_completed_today' => false,
                'streak_count' => 4,
                'frequency' => 'Weekdays',
                'icon_type' => 'workout',
            ],
        ];

        foreach ($habits as $habitData) {
            Habit::updateOrCreate(
                ['title' => $habitData['title']],
                $habitData
            );
        }
    }
}
