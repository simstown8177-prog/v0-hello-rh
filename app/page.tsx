"use client"

import { useCallback, useEffect, useState } from "react"
import useSWR from "swr"
import type {
  Ingredient,
  Menu,
  Recipe,
  Option,
  Platform,
  OptionGroup,
  OptionMenuMap,
} from "@/lib/types"
import { DEFAULT_GROUPS } from "@/lib/types"
import type { CalcState } from "@/lib/calc"
import { calcAll, won } from "@/lib/calc"
import { TopBar } from "@/components/cost/top-bar"
import { MenuPicker } from "@/components/cost/menu-picker"
import { Controls } from "@/components/cost/controls"
import { SummaryCards } from "@/components/cost/summary-cards"
import { OptionSections } from "@/components/cost/option-sections"
import { OptionProfitTable } from "@/components/cost/option-profit-table"
import { AdminPage } from "@/components/cost/admin-page"
import { BottomBar } from "@/components/cost/bottom-bar"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function Home() {
  const { data, mutate } = useSWR("/api/data", fetcher, {
    revalidateOnFocus: false,
  })

  const [page, setPage] = useState<"menu" | "admin">("menu")
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [calcState, setCalcState] = useState<CalcState>({
    platformKey: "BAEMIN_DELIVERY",
    size: "M",
    coupon: 0,
    storeDeliveryExtra: 0,
    radio: {},
    checked: {},
    qty: {},
  })
  const [summaryOpen, setSummaryOpen] = useState(true)

  const ingredients: Ingredient[] = data?.ingredients ?? []
  const menus: Menu[] = data?.menus ?? []
  const recipes: Recipe[] = data?.recipes ?? []
  const options: Option[] = data?.options ?? []
  const platforms: Platform[] = data?.platforms ?? []
  const optionMenuMap: OptionMenuMap[] = data?.optionMenuMap ?? []
  const groups: OptionGroup[] = DEFAULT_GROUPS

  useEffect(() => {
    if (menus.length > 0 && !selectedMenuId) {
      setSelectedMenuId(menus[0].id)
    }
  }, [menus, selectedMenuId])

  useEffect(() => {
    const radioGroups = groups.filter((g) => g.kind === "radio")
    let changed = false
    const newRadio = { ...calcState.radio }

    for (const g of radioGroups) {
      const groupOptions = options.filter(
        (o) => o.group_id === g.id && o.enabled !== false && o.type === "radio"
      )
      if (!groupOptions.length) continue
      const cur = newRadio[g.id]
      if (!cur || !groupOptions.some((o) => o.id === cur)) {
        newRadio[g.id] = groupOptions[0].id
        changed = true
      }
    }

    if (changed) {
      setCalcState((prev) => ({ ...prev, radio: newRadio }))
    }
  }, [options, groups, calcState.radio])

  const selectedMenu =
    menus.find((m) => m.id === selectedMenuId) ?? menus[0] ?? null

  const result = calcAll(
    selectedMenu,
    calcState,
    platforms,
    options,
    recipes,
    ingredients,
    groups
  )

  const handleReset = useCallback(() => {
    setCalcState((prev) => ({
      ...prev,
      coupon: 0,
      storeDeliveryExtra: 0,
      radio: {},
      checked: {},
      qty: {},
    }))
  }, [])

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground font-sans font-semibold">
          데이터 로딩 중...
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-24 font-sans">
      <TopBar
        page={page}
        setPage={setPage}
        menuName={selectedMenu?.name ?? "원가 계산기"}
      />

      {page === "menu" ? (
        <div className="mx-auto max-w-[980px] px-3">
          <MenuPicker
            menus={menus}
            recipes={recipes}
            ingredients={ingredients}
            selectedMenuId={selectedMenuId}
            onSelectMenu={(id) => {
              setSelectedMenuId(id)
              setCalcState((prev) => ({
                ...prev,
                radio: {},
                checked: {},
                qty: {},
              }))
            }}
          />

          <Controls
            platforms={platforms}
            calcState={calcState}
            setCalcState={setCalcState}
            onReset={handleReset}
            selectedMenu={selectedMenu}
          />

          <SummaryCards
            result={result}
            open={summaryOpen}
            onToggle={() => setSummaryOpen(!summaryOpen)}
          />

          <OptionSections
            groups={groups}
            options={options}
            calcState={calcState}
            setCalcState={setCalcState}
            optionMenuMap={optionMenuMap}
            selectedMenuId={selectedMenuId}
          />

          <OptionProfitTable result={result} groups={groups} />

          <div className="mt-3 px-3 text-xs leading-relaxed text-muted-foreground font-semibold">
            <p>
              {"- 수수료는 "}
              <strong>{"쿠폰 적용된 실매출"}</strong>
              {" 기준으로 계산됨"}
            </p>
            <p>{"- 데이터는 Supabase DB에 저장됨 (모든 기기에서 공유)"}</p>
            <p>
              {"- 메뉴/레시피/단가/옵션은 관리자에서 설정 후 메뉴선택에서 바로 사용"}
            </p>
          </div>

          <BottomBar profit={won(result.profit)} />
        </div>
      ) : (
        <div className="mx-auto max-w-[980px] px-3">
          <AdminPage
            ingredients={ingredients}
            menus={menus}
            recipes={recipes}
            options={options}
            platforms={platforms}
            groups={groups}
            optionMenuMap={optionMenuMap}
            mutate={mutate}
          />
        </div>
      )}
    </main>
  )
}
