'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Alert,
    AlertTitle,
    AlertDescription,
} from '@/components/ui/alert';

const DeleteSchema = z.object({
    email: z.string().email('Please enter a valid email.'),
    password: z
        .string()
        .min(6, 'Password must be at least 6 characters.')
        .max(128, 'Password is too long.'),
    reason: z.string().max(500).optional(),
    confirm: z.literal(true, {
        errorMap: () => ({ message: 'You must confirm this action.' }),
    }),
});

type DeleteFormValues = z.infer<typeof DeleteSchema>;

export default function AccountDeletionPage() {
    const [serverError, setServerError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState<boolean>(false);

    const form = useForm<DeleteFormValues>({
        resolver: zodResolver(DeleteSchema),
        defaultValues: {
            email: '',
            password: '',
            reason: '',
            confirm: false as unknown as true, // will be explicitly set by checkbox
        },
    });

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setValue,
        watch,
    } = form;

    const onSubmit = async (values: DeleteFormValues) => {
        setServerError(null);
        setSuccess(false);
        try {
            const res = await fetch('/api/account/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || 'Failed to delete account.');
            }
            setSuccess(true);
        } catch (err: any) {
            setServerError(err?.message || 'Unexpected error.');
        }
    };

    return (
        <div className="min-h-[80vh] w-full grid place-items-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                <Card className="rounded-2xl shadow">
                    <CardHeader>
                        <CardTitle>Delete your account</CardTitle>
                        <CardDescription>
                            This action is permanent and will remove your profile, data, and access.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                            {success && (
                                <Alert>
                                    <AlertTitle>Request received</AlertTitle>
                                    <AlertDescription>
                                        Your account deletion has been processed. If you signed in via a third-party provider, you may also revoke access in your provider settings.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {serverError && (
                                <Alert>
                                    <AlertTitle>Could not complete</AlertTitle>
                                    <AlertDescription>{serverError}</AlertDescription>
                                </Alert>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
                                {errors.email && (
                                    <p className="text-sm text-red-600">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" type="password" placeholder="Your current password" {...register('password')} />
                                {errors.password && (
                                    <p className="text-sm text-red-600">{errors.password.message}</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="reason">Reason (optional)</Label>
                                <Textarea id="reason" placeholder="Tell us why you're leaving (optional)" {...register('reason')} />
                                {errors.reason && (
                                    <p className="text-sm text-red-600">{errors.reason.message}</p>
                                )}
                            </div>

                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="confirm"
                                    checked={!!watch('confirm')}
                                    onCheckedChange={(v) => setValue('confirm', Boolean(v) as true, { shouldValidate: true })}
                                />
                                <Label htmlFor="confirm" className="leading-snug">
                                    I understand this will permanently delete my account and associated data.
                                </Label>
                            </div>
                            {errors.confirm && (
                                <p className="text-sm text-red-600">{errors.confirm.message}</p>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-2">
                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                {isSubmitting ? 'Deleting…' : 'Delete account'}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                                If you signed in with Google/Apple and don’t have a password, contact support or request a login link to confirm ownership before deletion.
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </motion.div>
        </div>
    );
}