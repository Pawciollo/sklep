import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form } from '@inertiajs/react';
import { useRef } from 'react';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-6">
            <HeadingSmall
                title="Usuń konto"
                description="Trwale usuń swoje konto oraz wszystkie powiązane dane"
            />

            <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="space-y-1 text-red-700">
                    <p className="font-semibold">Uwaga</p>
                    <p className="text-sm">
                        Ta operacja jest <strong>nieodwracalna</strong>. Po
                        usunięciu konta wszystkie dane zostaną trwale skasowane.
                    </p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive">
                            Usuń konto
                        </Button>
                    </DialogTrigger>

                    <DialogContent>
                        <DialogTitle>
                            Czy na pewno chcesz usunąć konto?
                        </DialogTitle>

                        <DialogDescription>
                            Po usunięciu konta wszystkie Twoje dane, zamówienia
                            oraz ustawienia zostaną trwale usunięte.
                            <br />
                            <br />
                            Aby potwierdzić, wpisz swoje hasło.
                        </DialogDescription>

                        <Form
                            {...ProfileController.destroy.form()}
                            options={{ preserveScroll: true }}
                            onError={() => passwordInput.current?.focus()}
                            resetOnSuccess
                            className="space-y-6"
                        >
                            {({ resetAndClearErrors, processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password"
                                            className="sr-only"
                                        >
                                            Hasło
                                        </Label>

                                        <Input
                                            id="password"
                                            type="password"
                                            name="password"
                                            ref={passwordInput}
                                            placeholder="Wpisz hasło"
                                            autoComplete="current-password"
                                        />

                                        <InputError message={errors.password} />
                                    </div>

                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button
                                                variant="secondary"
                                                onClick={() =>
                                                    resetAndClearErrors()
                                                }
                                            >
                                                Anuluj
                                            </Button>
                                        </DialogClose>

                                        <Button
                                            variant="destructive"
                                            disabled={processing}
                                            asChild
                                        >
                                            <button type="submit">
                                                Usuń konto
                                            </button>
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
