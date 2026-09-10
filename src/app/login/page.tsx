import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/work";

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-paper px-6 py-12">
      <div className="mb-8 mt-4">
        <h1 className="numeric text-3xl font-semibold text-forest">MizanKhata</h1>
        <p className="mt-1 text-sm text-muted">
          Shop ledger, work timer and daily routine.
        </p>
      </div>
      <LoginForm next={safeNext} />
    </div>
  );
}
