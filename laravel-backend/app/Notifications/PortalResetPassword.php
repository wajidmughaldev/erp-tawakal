<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PortalResetPassword extends Notification
{
    public function __construct(private string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = rtrim((string) config('app.frontend_url'), '/').'/reset-password?'.http_build_query(['token' => $this->token, 'email' => $notifiable->email]);
        $minutes = config('auth.passwords.users.expire');

        return (new MailMessage)
            ->subject('Reset your Tawakal Ent. portal password')
            ->line('You requested a password reset for the Smart ID Portal.')
            ->action('Reset Password', $url)
            ->line("This link expires in {$minutes} minutes. If you did not request it, no action is needed.");
    }
}
