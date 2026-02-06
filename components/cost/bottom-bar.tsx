"use client"

interface Props {
  profit: string
}

export function BottomBar({ profit }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-border/80 bg-background/92 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex max-w-[980px] items-center gap-2.5 px-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-xs font-bold text-muted-foreground">
            {"옵션 선택 -> 자동 계산"}
          </span>
        </div>
        <div className="ml-auto min-w-[220px] rounded-2xl bg-primary px-4 py-3.5 text-right shadow-lg shadow-primary/20">
          <small className="block text-[11px] font-black text-primary-foreground/75">
            현재 실마진
          </small>
          <strong className="block text-lg font-black text-primary-foreground">
            {profit}
          </strong>
        </div>
      </div>
    </div>
  )
}
