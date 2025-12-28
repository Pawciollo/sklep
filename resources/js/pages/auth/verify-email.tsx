import EmailVerificationNotificationController from '@/actions/App/Http/Controllers/Auth/EmailVerificationNotificationController';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';
import { logout } from '@/routes';
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <AuthLayout
            title="Potwierdź adres e-mail"
            description="Sprawdź skrzynkę i kliknij link aktywacyjny. Jeśli nie widzisz wiadomości — sprawdź SPAM."
        >
            <Head title="Potwierdzenie e-mail" />

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    Wysłaliśmy nowy link weryfikacyjny na Twój adres e-mail.
                </div>
            )}

            <Form
                {...EmailVerificationNotificationController.store.form()}
                className="space-y-6 text-center"
            >
                {({ processing }) => (
                    <>
                        <Button disabled={processing} variant="secondary">
                            {processing && (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            )}
                            Wyślij link ponownie
                        </Button>

                        <TextLink href={logout()} className="mx-auto block text-sm">
                            Wyloguj
                        </TextLink>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
