<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Validate the request's credentials and return the user without logging them in.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function validateCredentials(): User
    {
        $this->ensureIsNotRateLimited();

        /** @var User|null $user */
        $user = Auth::getProvider()->retrieveByCredentials(
            $this->only('email')
        );

        if (! $user) {
            $this->failLogin();
        }

        $hashedPassword = $user->getAuthPassword();
        $plainPassword = (string) $this->input('password');

        // 🔍 wykrycie algorytmu po prefiksie
        $driver = null;

        if (is_string($hashedPassword)) {
            if (str_starts_with($hashedPassword, '$2y$') || str_starts_with($hashedPassword, '$2a$')) {
                $driver = 'bcrypt';
            } elseif (str_starts_with($hashedPassword, '$argon2id$')) {
                $driver = 'argon2id';
            } elseif (str_starts_with($hashedPassword, '$argon2i$')) {
                $driver = 'argon2i';
            }
        }

        $valid = false;

        try {
            $valid = $driver
                ? Hash::driver($driver)->check($plainPassword, $hashedPassword)
                : Hash::check($plainPassword, $hashedPassword);
        } catch (RuntimeException) {
            $valid = false;
        }

        if (! $valid) {
            $this->failLogin();
        }

        // ♻️ rehash do aktualnego drivera (migracja w locie)
        if (Hash::needsRehash($hashedPassword)) {
            $user->forceFill([
                'password' => Hash::make($plainPassword),
            ])->save();
        }

        RateLimiter::clear($this->throttleKey());

        return $user;
    }

    protected function failLogin(): never
    {
        RateLimiter::hit($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => __('auth.failed'),
        ]);
    }

    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => __('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    public function throttleKey(): string
    {
        return $this->string('email')
            ->lower()
            ->append('|'.$this->ip())
            ->transliterate()
            ->value();
    }
}
