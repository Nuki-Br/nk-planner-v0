import Link from "next/link";

// Página 404 (Fase 11). Server Component — sem estado.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background-standard px-6 text-center">
      <div>
        <h1 className="text-lg font-bold text-neutral-gray-11">Página não encontrada</h1>
        <p className="mt-1 max-w-md text-[13px] text-neutral-gray-7">
          O endereço que você acessou não existe ou foi movido.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-lg bg-primary-6 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-primary-7"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
