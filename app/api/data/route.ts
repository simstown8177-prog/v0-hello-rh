import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  const [ingredientsRes, menusRes, recipesRes, optionsRes, platformsRes, optionMenuMapRes] =
    await Promise.all([
      supabase.from("ingredients").select("*").order("created_at"),
      supabase.from("menus").select("*").order("created_at"),
      supabase.from("recipes").select("*").order("created_at"),
      supabase.from("options").select("*").order("created_at"),
      supabase.from("platforms").select("*").order("created_at"),
      supabase.from("option_menu_map").select("*"),
    ])

  return NextResponse.json({
    ingredients: ingredientsRes.data ?? [],
    menus: menusRes.data ?? [],
    recipes: recipesRes.data ?? [],
    options: optionsRes.data ?? [],
    platforms: platformsRes.data ?? [],
    optionMenuMap: optionMenuMapRes.data ?? [],
  })
}

/** Insert rows in batches to avoid Supabase payload limits */
async function batchInsert(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  rows: Record<string, unknown>[],
  batchSize = 500,
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).insert(chunk)
    if (error) throw new Error(`${table} insert failed at batch ${Math.floor(i / batchSize)}: ${error.message}`)
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { action, payload } = body

  try {
    switch (action) {
      case "upsert_all": {
        const { ingredients, menus, recipes, options } = payload

        // Step 1: Validate all data can be inserted FIRST (without deleting)
        const tempInsertResults = await Promise.allSettled([
          ingredients?.length ? batchInsert(supabase, "ingredients", ingredients.map(i => ({ ...i, id: crypto.randomUUID() }))) : Promise.resolve(),
          menus?.length ? batchInsert(supabase, "menus", menus.map(m => ({ ...m, id: crypto.randomUUID() }))) : Promise.resolve(),
          recipes?.length ? batchInsert(supabase, "recipes", recipes.map(r => ({ ...r, id: crypto.randomUUID() }))) : Promise.resolve(),
          options?.length ? batchInsert(supabase, "options", options.map(o => ({ ...o, id: crypto.randomUUID() }))) : Promise.resolve(),
        ])
        
        // Check if any inserts would fail
        const failures = tempInsertResults.filter(r => r.status === "rejected")
        if (failures.length > 0) {
          const error = (failures[0] as PromiseRejectedResult).reason
          return NextResponse.json({ error: `데이터 검증 실패: ${error}` }, { status: 400 })
        }

        // Step 2: Only then delete old data (safe delete)
        const deletePromises = [
          supabase.from("recipes").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
          supabase.from("options").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
          supabase.from("ingredients").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
          supabase.from("menus").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        ]
        const deleteResults = await Promise.allSettled(deletePromises)
        const deleteErrors = deleteResults.filter(r => r.status === "rejected")
        if (deleteErrors.length > 0) {
          return NextResponse.json({ error: "기존 데이터 삭제 실패" }, { status: 500 })
        }

        // Step 3: Insert fresh data in batches (this should now succeed)
        if (ingredients?.length) await batchInsert(supabase, "ingredients", ingredients)
        if (menus?.length) await batchInsert(supabase, "menus", menus)
        if (recipes?.length) await batchInsert(supabase, "recipes", recipes)
        if (options?.length) await batchInsert(supabase, "options", options)

        return NextResponse.json({ success: true })
      }

      case "save_ingredients": {
        const { ingredients } = payload
        await supabase
          .from("ingredients")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000")
        if (ingredients?.length) await batchInsert(supabase, "ingredients", ingredients)
        return NextResponse.json({ success: true })
      }

      case "save_menus": {
        const { menus, recipes } = payload
        await supabase
          .from("recipes")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000")
        await supabase
          .from("menus")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000")

        if (menus?.length) await batchInsert(supabase, "menus", menus)
        if (recipes?.length) await batchInsert(supabase, "recipes", recipes)
        return NextResponse.json({ success: true })
      }

      case "save_options": {
        const { options } = payload
        await supabase
          .from("options")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000")
        if (options?.length) await batchInsert(supabase, "options", options)
        return NextResponse.json({ success: true })
      }

      case "save_option_menu_map": {
        const { mappings } = payload as { mappings: { option_id: string; menu_id: string }[] }
        // Clear all existing mappings
        await supabase
          .from("option_menu_map")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000")
        // Insert new mappings in batches
        if (mappings?.length) {
          const rows = mappings.map((m) => ({
            option_id: m.option_id,
            menu_id: m.menu_id,
          }))
          await batchInsert(supabase, "option_menu_map", rows)
        }
        return NextResponse.json({ success: true })
      }

      case "save_platforms": {
        const { platforms } = payload
        for (const p of platforms) {
          const { error } = await supabase
            .from("platforms")
            .update({
              platform_fee_rate: p.platform_fee_rate,
              card_fee_rate: p.card_fee_rate,
              delivery_fee: p.delivery_fee,
            })
            .eq("id", p.id)
          if (error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
