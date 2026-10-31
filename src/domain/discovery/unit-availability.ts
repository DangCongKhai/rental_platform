export type DateBlock = {
  start: string;
  end: string;
};

export type UnitAvailability = {
  availableNow: boolean;
  availableFrom: string | null;
  availableUntil: string | null;
  label: string;
};

function parseIso(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(iso);
  if (!match) throw new Error(`Invalid date: ${iso}`);
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

function formatIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatIso(date);
}

function addMonths(iso: string, months: number): string {
  const date = parseIso(iso);
  date.setUTCMonth(date.getUTCMonth() + months);
  return formatIso(date);
}

function covers(block: DateBlock, day: string): boolean {
  return block.start <= day && day <= block.end;
}

export function describeUnitAvailability(
  today: string,
  blocks: DateBlock[],
): UnitAvailability {
  const covering = blocks.filter((block) => covers(block, today));
  if (covering.length > 0) {
    const availableFrom = addDays(
      covering.reduce(
        (latest, block) => (block.end > latest ? block.end : latest),
        covering[0].end,
      ),
      1,
    );
    return {
      availableNow: false,
      availableFrom,
      availableUntil: null,
      label: `Trống từ ${formatDisplayDate(availableFrom)}`,
    };
  }

  const upcoming = blocks
    .filter((block) => block.start > today)
    .sort((left, right) => left.start.localeCompare(right.start));
  if (upcoming.length > 0) {
    const availableUntil = addDays(upcoming[0].start, -1);
    return {
      availableNow: true,
      availableFrom: null,
      availableUntil,
      label: `Còn trống đến ${formatDisplayDate(availableUntil)}`,
    };
  }

  return {
    availableNow: true,
    availableFrom: null,
    availableUntil: null,
    label: "Còn trống",
  };
}

export function todayInVietnam(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(now);
}

export function stayIsFree(
  moveIn: string,
  minimumMonths: number,
  blocks: DateBlock[],
): boolean {
  const stayEnd = addMonths(moveIn, minimumMonths);
  return blocks.every((block) => {
    const blockEnd = addDays(block.end, 1);
    return stayEnd <= block.start || blockEnd <= moveIn;
  });
}
