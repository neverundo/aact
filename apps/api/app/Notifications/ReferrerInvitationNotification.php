<?php

namespace App\Notifications;

use App\Models\Invitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ReferrerInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly Invitation $invitation,
        private readonly string $plainToken,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $acceptUrl = rtrim((string) config('app.url'), '/').'/portal/invitations/'.$this->invitation->uuid.'?token='.$this->plainToken;

        return (new MailMessage)
            ->subject('Convite AACT para referrer')
            ->greeting('Olá'.($this->invitation->name ? ' '.$this->invitation->name : '').',')
            ->line('Foi convidado a participar como referrer em '.$this->invitation->business->name.'.')
            ->action('Aceitar convite', $acceptUrl)
            ->line('Abrir o link não consome o convite. A aceitação só ocorre após submissão explícita.')
            ->line('Este convite expira em '.$this->invitation->expires_at->toIso8601String().'.');
    }
}
