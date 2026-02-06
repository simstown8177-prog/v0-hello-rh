"use client"

import React from "react"

import { useRef, useState } from "react"
import type {
  Ingredient,
  Menu,
  Recipe,
  Option,
  Platform,
  OptionGroup,
  Category,
} from "@/lib/types"
import { CATEGORIES } from "@/lib/types"
import { toNumber, won, calcRecipeCost } from "@/lib/calc"
import type { KeyedMutator } from "swr"
import readXlsxFile from "read-excel-file"

type Tab = "menus" | "platform" | "options" | "ingredients"

interface AdminPageProps {
  ingredients: Ingredient[]
  menus: Menu[]
  recipes: Recipe[]
  options: Option[]
  platforms: Platform[]
  groups: OptionGroup[]
  mutate: KeyedMutator<unknown>
}

async function apiPost(action: string, payload: Record<string, unknown>) {
  const res = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  })
  return res.json()
}

/** Normalize column keys: try English then Korean */
function col(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return row[k]
  }
  return undefined
}

/** Find a matching sheet name from a list of alternatives */
function findSheetName(sheetNames: string[], aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const found = sheetNames.find(
      (sn) => sn.toLowerCase().replace(/\s/g, "") === alias.toLowerCase().replace(/\s/g, "")
    )
    if (found) return found
  }
  return undefined
}

/** Parse a sheet (array of row arrays) into Record objects using the first row as headers */
function sheetToRecords(rows: (string | number | boolean | null | Date)[][]): Record<string, unknown>[] {
  if (rows.length < 2) return []
  const headers = rows[0].map((h) => String(h ?? "").trim())
  return rows.slice(1).map((row) => {
    const obj: Record<string, unknown> = {}
    for (let i = 0; i < headers.length; i++) {
      if (headers[i]) obj[headers[i]] = row[i]
    }
    return obj
  })
}

/** Download sample Excel template as CSV (one file per sheet concept) */
function downloadSampleExcel() {
  const content = `=== 원가계산기 엑셀 양식 안내 ===

엑셀 파일(.xlsx)을 만들어주세요. 시트 4개를 각각 아래 이름으로 만들고, 첫 행에 컬럼명을 넣으세요.

---
[시트1: Menus]
menu,category,size,price
페퍼로니 피자,피자,S,15000
페퍼로니 피자,피자,M,18000
페퍼로니 피자,피자,L,22000
마르게리타 피자,피자,S,14000
마르게리타 피자,피자,M,17000
마르게리타 피자,피자,L,21000
1인 불고기 피자,1인피자,S,9000
패밀리 세트A,세트메뉴,S,35000
치즈스틱,사이드,P,5000
감자튀김,사이드,P,4000
콜라 500ml,음료,P,2000

---
[시트2: Ingredients]
name,totalQty,buyPrice
도우,1000,12000
모짜렐라,1000,15000
페퍼로니,500,8000
토마토소스,2000,6000

---
[시트3: Recipes]
menu,size,ingredient,qty
페퍼로니 피자,S,도우,200
페퍼로니 피자,S,모짜렐라,100
페퍼로니 피자,S,페퍼로니,50
페퍼로니 피자,S,토마토소스,80

---
[시트4: Options]
name,groupId,type,priceDelta,costDelta,maxQty,enabled
치즈추가,TOPPING,check,2000,800,1,true
페퍼로니추가,TOPPING,check,1500,500,1,true
ICE,TEMP,radio,0,0,1,true
HOT,TEMP,radio,0,0,1,true
`
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "원가계산기_양식안내.txt"
  a.click()
  URL.revokeObjectURL(url)
}

export function AdminPage({
  ingredients,
  menus,
  recipes,
  options,
  platforms,
  groups,
  mutate,
}: AdminPageProps) {
  const [tab, setTab] = useState<Tab>("menus")
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)

    try {
      // Get all sheet names using dynamic import
      const readModule = await import("read-excel-file")
      const getSheetNames = readModule.getSheetNames || readModule.default?.getSheetNames
      const readFile = readModule.default || readModule

      let sheetNames: string[] = []
      try {
        if (getSheetNames) {
          sheetNames = await getSheetNames(f)
        }
      } catch (sheetErr) {
        console.log("[v0] getSheetNames failed, trying fallback:", sheetErr)
      }

      // If getSheetNames failed or returned empty, try common sheet names directly
      if (sheetNames.length === 0) {
        sheetNames = ["Sheet1", "Sheet2", "Sheet3", "Sheet4", "Menus", "Ingredients", "Recipes", "Options", "메뉴", "재료", "레시피", "옵션"]
      }

      console.log("[v0] Sheet names found:", sheetNames)

      const newMenus: Menu[] = []
      const newRecipes: Recipe[] = []
      const newIngredients: Ingredient[] = []
      const newOptions: Option[] = []

      // Helper to safely read a sheet
      async function safeReadSheet(file: File, sheetNameOrIndex: string | number) {
        try {
          const rawRows = await readFile(file, { sheet: sheetNameOrIndex })
          return sheetToRecords(rawRows as (string | number | boolean | null | Date)[][])
        } catch {
          return []
        }
      }

      // Try to find and read Menus sheet
      let menuRows: Record<string, unknown>[] = []
      const menuSheetName = findSheetName(sheetNames, ["Menus", "메뉴", "Menu", "메뉴설정"])
      if (menuSheetName) {
        menuRows = await safeReadSheet(f, menuSheetName)
      }
      // Fallback: try reading first sheet if no named sheet found
      if (menuRows.length === 0) {
        const firstSheetRows = await safeReadSheet(f, 1)
        // Check if first sheet looks like a menus sheet
        if (firstSheetRows.length > 0) {
          const firstRow = firstSheetRows[0]
          const hasMenuCol = col(firstRow, ["menu", "메뉴", "메뉴명", "name", "이름"]) !== undefined
          if (hasMenuCol) menuRows = firstSheetRows
        }
      }
      console.log("[v0] Menu rows found:", menuRows.length)
      if (menuRows.length > 0) {
        const map = new Map<string, Menu>()
        for (const r of menuRows) {
          const menuName = String(col(r, ["menu", "메뉴", "메뉴명", "name", "이름"]) ?? "").trim()
          const category = String(col(r, ["category", "카테고리", "분류", "Category"]) ?? "전���").trim()
          const size = String(col(r, ["size", "사이즈", "SIZE"]) ?? "").trim().toUpperCase()
          const price = toNumber(col(r, ["price", "판매가", "가격", "Price"]), 0)
          if (!menuName || !["S", "M", "L", "P"].includes(size)) continue

          if (!map.has(menuName)) {
            map.set(menuName, {
              id: crypto.randomUUID(),
              name: menuName,
              category: category as Menu["category"],
              price_s: 0,
              price_m: 0,
              price_l: 0,
              price_p: 0,
            })
          }
          const m = map.get(menuName)!
          if (size === "S") m.price_s = price
          if (size === "M") m.price_m = price
          if (size === "L") m.price_l = price
          if (size === "P") m.price_p = price
        }
        newMenus.push(...map.values())
      }

      // Ingredients sheet
      const ingSheetName = findSheetName(sheetNames, ["Ingredients", "재료", "단가", "재료단가", "Ingredient"])
      let ingRows: Record<string, unknown>[] = []
      if (ingSheetName) {
        ingRows = await safeReadSheet(f, ingSheetName)
      }
      if (ingRows.length === 0) {
        const sheet2Rows = await safeReadSheet(f, 2)
        if (sheet2Rows.length > 0 && col(sheet2Rows[0], ["name", "재료명", "이름", "재료", "Name"]) !== undefined) {
          ingRows = sheet2Rows
        }
      }
      console.log("[v0] Ingredient rows found:", ingRows.length)
      for (const r of ingRows) {
          const name = String(col(r, ["name", "재료명", "이름", "재료", "Name"]) ?? "").trim()
          if (!name) continue
          newIngredients.push({
            id: crypto.randomUUID(),
            name,
            total_qty: toNumber(col(r, ["totalQty", "총용량", "total_qty", "용량", "TotalQty"]), 0),
            buy_price: toNumber(col(r, ["buyPrice", "구매가", "buy_price", "가격", "BuyPrice"]), 0),
          })
      }

      // Recipes sheet
      const recipeSheetName = findSheetName(sheetNames, ["Recipes", "레시피", "Recipe", "레시피설정"])
      let recipeRows: Record<string, unknown>[] = []
      if (recipeSheetName) {
        recipeRows = await safeReadSheet(f, recipeSheetName)
      }
      if (recipeRows.length === 0) {
        const sheet3Rows = await safeReadSheet(f, 3)
        if (sheet3Rows.length > 0 && col(sheet3Rows[0], ["menu", "메뉴", "메뉴명"]) !== undefined) {
          recipeRows = sheet3Rows
        }
      }
      console.log("[v0] Recipe rows found:", recipeRows.length)
      for (const r of recipeRows) {
          const menuName = String(col(r, ["menu", "메뉴", "메뉴명"]) ?? "").trim()
          const size = String(col(r, ["size", "사이즈", "SIZE"]) ?? "").trim().toUpperCase()
          const ing = String(col(r, ["ingredient", "재료", "재료명"]) ?? "").trim()
          const qty = toNumber(col(r, ["qty", "수량", "용량", "Qty"]), 0)
          if (!menuName || !["S", "M", "L", "P"].includes(size) || !ing) continue

          const menu = newMenus.find((m) => m.name === menuName)
          if (!menu) continue

          newRecipes.push({
            id: crypto.randomUUID(),
            menu_id: menu.id,
            size: size as "S" | "M" | "L" | "P",
            ingredient_name: ing,
            qty,
          })
      }

      // Options sheet
      const optSheetName = findSheetName(sheetNames, ["Options", "옵션", "Option", "옵션설정"])
      let optRows: Record<string, unknown>[] = []
      if (optSheetName) {
        optRows = await safeReadSheet(f, optSheetName)
      }
      if (optRows.length === 0) {
        const sheet4Rows = await safeReadSheet(f, 4)
        if (sheet4Rows.length > 0 && col(sheet4Rows[0], ["name", "옵션명", "이름", "Name"]) !== undefined) {
          optRows = sheet4Rows
        }
      }
      console.log("[v0] Option rows found:", optRows.length)
      for (const r of optRows) {
          const name = String(col(r, ["name", "옵션명", "이름", "Name"]) ?? "").trim()
          const groupId = String(col(r, ["groupId", "그룹", "group_id", "그룹ID", "GroupId"]) ?? "").trim()
          if (!name || !groupId) continue
          newOptions.push({
            id: crypto.randomUUID(),
            name,
            group_id: groupId,
            type: (String(col(r, ["type", "타입", "Type"]) ?? "check").trim() as Option["type"]) || "check",
            price_delta: toNumber(col(r, ["priceDelta", "판매가", "price_delta", "PriceDelta"]), 0),
            cost_delta: toNumber(col(r, ["costDelta", "원가", "cost_delta", "CostDelta"]), 0),
            max_qty: toNumber(col(r, ["maxQty", "최대수량", "max_qty", "MaxQty"]), 4),
            enabled: (() => {
              const v = col(r, ["enabled", "활성", "사용", "Enabled"])
              return v !== false && v !== 0 && String(v) !== "false" && String(v) !== "0"
            })(),
          })
      }

      if (newMenus.length === 0 && newIngredients.length === 0 && newOptions.length === 0) {
        const sheetList = sheetNames.join(", ")
        alert(
          `업로드할 유효한 데이터가 없습니다.\n\n` +
          `현재 엑셀 시트: ${sheetList}\n\n` +
          `필요한 시트명: Menus(메뉴), Ingredients(재료), Recipes(레시피), Options(옵션)\n\n` +
          `"양식 안내 다운로드" 버튼으로 올바른 형식을 확인하세요.`
        )
        return
      }

      await apiPost("upsert_all", {
        ingredients: newIngredients.length ? newIngredients : ingredients,
        menus: newMenus.length ? newMenus : menus,
        recipes: newRecipes,
        options: newOptions.length ? newOptions : options,
      })

      await mutate()
      alert("엑셀 업로드 완료! DB에 저장되었습니다.")
    } catch (err) {
      console.error("[v0] Excel upload error:", err)
      const msg = err instanceof Error ? err.message : String(err)
      alert(`엑셀 업로드 실패:\n${msg}\n\n.xlsx 형식인지, 시트명/컬럼명이 올바른지 확인하세요.`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-card shadow-sm">
      {/* Excel upload area */}
      <div className="m-3 rounded-xl border border-border bg-muted/50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-black text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {uploading ? "업로드 중..." : "엑셀 업로드 (.xlsx)"}
          </button>
          <button
            type="button"
            onClick={downloadSampleExcel}
            className="rounded-xl border border-primary/30 bg-accent px-3 py-2.5 text-sm font-black text-accent-foreground transition-colors hover:bg-accent/80"
          >
            양식 안내 다운로드
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="hidden"
          />
          <span className="text-xs font-bold text-muted-foreground">
            {"시트명: Menus / Ingredients / Recipes / Options (한글도 가능)"}
          </span>
        </div>
        <div className="mt-2.5 text-xs leading-relaxed text-muted-foreground font-bold">
          <p>
            {"* 시트명: "}
            <strong className="text-foreground">Menus</strong>
            {"(메뉴), "}
            <strong className="text-foreground">Ingredients</strong>
            {"(재료/단가), "}
            <strong className="text-foreground">Recipes</strong>
            {"(레시피), "}
            <strong className="text-foreground">Options</strong>
            {"(옵션)"}
          </p>
          <p>
            {"* 컬럼명은 영문/한글 모두 지원 (예: menu/메뉴, price/판매가, name/재료명)"}
          </p>
          <p>
            {"* 처음이면 \"양식 안내 다운로드\"를 눌러서 정확한 양식을 확인하세요"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 px-3">
        {(
          [
            ["menus", "메뉴 설정"],
            ["platform", "플랫폼 설정"],
            ["options", "옵션 설정"],
            ["ingredients", "단가 수정"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full border px-3 py-2 text-sm font-black transition-colors ${
              tab === key
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-3">
        {tab === "menus" && (
          <AdminMenus
            menus={menus}
            recipes={recipes}
            ingredients={ingredients}
            mutate={mutate}
          />
        )}
        {tab === "platform" && (
          <AdminPlatforms platforms={platforms} mutate={mutate} />
        )}
        {tab === "options" && (
          <AdminOptions options={options} groups={groups} mutate={mutate} />
        )}
        {tab === "ingredients" && (
          <AdminIngredients ingredients={ingredients} mutate={mutate} />
        )}
      </div>
    </div>
  )
}

/* ========== Admin Menus ========== */
function AdminMenus({
  menus,
  recipes,
  ingredients,
  mutate,
}: {
  menus: Menu[]
  recipes: Recipe[]
  ingredients: Ingredient[]
  mutate: KeyedMutator<unknown>
}) {
  const [localMenus, setLocalMenus] = useState<Menu[]>(menus)
  const [localRecipes, setLocalRecipes] = useState<Recipe[]>(recipes)
  const [saving, setSaving] = useState(false)

  // Sync with parent data when it changes
  const menusKey = menus.map((m) => m.id).join(",")
  const [prevKey, setPrevKey] = useState(menusKey)
  if (menusKey !== prevKey) {
    setLocalMenus(menus)
    setLocalRecipes(recipes)
    setPrevKey(menusKey)
  }

  const addMenu = () => {
    const name = prompt("메뉴명")
    if (!name) return
    const catChoices = CATEGORIES.filter((c) => c !== "전체")
    const catInput = prompt(`카테고리를 선택하세요:\n${catChoices.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\n번호 입력 (미입력 시 "전체")`)
    const catIdx = catInput ? Number.parseInt(catInput, 10) - 1 : -1
    const category = catIdx >= 0 && catIdx < catChoices.length ? catChoices[catIdx] : "전체"
    setLocalMenus((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        category: category as Menu["category"],
        price_s: 0,
        price_m: 0,
        price_l: 0,
        price_p: 0,
      },
    ])
  }

  const deleteMenu = (id: string) => {
    if (!confirm("이 메뉴를 삭제할까요? (레시피 포함)")) return
    setLocalMenus((prev) => prev.filter((m) => m.id !== id))
    setLocalRecipes((prev) => prev.filter((r) => r.menu_id !== id))
  }

  const updateMenu = (id: string, field: string, value: unknown) => {
    setLocalMenus((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    )
  }

  // Bulk category selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState<string>("피자")

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === localMenus.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(localMenus.map((m) => m.id)))
    }
  }

  const applyBulkCategory = () => {
    if (selectedIds.size === 0) {
      alert("먼저 메뉴를 선택하세요.")
      return
    }
    setLocalMenus((prev) =>
      prev.map((m) =>
        selectedIds.has(m.id) ? { ...m, category: bulkCategory as Menu["category"] } : m
      )
    )
    setSelectedIds(new Set())
    alert(`${selectedIds.size}개 메뉴의 카테고리를 "${bulkCategory}"(으)로 변경했습니다. "DB에 저장"을 눌러 반영하세요.`)
  }

  const save = async () => {
    setSaving(true)
    await apiPost("save_menus", { menus: localMenus, recipes: localRecipes })
    await mutate()
    setSaving(false)
    alert("메뉴 저장 완료!")
  }

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addMenu}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-black text-foreground hover:bg-muted"
        >
          + 메뉴 추가
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl border border-primary bg-primary px-3 py-2.5 text-sm font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "DB에 저장"}
        </button>
        <span className="text-xs font-bold text-muted-foreground">
          {"* 판매가는 수기, 원가는 레시피/단가로 자동 계산"}
        </span>
      </div>

      {/* Bulk category assignment */}
      <div className="mb-3 rounded-2xl border border-dashed border-primary/40 bg-accent/30 p-3">
        <div className="mb-2 text-xs font-black text-foreground">일괄 카테고리 변경</div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            {selectedIds.size === localMenus.length ? "전체 해제" : "전체 선택"}
          </button>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground outline-none"
          >
            {CATEGORIES.filter((c) => c !== "전체").map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyBulkCategory}
            className="rounded-lg border border-primary bg-primary px-2.5 py-1.5 text-xs font-black text-primary-foreground hover:bg-primary/90"
          >
            선택 메뉴에 적용 ({selectedIds.size}개)
          </button>
          <span className="text-[10px] font-bold text-muted-foreground">
            {"메뉴 왼쪽 체크박스로 선택 후 카테고리를 일괄 변경할 수 있습니다"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {localMenus.map((m) => {
          const isSideOrDrink = m.category === "사이드" || m.category === "음료"

          return (
            <div
              key={m.id}
              className="rounded-2xl border border-border bg-background p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(m.id)}
                  onChange={() => toggleSelect(m.id)}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-foreground">
                      {m.name}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                      {m.category || "전체"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-bold text-muted-foreground">
                    {isSideOrDrink ? (
                      <>
                        {"원가(P): "}
                        {won(calcRecipeCost(m, "P", localRecipes, ingredients))}
                      </>
                    ) : (
                      <>
                        {"원가(S/M/L): "}
                        {won(calcRecipeCost(m, "S", localRecipes, ingredients))}
                        {" / "}
                        {won(calcRecipeCost(m, "M", localRecipes, ingredients))}
                        {" / "}
                        {won(calcRecipeCost(m, "L", localRecipes, ingredients))}
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteMenu(m.id)}
                  className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-black text-destructive hover:bg-destructive/10"
                >
                  메뉴삭제
                </button>
              </div>

              <div className={`mt-2.5 grid grid-cols-2 gap-2.5 md:grid-cols-3 ${isSideOrDrink ? "lg:grid-cols-3" : "lg:grid-cols-5"}`}>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
                    메뉴명
                  </label>
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => updateMenu(m.id, "name", e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
                    카테고리
                  </label>
                  <select
                    value={m.category || "전체"}
                    onChange={(e) => updateMenu(m.id, "category", e.target.value as Category)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== "전체").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="전체">전체 (미분류)</option>
                  </select>
                </div>
                {(isSideOrDrink ? ["P"] as const : ["S", "M", "L"] as const).map((size) => (
                  <div key={size}>
                    <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
                      {size === "P" ? "P(개수)" : size}
                      {" 판매가"}
                    </label>
                    <input
                      type="number"
                      value={
                        size === "S"
                          ? m.price_s
                          : size === "M"
                            ? m.price_m
                            : size === "P"
                              ? m.price_p
                              : m.price_l
                      }
                      onChange={(e) =>
                        updateMenu(
                          m.id,
                          `price_${size.toLowerCase()}`,
                          toNumber(e.target.value, 0)
                        )
                      }
                      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ========== Admin Platforms ========== */
function AdminPlatforms({
  platforms,
  mutate,
}: {
  platforms: Platform[]
  mutate: KeyedMutator<unknown>
}) {
  const [local, setLocal] = useState(platforms)
  const [saving, setSaving] = useState(false)

  const platKey = platforms.map((p) => p.id).join(",")
  const [prevKey, setPrevKey] = useState(platKey)
  if (platKey !== prevKey) {
    setLocal(platforms)
    setPrevKey(platKey)
  }

  const update = (id: string, field: string, value: number) => {
    setLocal((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  const save = async () => {
    setSaving(true)
    await apiPost("save_platforms", { platforms: local })
    await mutate()
    setSaving(false)
    alert("플랫폼 설정 저장 완료!")
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl border border-primary bg-primary px-3 py-2.5 text-sm font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "DB에 저장"}
        </button>
        <span className="text-xs font-bold text-muted-foreground">
          {"* 플랫폼별 수수료/배달비를 여기서 관리"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {local.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-border bg-background p-3"
          >
            <div className="mb-2 text-sm font-black text-foreground">
              {p.name}
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">
                  {"플��폼 수수료율"}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={p.platform_fee_rate}
                  onChange={(e) =>
                    update(p.id, "platform_fee_rate", toNumber(e.target.value, 0))
                  }
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">
                  {"카드 수수료율"}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={p.card_fee_rate}
                  onChange={(e) =>
                    update(p.id, "card_fee_rate", toNumber(e.target.value, 0))
                  }
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">
                  {"기본 배달비"}
                </label>
                <input
                  type="number"
                  value={p.delivery_fee}
                  onChange={(e) =>
                    update(p.id, "delivery_fee", toNumber(e.target.value, 0))
                  }
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ========== Admin Ingredients ========== */
function AdminIngredients({
  ingredients,
  mutate,
}: {
  ingredients: Ingredient[]
  mutate: KeyedMutator<unknown>
}) {
  const [local, setLocal] = useState(ingredients)
  const [saving, setSaving] = useState(false)

  const ingKey = ingredients.map((i) => i.id).join(",")
  const [prevKey, setPrevKey] = useState(ingKey)
  if (ingKey !== prevKey) {
    setLocal(ingredients)
    setPrevKey(ingKey)
  }

  const add = () => {
    setLocal((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", total_qty: 0, buy_price: 0 },
    ])
  }

  const remove = (id: string) => {
    if (!confirm("이 재료를 삭제할까요?")) return
    setLocal((prev) => prev.filter((i) => i.id !== id))
  }

  const update = (id: string, field: string, value: unknown) => {
    setLocal((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    )
  }

  const save = async () => {
    setSaving(true)
    await apiPost("save_ingredients", { ingredients: local })
    await mutate()
    setSaving(false)
    alert("단가 저장 완료!")
  }

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={add}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-black text-foreground hover:bg-muted"
        >
          + 재료 추가
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl border border-primary bg-primary px-3 py-2.5 text-sm font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "DB에 저장"}
        </button>
        <span className="text-xs font-bold text-muted-foreground">
          {"재료명 / 총 용량(g/p) / 구매가 -> g단가 자동"}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-muted/50 p-3">
        <div className="mb-2 grid grid-cols-[1.3fr_.8fr_.8fr_.8fr_auto] gap-2 text-xs font-black text-muted-foreground">
          <div>재료명</div>
          <div>총 용량</div>
          <div>구매가</div>
          <div>{"g/p 단가"}</div>
          <div />
        </div>
        {local.map((it) => {
          const unit =
            toNumber(it.total_qty, 0) > 0
              ? toNumber(it.buy_price, 0) / toNumber(it.total_qty, 0)
              : 0

          return (
            <div
              key={it.id}
              className="mt-2 grid grid-cols-[1.3fr_.8fr_.8fr_.8fr_auto] items-center gap-2"
            >
              <input
                type="text"
                value={it.name}
                placeholder="예: 모짜렐라"
                onChange={(e) => update(it.id, "name", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
              />
              <input
                type="number"
                value={it.total_qty}
                onChange={(e) =>
                  update(it.id, "total_qty", toNumber(e.target.value, 0))
                }
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
              />
              <input
                type="number"
                value={it.buy_price}
                onChange={(e) =>
                  update(it.id, "buy_price", toNumber(e.target.value, 0))
                }
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
              />
              <input
                type="text"
                value={unit ? unit.toFixed(2) : "0"}
                disabled
                className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm font-bold text-muted-foreground outline-none"
              />
              <button
                type="button"
                onClick={() => remove(it.id)}
                className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-black text-destructive hover:bg-destructive/10"
              >
                삭제
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ========== Admin Options ========== */
function AdminOptions({
  options,
  groups,
  mutate,
}: {
  options: Option[]
  groups: OptionGroup[]
  mutate: KeyedMutator<unknown>
}) {
  const [local, setLocal] = useState(options)
  const [saving, setSaving] = useState(false)

  const optKey = options.map((o) => o.id).join(",")
  const [prevKey, setPrevKey] = useState(optKey)
  if (optKey !== prevKey) {
    setLocal(options)
    setPrevKey(optKey)
  }

  const groupIds = groups.map((g) => g.id)

  const add = () => {
    setLocal((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        group_id: "TOPPING",
        type: "check" as const,
        name: "새 옵션",
        price_delta: 0,
        cost_delta: 0,
        max_qty: 4,
        enabled: true,
      },
    ])
  }

  const remove = (id: string) => {
    if (!confirm("이 옵션을 삭제할까요?")) return
    setLocal((prev) => prev.filter((o) => o.id !== id))
  }

  const update = (id: string, field: string, value: unknown) => {
    setLocal((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    )
  }

  const save = async () => {
    setSaving(true)
    await apiPost("save_options", { options: local })
    await mutate()
    setSaving(false)
    alert("옵션 저장 완료!")
  }

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={add}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-black text-foreground hover:bg-muted"
        >
          + 옵션 추가
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl border border-primary bg-primary px-3 py-2.5 text-sm font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "DB에 ��장"}
        </button>
        <span className="text-xs font-bold text-muted-foreground">
          {"옵션명/그룹/타입/판매가/원가를 관리"}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-muted/50 p-3 overflow-x-auto">
        <div className="mb-2 grid min-w-[700px] grid-cols-[1.3fr_1fr_.8fr_.8fr_.8fr_.6fr_.5fr_auto] gap-2 text-xs font-black text-muted-foreground">
          <div>옵션명</div>
          <div>그룹</div>
          <div>타입</div>
          <div>판매가</div>
          <div>원가</div>
          <div>최대수량</div>
          <div>ON</div>
          <div />
        </div>

        {local.map((o) => (
          <div
            key={o.id}
            className="mt-2 grid min-w-[700px] grid-cols-[1.3fr_1fr_.8fr_.8fr_.8fr_.6fr_.5fr_auto] items-center gap-2"
          >
            <input
              type="text"
              value={o.name}
              onChange={(e) => update(o.id, "name", e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
            />
            <select
              value={o.group_id}
              onChange={(e) => update(o.id, "group_id", e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
            >
              {groupIds.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <select
              value={o.type}
              onChange={(e) => update(o.id, "type", e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
            >
              <option value="radio">radio</option>
              <option value="check">check</option>
              <option value="check_qty">qty</option>
            </select>
            <input
              type="number"
              value={o.price_delta}
              onChange={(e) =>
                update(o.id, "price_delta", toNumber(e.target.value, 0))
              }
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
            />
            <input
              type="number"
              value={o.cost_delta}
              onChange={(e) =>
                update(o.id, "cost_delta", toNumber(e.target.value, 0))
              }
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
            />
            <input
              type="number"
              value={o.max_qty}
              onChange={(e) =>
                update(o.id, "max_qty", toNumber(e.target.value, 4))
              }
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground outline-none"
            />
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={o.enabled}
                onChange={(e) => update(o.id, "enabled", e.target.checked)}
                className="h-[18px] w-[18px] accent-primary"
              />
            </div>
            <button
              type="button"
              onClick={() => remove(o.id)}
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-black text-destructive hover:bg-destructive/10"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
