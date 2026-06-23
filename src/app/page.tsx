import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <Building2 className="h-6 w-6" />
            Asociatii
          </div>
          <div className="flex gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
              Autentificare
            </Link>
            <Link href="/register" className={cn(buttonVariants())}>
              Înregistrare
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Platformă SaaS pentru managementul asociațiilor de proprietari
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Gestionează clădiri, apartamente, documente, voturi, cereri de
          service și comunicarea cu locatarii — totul într-un singur loc.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
            Începe gratuit
          </Link>
          <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            Autentificare
          </Link>
        </div>
      </main>
    </div>
  );
}
