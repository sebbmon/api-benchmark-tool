"use client";

export type HeaderRow = {
  id: string;
  key: string;
  value: string;
};

type HeadersEditorProps = {
  rows: HeaderRow[];
  onChange: (rows: HeaderRow[]) => void;
};

let rowId = 0;

export function createHeaderRow(key = "", value = ""): HeaderRow {
  rowId += 1;
  return { id: `header-${rowId}`, key, value };
}

export function headerRowsFromRecord(headers?: Record<string, string>): HeaderRow[] {
  const entries = Object.entries(headers ?? {});
  if (!entries.length) {
    return [createHeaderRow()];
  }

  return entries.map(([key, value]) => createHeaderRow(key, value));
}

export function headersToRecord(rows: HeaderRow[]): Record<string, string> {
  const headers: Record<string, string> = {};
  const names = new Set<string>();

  for (const row of rows) {
    const key = row.key.trim();
    const value = row.value.trim();
    if (!key && !value) {
      continue;
    }
    if (!key) {
      throw new Error("Header name cannot be blank.");
    }

    const lowerKey = key.toLowerCase();
    if (names.has(lowerKey)) {
      throw new Error(`Duplicate header name: ${key}.`);
    }

    names.add(lowerKey);
    headers[key] = value;
  }

  return headers;
}

export function HeadersEditor({ rows, onChange }: HeadersEditorProps) {
  function updateRow(id: string, field: "key" | "value", value: string) {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function removeRow(id: string) {
    const nextRows = rows.filter((row) => row.id !== id);
    onChange(nextRows.length ? nextRows : [createHeaderRow()]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">Headers</span>
        <button
          type="button"
          onClick={() => onChange([...rows, createHeaderRow()])}
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 transition hover:bg-slate-50"
        >
          Add header
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={row.key}
              onChange={(event) => updateRow(row.id, "key", event.target.value)}
              placeholder="Authorization"
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
            />
            <input
              value={row.value}
              onChange={(event) => updateRow(row.id, "value", event.target.value)}
              placeholder="Bearer token"
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
            />
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
