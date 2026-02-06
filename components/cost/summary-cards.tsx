"use client"

import type { CalcResult } from "@/lib/calc"
import { won, pct } from "@/lib/calc"

interface SummaryCardsProps {
  result: CalcResult
  open: boolean
  onToggle: () => void
}

export function SummaryCards({ result, open, onToggle }: SummaryCardsProps) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-3">
        <span className="text-xs font-bold text-muted-foreground">
          {"원가 / 수수료"}
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-full border border-border bg-card px-2 py-1 text-xs font-black text-foreground"
        >
          {open ? "\u2228" : "\u2227"}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-2 grid grid-cols-2 gap-2.5 px-0 md:grid-cols-4">
          <SumCard
            title="총 결제금액(쿠폰 전)"
            value={won(result.gross)}
          />
          <SumCard title="실매출(쿠폰 적용)" value={won(result.net)} />
          <SumCard title="총 원가" value={won(result.totalCost)} />
          <SumCard
            title={`실마진 (${pct(result.marginRate)})`}
            value={won(result.profit)}
            negative={result.profit < 0}
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-3 px-3 text-xs font-bold text-muted-foreground">
          <span>
            {"플랫폼수수료: "}
            <strong className="text-foreground">{won(result.platformFee)}</strong>
          </span>
          <span>
            {"카드수수료: "}
            <strong className="text-foreground">{won(result.cardFee)}</strong>
          </span>
          <span>
            {"배달비: "}
            <strong className="text-foreground">{won(result.delivery)}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}

function SumCard({
  title,
  value,
  negative,
}: {
  title: string
  value: string
  negative?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="text-xs font-bold text-muted-foreground">{title}</div>
      <div
        className={`mt-1.5 text-lg font-black ${
          negative ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  )
}
