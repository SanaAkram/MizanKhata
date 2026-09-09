import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/work";

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col justify-center bg-paper px-6 py-10">
      <div className="mb-8">
        <h1 className="numeric text-3xl font-semibold text-forest">Roznamcha</h1>
        <p className="mt-1 text-sm text-muted">
          Your work timer and daily routine.
        </p>
      </div>
      <LoginForm next={safeNext} />
    </div>
  );
}
