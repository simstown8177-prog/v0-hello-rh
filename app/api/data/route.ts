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

        // Clear existing data
        await Promise.all([
          supabase.from("recipes").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
          supabase.from("options").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        ])
        await Promise.all([
          supabase.from("ingredients").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
          supabase.from("menus").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        ])

        // Insert fresh data in batches
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
