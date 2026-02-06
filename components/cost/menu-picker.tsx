"use client"

import { useState } from "react"
import type { Menu, Recipe, Ingredient } from "@/lib/types"
import { calcRecipeCost, won } from "@/lib/calc"

interface MenuPickerProps {
  menus: Menu[]
  recipes: Recipe[]
  ingredients: Ingredient[]
  selectedMenuId: string | null
  onSelectMenu: (id: string) => void
}

export function MenuPicker({
  menus,
  recipes,
  ingredients,
  selectedMenuId,
  onSelectMenu,
}: MenuPickerProps) {
  const [search, setSearch] = useState("")

  const filtered = menus.filter((m) => {
    if (!search.trim()) return true
    const q = search.trim()
    if (m.name.includes(q)) return true
    return Array.from(q).some((ch) => m.name.includes(ch))
  })

  return (
    <div className="mt-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="메뉴 검색 (한 글자만 일치해도 OK)"
          className="min-w-[180px] flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
        />
        <span className="text-xs font-bold text-muted-foreground">
          {"총 "}
          {menus.length}
          {"개 / 검색결과 "}
          {filtered.length}
          {"개"}
        </span>
      </div>

      <div className="mt-2.5 flex gap-2.5 overflow-x-auto pb-1.5 snap-x snap-mandatory scrollbar-thin">
        {filtered.map((m) => {
          const sCost = calcRecipeCost(m, "S", recipes, ingredients)
          const mCost = calcRecipeCost(m, "M", recipes, ingredients)
          const lCost = calcRecipeCost(m, "L", recipes, ingredients)
          const isSelected = m.id === selectedMenuId

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectMenu(m.id)}
              className={`min-w-[220px] max-w-[260px] flex-shrink-0 snap-start rounded-2xl border p-3 text-left shadow-sm transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="text-sm font-black text-foreground">{m.name}</div>
              <div className="mt-1.5 text-xs font-bold leading-relaxed text-muted-foreground">
                {"S "}
                {won(m.price_s)}
                {" / 원가 "}
                {won(sCost)}
                <br />
                {"M "}
                {won(m.price_m)}
                {" / 원가 "}
                {won(mCost)}
                <br />
                {"L "}
                {won(m.price_l)}
                {" / 원가 "}
                {won(lCost)}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span
                  className={`rounded-full border px-2 py-1 text-[11px] font-black ${
                    isSelected
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  선택
                </span>
                <span className="rounded-full border border-border bg-card px-2 py-1 text-[11px] font-black text-foreground">
                  레시피 연동
                </span>
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div className="py-6 text-center text-sm font-bold text-muted-foreground w-full">
            {"검색 결과가 없습니다. 관리자에서 메뉴를 추가하세요."}
          </div>
        )}
      </div>
    </div>
  )
}
