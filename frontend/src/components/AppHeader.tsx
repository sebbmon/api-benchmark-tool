import Link from "next/link";

type AppHeaderProps = {
  action?: React.ReactNode;
};

export function AppHeader({ action }: AppHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-w-0 flex-col">
          <span className="text-base font-semibold text-slate-950">
            API Benchmark Lab
          </span>
          <span className="text-xs text-slate-500">
            HTTP performance tests for controlled targets
          </span>
        </Link>
        {action}
      </div>
    </header>
  );
}
