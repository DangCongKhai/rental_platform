import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { ContractIcon, UserIcon } from "@/components/ui/icons";
import { getMyUnitHistory } from "@/server/properties";
import {
  formatMonthlyRent,
  formatRentalRange,
} from "../../../components/rental-format";
import { StatusPill, textLinkClass } from "../../../components/status-pill";

export default function OwnerUnitHistoryPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          message="Đang tải lịch sử thuê..."
          className="min-h-80 w-full"
        />
      }
    >
      <UnitHistory params={params} />
    </Suspense>
  );
}

async function UnitHistory({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id, unitId } = await params;
  const history = await getMyUnitHistory(id, unitId);
  if (!history) notFound();

  return (
    <section
      className={[
        "mx-auto flex w-full max-w-4xl flex-col gap-5",
        "px-1 py-4 sm:px-2 sm:py-6",
      ].join(" ")}
    >
      <nav className="text-sm text-slate-500">
        <Link href="/owner/properties" className="hover:text-slate-800">
          Bất động sản
        </Link>
        <span aria-hidden="true"> {" > "} </span>
        <Link
          href={`/owner/properties/${history.property_id}`}
          className="hover:text-slate-800"
        >
          {history.property_name}
        </Link>
        <span aria-hidden="true"> {" > "} </span>
        <span className="text-slate-800">{history.label}</span>
      </nav>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Lịch sử thuê căn {history.label}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{history.facts}</p>
      </header>

      {history.tenancies.length === 0 ? (
        <p
          className={[
            "rounded-2xl border border-dashed border-slate-300",
            "bg-white px-6 py-14 text-center text-sm text-slate-600",
          ].join(" ")}
        >
          Căn này chưa có lịch sử thuê.
        </p>
      ) : (
        <ol
          className={[
            "relative grid gap-3 border-l",
            "border-slate-200 pl-5",
          ].join(" ")}
        >
          {history.tenancies.map((tenancy) => (
            <li
              key={tenancy.id}
              className={[
                "relative rounded-2xl border border-slate-200",
                "bg-white p-4",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-6 -left-[1.55rem] size-2.5",
                  "rounded-full ring-4 ring-slate-50",
                  tenancy.status_tone === "success"
                    ? "bg-emerald-500"
                    : tenancy.status_tone === "warning"
                      ? "bg-amber-500"
                      : tenancy.status_tone === "info"
                        ? "bg-sky-500"
                        : "bg-slate-400",
                ].join(" ")}
              />
              <div
                className={[
                  "flex flex-col gap-3 sm:flex-row",
                  "sm:items-start sm:justify-between",
                ].join(" ")}
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {formatRentalRange(
                      tenancy.start_date,
                      tenancy.end_date,
                    )}
                  </p>
                  <p
                    className={[
                      "mt-2 flex items-center gap-2",
                      "text-sm text-slate-700",
                    ].join(" ")}
                  >
                    <UserIcon className="size-4 text-slate-500" />
                    {tenancy.tenant_name}
                  </p>
                  <p className="mt-1 pl-6 text-sm text-slate-700">
                    Tiền thuê: {formatMonthlyRent(tenancy.monthly_rent)}
                  </p>
                </div>
                <div
                  className={[
                    "flex items-center justify-between gap-3",
                    "sm:flex-col sm:items-end",
                  ].join(" ")}
                >
                  <StatusPill tone={tenancy.status_tone}>
                    {tenancy.status_label}
                  </StatusPill>
                  <Link
                    href={`/owner/tenancies/${tenancy.id}`}
                    className={[
                      textLinkClass,
                      "inline-flex items-center gap-1.5",
                    ].join(" ")}
                  >
                    <ContractIcon className="size-4" />
                    Xem kỳ thuê
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
