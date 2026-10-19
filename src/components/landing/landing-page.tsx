import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "1",
    title: "Describe the work",
    detail: "Type the job, or record a short clip. You can edit the transcript before anything is priced.",
  },
  {
    number: "2",
    title: "Review the quantities",
    detail: "Point counts and measured lengths are priced from your rate book. The formulas are versioned and stored with the estimate.",
  },
  {
    number: "3",
    title: "Export the quotation",
    detail: "Save a snapshot, then download the PDF and CSV. Later rate-book edits do not change a quotation you already saved.",
  },
];

const features = [
  {
    title: "Owned rate book",
    detail: "Material, labour, and wastage stay on your account. Search, edit, and import or export CSV.",
  },
  {
    title: "Deterministic totals",
    detail: "Money is calculated in integer minor units. The language model cannot invent a rate or a total.",
  },
  {
    title: "Quotation snapshot",
    detail: "Each quotation keeps the client, lines, tax, and total from the moment you saved it.",
  },
  {
    title: "Local by default",
    detail: "Accounts and estimates use the database you select. Suggestions and speech stay on services you run.",
  },
];

const sampleLines = [
  { description: "Cable, measured route", unit: "m", quantity: "16.550", rate: "150.00", amount: "2,482.50" },
  { description: "Light point", unit: "nos", quantity: "10", rate: "125.00", amount: "1,250.00" },
];

export function LandingPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            EstiForge
          </Link>
          <p className="hidden text-sm text-muted-foreground sm:block">Electrical estimation</p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">
                <span className="sm:hidden">Register</span>
                <span className="hidden sm:inline">Create an account</span>
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-center md:py-24">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-medium text-muted-foreground">For independent electrical engineers</p>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Turn a site description into a reviewed estimate and quotation.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              EstiForge keeps the takeoff on your machine. You enter the counts and lengths, your rates
              set the prices, and the quotation you export is the one you reviewed.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="h-10 px-4" asChild>
                <Link href="/register">Create an account</Link>
              </Button>
              <Button variant="outline" className="h-10 px-4" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Local account. No payment step.</p>
          </div>

          <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <figcaption className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-medium">Sample quotation</span>
              <span className="font-mono text-xs text-muted-foreground">Q-SAMPLE</span>
            </figcaption>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Rate</th>
                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleLines.map((line) => (
                    <tr key={line.description} className="border-b border-border">
                      <td className="px-4 py-3">
                        {line.description}
                        <span className="mt-0.5 block text-xs text-muted-foreground">{line.unit}</span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">{line.quantity}</td>
                      <td className="px-3 py-3 font-mono text-xs">{line.rate}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{line.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="grid grid-cols-2 gap-2 px-4 py-4 text-sm">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="text-right font-mono text-xs">3,732.50</dd>
              <dt className="text-muted-foreground">Adjustment</dt>
              <dd className="text-right font-mono text-xs">−100.00</dd>
              <dt className="text-muted-foreground">Tax 18%</dt>
              <dd className="text-right font-mono text-xs">653.85</dd>
              <dt className="font-medium">Total</dt>
              <dd className="text-right font-mono text-sm font-medium">4,286.35</dd>
            </dl>
            <p className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">
              Cable length is the worked route example: 10 m + 4.5 m, 10% wastage, then two 0.3 m
              terminations. Totals are calculated in code.
            </p>
          </figure>
        </section>

        <section className="border-y border-border bg-muted/40">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number}>
                <p className="font-mono text-xs text-muted-foreground">Step {step.number}</p>
                <h2 className="mt-2 text-lg font-medium">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">What you can do</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-base font-medium">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-20">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Start with one project.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Civil work, cable sizing, and protection design are left out on purpose. EstiForge
                prices the quantities you enter.
              </p>
            </div>
            <Button className="h-10 px-4" asChild>
              <Link href="/register">Create an account</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>EstiForge</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Create an account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
