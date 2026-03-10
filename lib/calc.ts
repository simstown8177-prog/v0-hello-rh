import type { Ingredient, Menu, Recipe, Option, Platform, OptionGroup } from "./types"

export function toNumber(v: unknown, fallback = 0): number {
  const n =
    typeof v === "number" ? v : Number(String(v).replace(/,/g, ""))
  return Number.isFinite(n) ? n : fallback
}

export function won(n: number): string {
  return Math.round(n).toLocaleString("ko-KR") + "원"
}

export function pct(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1) + "%"
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function unitPriceByName(
  name: string,
  ingredients: Ingredient[]
): number {
  const it = ingredients.find((x) => x.name === name)
  if (!it) return 0
  const total = toNumber(it.total_qty, 0)
  const buy = toNumber(it.buy_price, 0)
  return total > 0 ? buy / total : 0
}

export function calcRecipeCost(
  menu: Menu | null,
  size: "S" | "M" | "L" | "P",
  recipes: Recipe[],
  ingredients: Ingredient[]
): number {
  if (!menu) return 0
  const rows = recipes.filter(
    (r) => r.menu_id === menu.id && r.size === size
  )
  return rows.reduce(
    (s, r) => s + toNumber(r.qty, 0) * unitPriceByName(r.ingredient_name, ingredients),
    0
  )
}

export function getOptionsByGroup(
  groupId: string,
  options: Option[]
): Option[] {
  return options.filter((o) => o.group_id === groupId && o.enabled !== false)
}

export interface CalcState {
  platformKey: string
  size: "S" | "M" | "L" | "P"
  coupon: number
  storeDeliveryExtra: number
  radio: Record<string, string>
  checked: Record<string, boolean>
  qty: Record<string, number>
}

export interface CalcResult {
  basePrice: number
  baseCost: number
  optPrice: number
  optCost: number
  gross: number
  net: number
  totalCost: number
  platformFee: number
  cardFee: number
  delivery: number
  profit: number
  marginRate: number
  lines: { opt: Option; qty: number }[]
}

export function calcAll(
  menu: Menu | null,
  state: CalcState,
  platforms: Platform[],
  options: Option[],
  recipes: Recipe[],
  ingredients: Ingredient[],
  groups: OptionGroup[]
): CalcResult {
  const checkedIds = new Set(
    Object.entries(state.checked)
      .filter(([, isChecked]) => isChecked)
      .map(([id]) => id)
  )

  const basePrice = toNumber(
    menu
      ? state.size === "S"
        ? menu.price_s
        : state.size === "M"
          ? menu.price_m
          : state.size === "P"
            ? menu.price_p
            : menu.price_l
      : 0,
    0
  )
  const baseCost = calcRecipeCost(menu, state.size, recipes, ingredients)

  // Enforce limits
  for (const gid of ["TOPPING", "SIDE", "DRINK"]) {
    const g = groups.find((gr) => gr.id === gid)
    if (!g) continue
    const max = g.maxSelect || 99
    const inGroup = options.filter(
      (o) =>
        o.enabled !== false &&
        o.group_id === gid &&
        o.type === "check" &&
        checkedIds.has(o.id)
    )
    if (inGroup.length > max) {
      for (const o of inGroup.slice(max)) {
        checkedIds.delete(o.id)
      }
    }
  }

  // Get selected lines
  const lines: { opt: Option; qty: number }[] = []

  for (const gid of Object.keys(state.radio)) {
    const id = state.radio[gid]
    const opt = options.find((o) => o.id === id && o.enabled !== false)
    if (opt) lines.push({ opt, qty: 1 })
  }

  for (const id of checkedIds) {
    const opt = options.find((o) => o.id === id && o.enabled !== false)
    if (opt) lines.push({ opt, qty: 1 })
  }

  for (const id of Object.keys(state.qty)) {
    const opt = options.find((o) => o.id === id && o.enabled !== false)
    if (!opt) continue
    const q = clamp(toNumber(state.qty[id], 0), 0, opt.max_qty || 99)
    if (q > 0) lines.push({ opt, qty: q })
  }

  const optPrice = lines.reduce(
    (s, x) => s + toNumber(x.opt.price_delta, 0) * x.qty,
    0
  )
  const optCost = lines.reduce(
    (s, x) => s + toNumber(x.opt.cost_delta, 0) * x.qty,
    0
  )

  const gross = basePrice + optPrice
  const net = Math.max(0, gross - toNumber(state.coupon, 0))
  const totalCost = baseCost + optCost

  const p = platforms.find((pl) => pl.id === state.platformKey)
  const platformFee = net * toNumber(p?.platform_fee_rate, 0)
  const cardFee = net * toNumber(p?.card_fee_rate, 0)
  const delivery =
    toNumber(p?.delivery_fee, 0) + toNumber(state.storeDeliveryExtra, 0)

  const profit = net - platformFee - cardFee - delivery - totalCost
  const marginRate = net > 0 ? (profit / net) * 100 : 0

  return {
    basePrice,
    baseCost,
    optPrice,
    optCost,
    gross,
    net,
    totalCost,
    platformFee,
    cardFee,
    delivery,
    profit,
    marginRate,
    lines,
  }
}
