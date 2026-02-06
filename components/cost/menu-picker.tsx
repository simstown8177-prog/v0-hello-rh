"use client"

import { useRef, useState } from "react"
import type { Menu, Recipe, Ingredient, Category } from "@/lib/types"
import { CATEGORIES } from "@/lib/types"
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
  const [activeCategory, setActiveCategory] = useState<Category>("전체")
  const catScrollRef = useRef<HTMLDivElement>(null)

  const filtered = menus.filter((m) => {
    if (activeCategory !== "전체" && m.category !== activeCategory) return false
    if (!search.trim()) return true
    const q = search.trim()
    if (m.name.includes(q)) return true
    return Array.from(q).some((ch) => m.name.includes(ch))
  })

  return (
    <div className="mt-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      {/* Category slider */}
      <div
        ref={catScrollRef}
        className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin"
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat === activeCategory
          const count =
            cat === "전체"
              ? menus.length
              : menus.filter((m) => m.category === cat).length
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`snap-start flex-shrink-0 rounded-full px-4 py-2 text-sm font-black transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {cat}
              <span
                className={`ml-1.5 text-xs ${
                  isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
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

      {/* Menu cards */}
      <div className="mt-2.5 flex gap-2.5 overflow-x-auto pb-1.5 snap-x snap-mandatory scrollbar-thin">
        {filtered.map((m) => {
          const isSideOrDrink = m.category === "사이드" || m.category === "음료"
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-foreground">{m.name}</span>
                {m.category !== "전체" && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black text-muted-foreground">
                    {m.category}
                  </span>
                )}
              </div>
              <div className="mt-1.5 text-xs font-bold leading-relaxed text-muted-foreground">
                {isSideOrDrink ? (
                  <>
                    {"P(개수) "}
                    {won(m.price_p)}
                    {" / 원가 "}
                    {won(calcRecipeCost(m, "P", recipes, ingredients))}
                  </>
                ) : (
                  <>
                    {"S "}
                    {won(m.price_s)}
                    {" / 원가 "}
                    {won(calcRecipeCost(m, "S", recipes, ingredients))}
                    <br />
                    {"M "}
                    {won(m.price_m)}
                    {" / 원가 "}
                    {won(calcRecipeCost(m, "M", recipes, ingredients))}
                    <br />
                    {"L "}
                    {won(m.price_l)}
                    {" / 원가 "}
                    {won(calcRecipeCost(m, "L", recipes, ingredients))}
                  </>
                )}
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
