export default function CheckEmailPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Check your email
        </h1>
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          We sent you a link to sign in. Click the link in the email to continue.
        </p>
        <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
          If you don&apos;t see the email within a minute, check your spam folder.
        </p>
      </div>
    </main>
  );
}
