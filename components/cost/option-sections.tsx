"use client"

import React from "react"

import type { Option, OptionGroup, OptionMenuMap } from "@/lib/types"
import type { CalcState } from "@/lib/calc"
import { won, clamp, toNumber } from "@/lib/calc"

interface OptionSectionsProps {
  groups: OptionGroup[]
  options: Option[]
  calcState: CalcState
  setCalcState: React.Dispatch<React.SetStateAction<CalcState>>
  optionMenuMap: OptionMenuMap[]
  selectedMenuId: string | null
}

export function OptionSections({
  groups,
  options,
  calcState,
  setCalcState,
  optionMenuMap,
  selectedMenuId,
}: OptionSectionsProps) {
  // 매핑 데이터가 있는 옵션만 선택된 메뉴에 해당하는 것 필터링
  // 매핑이 아예 없는 옵션은 모든 메뉴에 표시 (하위 호환)
  const optionIdsWithMapping = new Set(optionMenuMap.map((m) => m.option_id))
  const allowedOptionIds = new Set(
    optionMenuMap
      .filter((m) => m.menu_id === selectedMenuId)
      .map((m) => m.option_id)
  )

  const filteredOptions = options.filter((o) => {
    if (!optionIdsWithMapping.has(o.id)) return true // 매핑 없으면 전체 표시
    return allowedOptionIds.has(o.id)
  })

  return (
    <div className="mt-3 flex flex-col gap-3">
      {groups.map((group) => {
        const groupOpts = filteredOptions.filter(
          (o) => o.group_id === group.id && o.enabled !== false
        )
        if (!groupOpts.length) return null

        return (
          <div
            key={group.id}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="border-b border-border px-3.5 pb-2.5 pt-3.5">
              <div className="text-sm font-black text-foreground">
                {group.title}
              </div>
              <div className="mt-1 text-xs font-bold text-muted-foreground">
                {group.subtitle}
              </div>
            </div>

            <div>
              {groupOpts.map((opt) => (
                <OptionRow
                  key={opt.id}
                  opt={opt}
                  group={group}
                  calcState={calcState}
                  setCalcState={setCalcState}
                  allOptions={options}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OptionRow({
  opt,
  group,
  calcState,
  setCalcState,
  allOptions,
}: {
  opt: Option
  group: OptionGroup
  calcState: CalcState
  setCalcState: React.Dispatch<React.SetStateAction<CalcState>>
  allOptions: Option[]
}) {
  const handleRadio = () => {
    setCalcState((prev) => ({
      ...prev,
      radio: { ...prev.radio, [opt.group_id]: opt.id },
    }))
  }

  const handleCheck = () => {
    setCalcState((prev) => {
      const newChecked = { ...prev.checked }

      if (group.kind === "check_limit" && !newChecked[opt.id]) {
        const max = group.maxSelect || 99
        const checkedInGroup = allOptions
          .filter(
            (o) => o.group_id === opt.group_id && o.enabled !== false && newChecked[o.id]
          )
          .map((o) => o.id)
        if (checkedInGroup.length >= max) {
          delete newChecked[checkedInGroup[0]]
        }
      }

      newChecked[opt.id] = !newChecked[opt.id]
      return { ...prev, checked: newChecked }
    })
  }

  const qtyVal = clamp(toNumber(calcState.qty[opt.id], 0), 0, opt.max_qty || 99)

  const handleQtyCheck = () => {
    setCalcState((prev) => ({
      ...prev,
      qty: { ...prev.qty, [opt.id]: qtyVal > 0 ? 0 : 1 },
    }))
  }

  const handleQtyChange = (delta: number) => {
    setCalcState((prev) => ({
      ...prev,
      qty: {
        ...prev.qty,
        [opt.id]: clamp(
          toNumber(prev.qty[opt.id], 0) + delta,
          0,
          opt.max_qty || 99
        ),
      },
    }))
  }

  return (
    <div className="grid grid-cols-[28px_1fr_auto] items-center gap-2.5 border-b border-muted px-3.5 py-3 last:border-b-0">
      <div className="flex justify-center">
        {opt.type === "radio" ? (
          <input
            type="radio"
            name={`rg_${opt.group_id}`}
            checked={calcState.radio[opt.group_id] === opt.id}
            onChange={handleRadio}
            className="h-[18px] w-[18px] accent-primary"
          />
        ) : opt.type === "check" ? (
          <input
            type="checkbox"
            checked={!!calcState.checked[opt.id]}
            onChange={handleCheck}
            className="h-[18px] w-[18px] accent-primary"
          />
        ) : (
          <input
            type="checkbox"
            checked={qtyVal > 0}
            onChange={handleQtyCheck}
            className="h-[18px] w-[18px] accent-primary"
          />
        )}
      </div>

      <div>
        <div className="text-sm font-black text-foreground">{opt.name}</div>
        <div className="mt-0.5 text-xs font-bold text-muted-foreground">
          {"+"}
          {won(opt.price_delta)}
          {" / 원가 +"}
          {won(opt.cost_delta)}
        </div>
      </div>

      <div className="flex min-w-[120px] items-center justify-end">
        {opt.type === "check_qty" && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5">
            <button
              type="button"
              onClick={() => handleQtyChange(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-sm font-black text-foreground"
            >
              -
            </button>
            <span className="min-w-[22px] text-center text-sm font-black text-foreground">
              {qtyVal}
            </span>
            <button
              type="button"
              onClick={() => handleQtyChange(1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-sm font-black text-foreground"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
