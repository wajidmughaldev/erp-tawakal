export function AuthLayout({title, subtitle, children}: {title: string; subtitle: string; children: React.ReactNode}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[46%_54%]">
      <section className="hidden flex-col justify-between bg-[linear-gradient(145deg,#092A4A_0%,#123B6D_100%)] p-12 text-white lg:flex">
        <div>
          <img src="/brand/logo-white.svg" alt="Tawakal Enterprises" className="mb-6 size-32" />
          <h1 className="text-3xl font-semibold">Tawakal Enterprises</h1>
          <p className="mt-2 text-sm text-white/60">Employee Management & Smart ID Portal</p>
          <div className="my-5 h-1 w-11 rounded bg-[var(--brand-gold)]" />
          <p className="max-w-md text-[15px] leading-7 text-white/75">Employee records, ID card issuance and renewals in one place.</p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 lg:hidden">
            <img src="/brand/logo.png" alt="Tawakal Enterprises" className="mb-3 size-20" />
            <h1 className="text-xl font-semibold text-[var(--brand-dark)]">Tawakal Enterprises</h1>
            <p className="text-sm text-slate-500">Employee Management & Smart ID Portal</p>
          </div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
