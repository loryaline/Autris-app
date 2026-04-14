"use client";

import { useState, useEffect } from "react";
import type { Template } from "@/lib/wb-templates";

export function DynamicTemplate({
  template,
  data,
  onChange,
}: {
  template: Template;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const [local, setLocal] = useState<Record<string, unknown>>(data);

  useEffect(() => {
    setLocal(data);
  }, [data]);

  function update(key: string, value: unknown) {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-5">
      {template.sections.map((section) => (
        <div key={section.group}>
          <div className="flex items-center gap-2 mb-2 text-[13px] font-semibold text-text-primary">
            <span>{section.icon}</span>
            <span>{section.group}</span>
          </div>
          <div className="flex flex-col gap-2 pl-6">
            {section.fields.map((f) => {
              if (f.type === "quad") {
                const quadData = (local[f.key] as Record<string, string>) ?? {};
                const cols = f.columns ?? ["A", "B", "C", "D"];
                return (
                  <div key={f.key} className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {cols.map((col, idx) => {
                      const colKey = `col${idx}`;
                      return (
                        <div key={colKey}>
                          <label className="block text-[11px] text-text-tertiary mb-0.5">
                            {col}
                          </label>
                          <textarea
                            value={quadData[colKey] ?? ""}
                            onChange={(e) =>
                              update(f.key, { ...quadData, [colKey]: e.target.value })
                            }
                            rows={4}
                            placeholder="Une entrée par ligne"
                            className="w-full text-[12px] px-2 py-1.5 bg-bg-primary border border-border rounded resize-none focus:outline-none focus:border-primary"
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              }

              if (f.type === "input") {
                return (
                  <div key={f.key}>
                    <label className="block text-[11px] text-text-tertiary mb-0.5">
                      {f.label}
                    </label>
                    <input
                      value={(local[f.key] as string) ?? ""}
                      onChange={(e) => update(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full text-[12.5px] px-2 py-1.5 bg-bg-primary border border-border rounded focus:outline-none focus:border-primary"
                    />
                  </div>
                );
              }

              return (
                <div key={f.key}>
                  {f.label && (
                    <label className="block text-[11px] text-text-tertiary mb-0.5">
                      {f.label}
                    </label>
                  )}
                  <textarea
                    value={(local[f.key] as string) ?? ""}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={f.rows ?? 2}
                    className="w-full text-[12.5px] px-2 py-1.5 bg-bg-primary border border-border rounded resize-none focus:outline-none focus:border-primary"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
