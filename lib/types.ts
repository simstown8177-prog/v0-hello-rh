export interface Ingredient {
  id: string
  name: string
  total_qty: number
  buy_price: number
}

export interface Menu {
  id: string
  name: string
  price_s: number
  price_m: number
  price_l: number
}

export interface Recipe {
  id: string
  menu_id: string
  size: "S" | "M" | "L"
  ingredient_name: string
  qty: number
}

export interface Option {
  id: string
  name: string
  group_id: string
  type: "radio" | "check" | "check_qty"
  price_delta: number
  cost_delta: number
  max_qty: number
  enabled: boolean
}

export interface Platform {
  id: string
  name: string
  platform_fee_rate: number
  card_fee_rate: number
  delivery_fee: number
}

export interface OptionGroup {
  id: string
  title: string
  subtitle: string
  kind: "radio" | "check_limit" | "check_qty"
  maxSelect?: number
}

export const DEFAULT_GROUPS: OptionGroup[] = [
  { id: "REVIEW1", title: "리뷰이벤트1", subtitle: "필수", kind: "radio" },
  { id: "REVIEW2", title: "리뷰이벤트2", subtitle: "필수", kind: "radio" },
  { id: "PICKLE", title: "피클선택(기본미제공)", subtitle: "필수", kind: "radio" },
  { id: "SAUCE_QTY", title: "소스 추가선택(기본미제공)", subtitle: "최대 4개", kind: "check_qty" },
  { id: "SAUCE_AMOUNT", title: "피자 소스양 선택", subtitle: "필수", kind: "radio" },
  { id: "DOUGH", title: "도우 선택", subtitle: "필수", kind: "radio" },
  { id: "EDGE", title: "엣지 선택", subtitle: "필수", kind: "radio" },
  { id: "TOPPING", title: "토핑 추가선택", subtitle: "최대 2개", kind: "check_limit", maxSelect: 2 },
  { id: "SIDE", title: "사이드메뉴 추가선택", subtitle: "최대 1개", kind: "check_limit", maxSelect: 1 },
  { id: "DRINK", title: "음료 추가선택", subtitle: "최대 1개", kind: "check_limit", maxSelect: 1 },
]
