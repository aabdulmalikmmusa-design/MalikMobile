<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Habit extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'is_completed_today',
        'streak_count',
    ];

    protected $casts = [
        'is_completed_today' => 'boolean',
        'streak_count' => 'integer',
    ];

    /**
     * Toggle habit completion status and adjust streak.
     */
    public function toggleCompletion(): bool
    {
        $this->is_completed_today = !$this->is_completed_today;

        if ($this->is_completed_today) {
            $this->streak_count += 1;
        } else {
            $this->streak_count = max(0, $this->streak_count - 1);
        }

        return $this->save();
    }
}
