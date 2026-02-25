# data/

Static seed data files. Read by seed scripts; not imported by the application at runtime.

## ruleset-seed.json

14 rules across 7 categories, derived from the fictional halacha ruling files in
`/home/golem-master/Documents/Rabbinic Repository/Business/fictional halacha/`.

### Categories and rule keys

| Category | Rule keys |
|----------|-----------|
| Kosher Pokémon | `kosher_land`, `kosher_sea`, `kosher_sky`, `kosher_bug`, `kosher_byproducts`, `kosher_forbidden` |
| Team Composition | `team_breeding`, `team_no_fossils`, `team_kilaayim_singles`, `team_doubles_npc`, `team_doubles_pvp` |
| Laws of Battle | `battle_forbidden_moves`, `battle_forbidden_items`, `battle_beneficial_items`, `battle_pikuach_nefesh` |
| Laws of Impure Types | `types_ghost_dark`, `types_psychic_fairy`, `types_nacli_ruling` |
| Animal Welfare | `welfare_feeding`, `welfare_healing`, `welfare_no_status`, `welfare_no_nest`, `welfare_no_grinding` |
| Shabbat | `shabbat_rules` |
| Player Character | `player_age`, `player_no_cross_dressing`, `player_no_idolatry` |

Source halacha files:
- `Kosher Pokemon.md` — land/sea/sky/bug/byproduct/forbidden lists
- `Laws of Team Composition.md` — Kilaayim, breeding, singles/doubles
- `Laws of Battle.md` — forbidden moves/items, pikuach nefesh
- `Laws of Impure Types.md` — ghost/dark/psychic/fairy handling, Nacli ruling
- `Laws of Animal Welfare.md` — feeding, healing, OHKO, grinding
- `Laws of Shabbat.md` — every 7th in-game day
- `Laws of Player Characters.md` — age clock, no cross-dressing, no idolatry
- `Nacli ruling.md` — PIKA official ruling permitting Nacli/Naclstack/Garganacl

## checkpoints/scarlet-violet.json

26 story checkpoints for Pokémon Scarlet/Violet playthroughs:
- Game start, Los Platos
- All 8 gym leaders
- 5 Titans (Path of Legends)
- 5 Team Star bases
- Elite Four (4 members)
- Champion, Post-game unlock
