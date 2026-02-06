"use client"

interface TopBarProps {
  page: "menu" | "admin"
  setPage: (p: "menu" | "admin") => void
  menuName: string
}

export function TopBar({ page, setPage, menuName }: TopBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-background/85 backdrop-blur-md backdrop-saturate-150 pb-3 pt-2.5">
      <div className="mx-auto max-w-[980px] px-3">
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2.5 p-3">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-black text-foreground">
                {menuName}
              </h1>
              <p className="text-xs font-bold text-muted-foreground">
                {"메뉴/레시피/단가/옵션/플랫폼까지 한 번에"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPage("menu")}
              className={`whitespace-nowrap rounded-full border px-3 py-2 text-sm font-black transition-colors ${
                page === "menu"
                  ? "border-foreground bg-foreground text-background"
                  : "border-primary/30 bg-primary/5 text-primary"
              }`}
            >
              메뉴선택
            </button>
            <button
              type="button"
              onClick={() => setPage("admin")}
              className={`whitespace-nowrap rounded-full border px-3 py-2 text-sm font-black transition-colors ${
                page === "admin"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground"
              }`}
            >
              관리자
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
