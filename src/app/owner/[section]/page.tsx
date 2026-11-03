import { notFound } from "next/navigation";

export const instant = false;

const SECTIONS: Record<string, string> = {
  listings: "Tin đăng",
  requests: "Yêu cầu thuê",
  tenancies: "Kỳ thuê và hợp đồng",
};

export default async function OwnerSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const title = SECTIONS[section];
  if (!title) notFound();

  return (
    <section className="max-w-2xl">
      <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ink">
        {title}
      </h1>
      <p className="mt-2 text-muted">
        Mục này sẽ được bổ sung ở bước tiếp theo.
      </p>
    </section>
  );
}
