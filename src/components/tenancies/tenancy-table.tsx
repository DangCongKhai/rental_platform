import Link from "next/link";
import { dong } from "@/components/listings/listing-format";
import { requestDate } from "@/components/tenant/request-status";
import { buttonClass } from "@/components/ui/button";
import type { getOwnerTenancies } from "@/server/tenancies/read";
import { TenancyStatus } from "./tenancy-status";

type Row = Awaited<ReturnType<typeof getOwnerTenancies>>["tenancies"][number];

function money(value: { toString(): string } | null | undefined) {
  if (!value) return "—";
  return `${dong(Number(value.toString()))}`;
}

function termOf(row: Row) {
  const confirmed = row.latestConfirmedContract;
  const pending = row.pendingContract;
  const contract = confirmed ?? pending;
  return {
    contract,
    proposed: confirmed == null && pending != null,
    start:
      row.confirmedStartDate ??
      row.blockedStartDate ??
      contract?.startDate ??
      null,
    end:
      row.confirmedEndDate ?? row.blockedEndDate ?? contract?.endDate ?? null,
  };
}

export function TenancyTable({
  tenancies,
  party,
}: {
  tenancies: Row[];
  party: "owner" | "tenant";
}) {
  return (
    <div className="overflow-x-auto rounded-[15px] border border-line bg-white">
      <table className="w-full min-w-[1080px] border-collapse text-left">
        <thead>
          <tr className="bg-[#f7f9fb] text-[13px] font-semibold text-subtle">
            <th scope="col" className="px-4 py-4 font-semibold">
              Căn
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              {party === "owner" ? "Người thuê" : "Bất động sản"}
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              Dọn vào
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              Dọn ra
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              Hợp đồng
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              Trạng thái
            </th>
            <th scope="col" className="px-4 py-4">
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tenancies.map((tenancy) => {
            const term = termOf(tenancy);
            const href =
              party === "owner"
                ? `/owner/tenancies/${tenancy.id}`
                : tenancy.pendingContract && !tenancy.latestConfirmedContract
                  ? `/tenant/tenancies/${tenancy.id}/review`
                  : `/tenant/tenancies/${tenancy.id}`;
            return (
              <tr
                key={tenancy.id}
                className="border-t border-line-soft align-top"
              >
                <td className="px-4 py-3.5">
                  <p className="text-[15px] font-semibold text-ink-2">
                    {tenancy.unit.label}
                  </p>
                  {party === "owner" && (
                    <p className="mt-0.5 text-[13px] text-subtle">
                      {tenancy.unit.property.name}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-[15px] text-ink">
                  {party === "owner"
                    ? tenancy.rentalRequest.contactName
                    : tenancy.unit.property.name}
                </td>
                <td className="px-4 py-3.5 text-[15px] whitespace-nowrap text-ink">
                  <p>{term.start ? requestDate(term.start) : "—"}</p>
                  {tenancy.movedInAt && (
                    <p className="mt-1 text-[13px] text-subtle">
                      Đã vào {requestDate(tenancy.movedInAt)}
                    </p>
                  )}
                  {term.proposed && term.start && (
                    <p className="mt-1 text-[13px] text-subtle">Theo đề xuất</p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-[15px] whitespace-nowrap text-ink">
                  <p>{term.end ? requestDate(term.end) : "—"}</p>
                  {term.proposed && term.end && (
                    <p className="mt-1 text-[13px] text-subtle">Theo đề xuất</p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-ink">
                  {term.contract ? (
                    <>
                      <p className="font-semibold">
                        Phiên bản {term.contract.versionNumber}
                        {term.proposed ? " · chờ xác nhận" : ""}
                      </p>
                      <p className="mt-1">
                        {money(term.contract.monthlyRent)}/tháng
                      </p>
                      <p className="text-subtle">
                        Cọc {money(term.contract.depositAmount)}
                      </p>
                    </>
                  ) : (
                    <p className="text-subtle">Chưa có hợp đồng</p>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <TenancyStatus status={tenancy.status} />
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Link
                    href={href}
                    className={buttonClass({ variant: "secondary" })}
                  >
                    Xem hợp đồng
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
