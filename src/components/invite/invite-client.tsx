"use client";

import { useEffect, useActionState } from "react";
import { acceptInvitation } from "@/lib/actions/organizations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";

export function InviteClient({ token }: { token: string }) {
  const router = useRouter();

  const [state, action, pending] = useActionState(
    async () => (await acceptInvitation(token)) ?? null,
    null
  );

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard");
    }
  }, [state, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Acceptă invitația</CardTitle>
          <CardDescription>
            Apasă butonul de mai jos pentru a te alătura organizației
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state?.error && (
            <p className="mb-4 text-sm text-destructive">{state.error}</p>
          )}
          <form action={action}>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Se procesează..." : "Acceptă invitația"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
