import { cacheLife } from "next/cache";

const API_BASE = "https://tinhthanhpho.com/api/v1";
const PAGE_SIZE = 100;

export type AdministrativeDivisionOption = {
  code: string;
  name: string;
  type: string;
};

type ApiItem = {
  code: string;
  name: string;
  type: string;
};

type ApiPage = {
  success: boolean;
  data: ApiItem[];
  metadata?: {
    total?: number;
    limit?: number;
  };
};

async function getPage(path: string, page: number): Promise<ApiPage> {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Administrative division service returned an error.");

  const result = (await response.json()) as ApiPage;
  if (!result.success || !Array.isArray(result.data)) {
    throw new Error("Administrative division service returned invalid data.");
  }
  return result;
}

async function getAllPages(path: string): Promise<AdministrativeDivisionOption[]> {
  const firstPage = await getPage(path, 1);
  const pageSize = firstPage.metadata?.limit || PAGE_SIZE;
  const pageCount = Math.ceil((firstPage.metadata?.total ?? firstPage.data.length) / pageSize);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => getPage(path, index + 2)),
  );

  return [firstPage, ...remainingPages]
    .flatMap((page) => page.data)
    .map(({ code, name, type }) => ({ code, name, type }));
}

export async function getCurrentProvinces(): Promise<AdministrativeDivisionOption[]> {
  "use cache";
  cacheLife("days");
  return getAllPages("/new-provinces");
}

export async function getCurrentWards(provinceCode: string): Promise<AdministrativeDivisionOption[]> {
  "use cache";
  cacheLife("days");
  return getAllPages(`/new-provinces/${encodeURIComponent(provinceCode)}/wards`);
}
