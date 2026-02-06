"use client"

import React from "react"

import type { Platform } from "@/lib/types"
import type { CalcState } from "@/lib/calc"

interface ControlsProps {
  platforms: Platform[]
  calcState: CalcState
  setCalcState: React.Dispatch<React.SetStateAction<CalcState>>
  onReset: () => void
}

const SIZES = ["S", "M", "L"] as const
const COUPONS = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000]
const EXTRAS = Array.from({ length: 11 }, (_, i) => i * 500)

export function Controls({
  platforms,
  calcState,
  setCalcState,
  onReset,
}: ControlsProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
      <select
        value={calcState.platformKey}
        onChange={(e) =>
          setCalcState((prev) => ({ ...prev, platformKey: e.target.value }))
        }
        className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
      >
        {platforms.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() =>
              setCalcState((prev) => ({ ...prev, size: s }))
            }
            className={`rounded-full border px-3.5 py-2.5 text-sm font-black transition-colors ${
              calcState.size === s
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-card text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <select
        value={calcState.coupon}
        onChange={(e) =>
          setCalcState((prev) => ({
            ...prev,
            coupon: Number(e.target.value),
          }))
        }
        className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
      >
        {COUPONS.map((v) => (
          <option key={v} value={v}>
            {v === 0 ? "쿠폰 없음" : `쿠폰 ${v.toLocaleString()}원`}
          </option>
        ))}
      </select>

      <select
        value={calcState.storeDeliveryExtra}
        onChange={(e) =>
          setCalcState((prev) => ({
            ...prev,
            storeDeliveryExtra: Number(e.target.value),
          }))
        }
        className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
      >
        {EXTRAS.map((v) => (
          <option key={v} value={v}>
            {v === 0
              ? "추가 배달비 없음"
              : `추가 배달비 ${v.toLocaleString()}원`}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onReset}
        className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-black text-foreground transition-colors hover:bg-muted"
      >
        초기화
      </button>
    </div>
  )
}
