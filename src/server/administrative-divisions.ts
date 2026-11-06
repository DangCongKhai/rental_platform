import { cacheLife } from "next/cache";

const API_BASE = "https://provinces.open-api.vn/api/v2";

export type AdministrativeDivisionOption = {
  code: string;
  name: string;
  type: string;
};

export class AdministrativeDivisionError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdministrativeDivisionError";
    this.status = status;
  }
}

type DivisionItem = {
  code: number;
  name: string;
  division_type: string;
  wards?: DivisionItem[];
};

function option(item: DivisionItem): AdministrativeDivisionOption {
  return {
    code: String(item.code),
    name: item.name,
    type: item.division_type,
  };
}

async function readDivision(path: string): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new AdministrativeDivisionError(
      `Administrative division service returned ${response.status}.`,
      response.status,
    );
  }
  return response.json();
}

function itemsOf(value: unknown): DivisionItem[] {
  if (!Array.isArray(value)) {
    throw new AdministrativeDivisionError(
      "Administrative division service returned invalid data.",
      502,
    );
  }
  return value.filter(
    (item): item is DivisionItem =>
      typeof item === "object" &&
      item !== null &&
      typeof item.code === "number" &&
      typeof item.name === "string" &&
      typeof item.division_type === "string",
  );
}

export async function getCurrentProvinces(): Promise<
  AdministrativeDivisionOption[]
> {
  "use cache";
  cacheLife("days");
  const payload = await readDivision("/?depth=1");
  return itemsOf(payload).map(option);
}

export async function getCurrentWards(
  provinceCode: string,
): Promise<AdministrativeDivisionOption[]> {
  "use cache";
  cacheLife("days");
  const payload = await readDivision(
    `/p/${encodeURIComponent(provinceCode)}?depth=2`,
  );
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("wards" in payload)
  ) {
    throw new AdministrativeDivisionError(
      "Administrative division service returned invalid data.",
      502,
    );
  }
  return itemsOf(payload.wards).map(option);
}
