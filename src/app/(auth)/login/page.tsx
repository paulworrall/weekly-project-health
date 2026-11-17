import type { Metadata } from "next";
import { LoginForm } from "@/components/features/login-form";
import { RAG_VALUES, RAG, ragLabel } from "@/lib/rag";
import { formatWeekdayDayMonth } from "@/lib/dates";
import { resolveWeek } from "@/mocks/repository";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  const week = resolveWeek(undefined);
  return (
    <div className="flex min-h-screen flex-wrap bg-cream">
      <section
        aria-label="About this tool"
        className="flex min-h-[560px] min-w-0 flex-[1_1_420px] flex-col justify-between gap-10 bg-navy px-6 pt-14 pb-10 text-cream sm:px-14"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="inline-block size-3 rounded-full bg-orange" />
          <span className="text-[15px] font-medium tracking-[0.02em]">
            WPP Enterprise Solutions · MAP
          </span>
        </div>
        <div className="max-w-[520px]">
          <p className="mb-3.5 text-[13px] font-medium tracking-[0.12em] text-white uppercase">
            {week.label} · closes {formatWeekdayDayMonth(week.closeDate)}
          </p>
          <h1 className="text-[44px] leading-[1.05] font-light sm:text-[56px]">
            Weekly Project Health
          </h1>
          <p className="mt-5 text-[17px] leading-normal">
            Track the health of projects across clients and workstreams each week: Delivery RAG, %
            complete, % spend, risks and issues.
          </p>
          <ul aria-label="Delivery RAG values" className="mt-7 flex flex-wrap gap-2">
            {RAG_VALUES.map((r) => (
              <li
                key={r}
                className={`inline-flex h-7 items-center rounded-full px-3 text-[13px] font-medium text-navy ${RAG[r].bgClass}`}
              >
                {ragLabel(r)}
              </li>
            ))}
          </ul>
        </div>
        <p className="max-w-[520px] text-[13px] leading-normal">
          Internal tool. It holds client and project information, so it is for authorised WPP
          Enterprise Solutions staff only. Clients never see it.
        </p>
      </section>

      <div className="flex min-w-0 flex-[1_1_480px] items-center justify-center px-6 py-14 sm:px-8">
        <div className="w-full max-w-[420px]">
          <h2 className="text-[34px] font-light">Sign in</h2>
          <p className="mt-2 mb-7 text-[15px]">
            Use your work email and the password the Admin set up for you.
          </p>
          <LoginForm />
          <div className="mt-7 border-t border-line pt-5 text-[14px] leading-relaxed">
            <p className="font-medium">Forgotten your password or need access?</p>
            <p>
              Ask the Admin. Accounts and access are set up by the Admin; there is no self sign-up.
            </p>
          </div>
          <p className="mt-5 text-[12px] text-muted">
            Single sign-on with your Microsoft work account is planned. Until then, sign in with
            email and password.
          </p>
          <div className="mt-6 border border-dashed border-line-strong p-4 text-[13px]">
            <p className="font-medium">Development only (until sign-in is built)</p>
            <p className="mt-1">Sign-in doesn&apos;t work yet. View the sample data as:</p>
            <p className="mt-2 flex flex-wrap gap-4">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full page load so the dev role cookie is set */}
              <a href="/?as=admin" className="inline-flex min-h-11 items-center underline">
                Admin
              </a>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full page load so the dev role cookie is set */}
              <a href="/?as=updater" className="inline-flex min-h-11 items-center underline">
                Updater
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
