import BrandLockup from './BrandLockup'

export default function AppShell({ children }) {
  return (
    <main className="grid min-h-svh grid-cols-[260px_1fr] bg-surface max-[860px]:grid-cols-1">
      <aside className="flex flex-col gap-9 border-r border-border-soft bg-white p-7 max-[860px]:gap-5 max-[860px]:border-r-0 max-[860px]:border-b">
        <BrandLockup compact />
        <nav className="grid gap-2" aria-label="Primary">
          <a
            className="rounded-lg bg-[#e9f4f1] px-3.5 py-3 font-bold text-brand no-underline"
            href="#overview"
            aria-current="page"
          >
            Overview
          </a>
          <a
            className="rounded-lg px-3.5 py-3 font-bold text-copy no-underline"
            href="#patients"
          >
            Patients
          </a>
          <a
            className="rounded-lg px-3.5 py-3 font-bold text-copy no-underline"
            href="#schedule"
          >
            Schedule
          </a>
        </nav>
      </aside>

      <section className="p-8 max-[860px]:p-6">{children}</section>
    </main>
  )
}