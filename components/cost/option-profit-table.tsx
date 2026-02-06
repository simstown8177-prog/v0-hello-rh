"use client"

import type { CalcResult } from "@/lib/calc"
import { won, toNumber } from "@/lib/calc"
import type { OptionGroup } from "@/lib/types"

interface Props {
  result: CalcResult
  groups: OptionGroup[]
}

export function OptionProfitTable({ result, groups }: Props) {
  const selected = result.lines.filter(
    (x) => x.opt.price_delta !== 0 || x.opt.cost_delta !== 0 || x.qty > 0
  )

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-3.5 py-3 text-sm font-black text-foreground">
        {"선택 옵션 손익 (옵션 단독)"}
      </div>
      <div className="p-3">
        {selected.length === 0 ? (
          <div className="py-2 text-sm font-bold text-muted-foreground">
            {"선택된 옵션이 없습니다."}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {selected.map((x, i) => {
              const p = toNumber(x.opt.price_delta, 0) * x.qty
              const c = toNumber(x.opt.cost_delta, 0) * x.qty
              const d = p - c
              const groupName =
                groups.find((g) => g.id === x.opt.group_id)?.title ??
                x.opt.group_id

              return (
                <div
                  key={`${x.opt.id}-${i}`}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2.5 rounded-2xl border border-muted bg-background p-3"
                >
                  <div>
                    <div className="text-sm font-black text-foreground">
                      {x.opt.name}
                      {x.qty > 1 ? ` x${x.qty}` : ""}
                    </div>
                    <div className="mt-1 text-xs font-bold text-muted-foreground">
                      {groupName}
                    </div>
                  </div>
                  <div className="text-right text-xs font-bold text-muted-foreground">
                    <div>{`+${won(p)}`}</div>
                    <div className="mt-1">{`원가 +${won(c)}`}</div>
                  </div>
                  <div className="h-9 w-px bg-border" />
                  <div
                    className={`text-right text-sm font-black ${
                      d < 0 ? "text-destructive" : "text-primary"
                    }`}
                  >
                    {d < 0 ? "" : "+"}
                    {won(d)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
