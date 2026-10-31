# QuartetPlay vs. EsQuartet Sheet Music Inventory & Diff Report

This report analyzes the MusicXML (`.mxl`) files in the **esquartet** repository against what is currently loaded in **QuartetPlay** (`public/quartet-songs.json`), categorized by instrumentation according to `repertoire.html` hyperlink text.

---

## 1. Executive Summary

| Metric | Count | Details |
| :--- | :---: | :--- |
| **Total Physical `.mxl` Files in `esquartet`** | **124** | 111 in `sheetmusic/`, 13 in `playalongs/` |
| **Total Songs Loaded in QuartetPlay** | **109** | Defined in `duetplay/public/quartet-songs.json` |
| **Total `.mxl` Hyperlinks in `repertoire.html`** | **107** | 93 in Free Sheet Music table, 14 in Play-alongs table |
| **EsQuartet `.mxl` Files NOT Loaded in QuartetPlay** | **15** | 2 in `sheetmusic/`, 4 in `playalongs/` (unique songs), 8 in `playalongs/` (alternate versions), 1 in HTML only |
| **Songs in QuartetPlay Marked "Coming Soon" in HTML** | **21** | MXL exists on disk & in QuartetPlay, but HTML displays "coming soon" |
| **Broken / Misdirected Links in `repertoire.html`** | **11** | 8 point to `playalongs/` instead of `sheetmusic/`, 2 naming mismatches, 1 missing file |

---

## 2. Category Summary (by Instrumentation)

Per user instructions, **SATB**, **(A)SATB**, **AATB**, and **(S)AATB** are grouped together under **Saxophone Quartet**.

| Instrumentation Category | EsQuartet Files / Links | Loaded in QuartetPlay | Missing from QuartetPlay |
| :--- | :---: | :---: | :---: |
| **Saxophone Quartet (SATB / AATB)** | 84 | 70 | 14 |
| **4 Baritone Saxophones (BBBB)** | 18 | 18 | 0 |
| **3 Baritone Saxophones (BBB)** | 12 | 12 | 0 |
| **Bass Clarinet Quartet** | 12 | 9 | 1 (file missing on disk) |
| **TOTAL** | **126** | **109** | **15** |

> Note: Total entries (126) include physical files plus distinct links found in `repertoire.html`.

---

## 3. Files in EsQuartet NOT Loaded in QuartetPlay

### A. Files Physically Present in `esquartet/sheetmusic/` but Missing from QuartetPlay (2)

| File Name | Instrumentation | Repertoire.html Link | Issue / Root Cause |
| :--- | :--- | :--- | :--- |
| `dudley_do_right_sax_quartet_SATB.mxl` | Sax Quartet (`(A)SATB`) | `<a href="sheetmusic/dudley_do_right_sax_quartet_SATB.mxl">(A)SATB</a>` | **File is uncompressed raw XML** erroneously saved with `.mxl` extension. JSZip threw `Can't find end of central directory`, so `generate-manifest.js` skipped it. |
| `super_mario_world_ending_sax_quartet_SATB.mxl` | Sax Quartet (`SATB`) | `<a href="sheetmusic/super_mario_world_ending_sax_quartet_SATB.mxl">SATB</a>` | **Valid MXL file** that was added to `sheetmusic/` after `quartet-songs.json` was last built. Can be ingested by running manifest generation. |

### B. Unique Songs Present Only in `esquartet/playalongs/` (4)

These songs only exist in `esquartet/playalongs/` and have **no equivalent file in `esquartet/sheetmusic/`**. Because QuartetPlay's build script only scans `../esquartet/sheetmusic`, they are entirely missing from QuartetPlay:

| File Name | Instrumentation | Title | Notes |
| :--- | :--- | :--- | :--- |
| `happy_sax_quartet_SATB.mxl` | Sax Quartet (`SATB`) | Happy (Pharrell Williams) | Linked in Table 2 (Play-alongs) as `MusicXML` |
| `i_get_around_sax_quartet_AATB.mxl` | Sax Quartet (`AATB`) | I Get Around (Beach Boys) | Linked in Table 2 (Play-alongs) as `MusicXML` |
| `pinball_number_count_sax_quartet_AATB.mxl` | Sax Quartet (`AATB`) | Pinball Number Count (Pointer Sisters) | Linked in Table 2 (Play-alongs) as `MusicXML` |
| `sugar_rum_cherry_sax_quartet_SATB.mxl` | Sax Quartet (`SATB`) | Sugar Rum Cherry (Ellington/Strayhorn) | Linked in Table 2 (Play-alongs) as `MusicXML` |

### C. Alternate / Longer Filename Playalong MXLs in `esquartet/playalongs/` (8)

These 8 songs exist in `playalongs/` under full descriptive names, while QuartetPlay currently loads a counterpart from `sheetmusic/` with a shorter name:

| Playalong Filename (`playalongs/`) | Loaded QuartetPlay Filename (`sheetmusic/`) | Instrumentation | Notes |
| :--- | :--- | :--- | :--- |
| `battlefield_1942_sax_quartet_SATB.mxl` (41 KB) | `battlefield_1942.mxl` (29 KB) | Sax Quartet (`(A)SATB`) | Playalong version is a larger/newer arrangement |
| `flyswatter_mariopaint_sax_quartet_AATB.mxl` (34 KB) | `mario_paint_flyswatter.mxl` (35 KB) | Sax Quartet (`(S)AATB`) | Minor file difference |
| `ghostbusters_sax_quartet_SATB.mxl` (51 KB) | `ghostbusters.mxl` (44 KB) | Sax Quartet (`SATB`) | Playalong version has full title/credits |
| `halo_main_theme_sax_quartet_SATB.mxl` (46 KB) | `halo_opening.mxl` (46 KB) | Sax Quartet (`SATB`) | Minor naming difference |
| `kens_theme_sax_quartet_AATB.mxl` (57 KB) | `kens_theme.mxl` (57 KB) | Sax Quartet (`SATB`) | Alternate naming |
| `take_it_all_away_sax_quartet_SATB.mxl` (75 KB) | `take_it_all_away.mxl` (75 KB) | Sax Quartet (`(A)SATB`) | Minor naming difference |
| `tetris_sax_quartet_SATB.mxl` (34 KB) | `tetris_a.mxl` (34 KB) | Sax Quartet (`(A)SATB`) | Minor naming difference |
| `trogdor_sax_quartet_AATB.mxl` (50 KB) | `trogdor.mxl` (37 KB) | Sax Quartet (`(S)AATB`) | Playalong version is a larger/newer arrangement |

### D. Missing Physical File Referenced in `repertoire.html` (1)

| Referenced Filename | Category | Repertoire.html Link | Status |
| :--- | :--- | :--- | :--- |
| `sheetmusic/final_fantasy_VII_main_theme_bass_clarinet_quartet.mxl` | Bass Clarinet Quartet | `<a href="sheetmusic/final_fantasy_VII_main_theme_bass_clarinet_quartet.mxl">BassClarinets</a>` | File does **not** exist in `sheetmusic/` or anywhere in `esquartet`. Only the `.pdf` exists on disk. |

---

## 4. Discrepancies in `repertoire.html`

### A. 21 Songs in QuartetPlay Marked "Coming Soon" in `repertoire.html`
In `repertoire.html`, Column 7 (MusicXML) displays `<td>coming soon</td>` for the following 21 pieces, despite their `.mxl` scores already existing in `sheetmusic/` and being actively playable in QuartetPlay:

1. **25 or 6 to 4** (`25_or_6_to_4_sax_quartet_AATB.mxl`) -- Sax Quartet `(S)AATB`
2. **Alright, OK, You Win** (`alright_ok_sax_quartet_SATB.mxl`) -- Sax Quartet `(A)SATB`
3. **A Foggy Day** (`a_foggy_day_sax_quartet_AATB.mxl`) -- Sax Quartet `(S)AATB`
4. **Castle Damcyan** (`castle_damcyan_sax_quartet_SATB.mxl`) -- Sax Quartet `(A)SATB`
5. **Creature Creator** (`creature_creator_sax_quartet_SATB.mxl`) -- Sax Quartet `(A)SATB`
6. **Eine kleine Nachtmusik (Full)** (`eine_kleine_nachtmusik_sax_quartet_SATB.mxl`) -- Sax Quartet `SATB`
7. **Final Fantasy VII - Main Theme** (`final_fantasy_vii_main_theme_sax_quartet_SATB.mxl`) -- Sax Quartet `SATB`
8. **Hit That Jive, Jack** (`hit_that_jive_jack_sax_quartet_AATB.mxl`) -- Sax Quartet `AATB`
9. **Jingle Bell Rock (SATB)** (`jingle_bell_rock_SATB.mxl`) -- Sax Quartet `(A)SATB`
10. **Joy to the World** (`joy_to_the_world_sax_quartet_SATB.mxl`) -- Sax Quartet `SATB`
11. **Juba** (`juba_sax_quartet_AATB.mxl`) -- Sax Quartet `(S)AATB`
12. **Land of Make Believe** (`land_of_make_believe_sax_quartet_SATB.mxl`) -- Sax Quartet `(A)SATB`
13. **Let It Snow!** (`let_it_snow_sax_quartet_SATB.mxl`) -- Sax Quartet `SATB`
14. **Pink Panther (Original)** (`pink_panther_original_sax_quartet_SATB.mxl`) -- Sax Quartet `SATB`
15. **Pink Panther Theme** (`pink_panther_sax_quartet_SATB.mxl`) -- Sax Quartet `SATB`
16. **Prayer for Ukraine (4Bari)** (`prayer_for_ukraine_4bari.mxl`) -- 4 Bari `BBBB`
17. **Serenade to a Cuckoo** (`serenade_to_a_cuckoo_sax_quartet_SATB.mxl`) -- Sax Quartet `(A)SATB`
18. **Silent Night in Tunisia** (`silent_night_in_tunisia_sax_quartet_SATB.mxl`) -- Sax Quartet `SATB`
19. **Silent Night** (`silent_night_sax_quartet_SATB.mxl`) -- Sax Quartet `SATB`
20. **Silver Bells** (`silver_bells_sax_quartet_SATB.mxl`) -- Sax Quartet `(A)SATB`
21. **The Christmas Song** (`the_christmas_song_sax_quartet_SATB.mxl`) -- Sax Quartet `SATB`

### B. 11 Broken / Path-Misdirected Hyperlinks in `repertoire.html`

| Row Title | Hyperlink in `repertoire.html` | Text | Actual Situation |
| :--- | :--- | :---: | :--- |
| **Final Fantasy VII** | `sheetmusic/final_fantasy_VII_main_theme_bass_clarinet_quartet.mxl` | `BassClarinets` | ❌ File missing on disk entirely |
| **Trogdor** | `playalongs/trogdor.mxl` | `(S)AATB` | ⚠️ File is actually in `sheetmusic/trogdor.mxl` |
| **Take It All Away** | `playalongs/take_it_all_away.mxl` | `(A)SATB` | ⚠️ File is actually in `sheetmusic/take_it_all_away.mxl` |
| **Ghostbusters** | `playalongs/ghostbusters.mxl` | `SATB` | ⚠️ File is actually in `sheetmusic/ghostbusters.mxl` |
| **Ken's Theme** | `playalongs/kens_theme.mxl` | `SATB` | ⚠️ File is actually in `sheetmusic/kens_theme.mxl` |
| **Tetris 'A'** | `playalongs/tetris_a.mxl` | `(A)SATB` | ⚠️ File is actually in `sheetmusic/tetris_a.mxl` |
| **Mario Paint Flyswatter** | `playalongs/mario_paint_flyswatter.mxl` | `(S)AATB` | ⚠️ File is actually in `sheetmusic/mario_paint_flyswatter.mxl` |
| **Halo** | `playalongs/halo_opening.mxl` | `SATB` | ⚠️ File is actually in `sheetmusic/halo_opening.mxl` |
| **Battlefield 1942** | `playalongs/battlefield_1942.mxl` | `(A)SATB` | ⚠️ File is actually in `sheetmusic/battlefield_1942.mxl` |
| **Jingle Bell Rock** | `sheetmusic/jingle_bell_rock_sax_quartet_SATB.mxl` | `(A)SATB` | ⚠️ Filename on disk is `jingle_bell_rock_SATB.mxl` |
| **Final Fantasy VII** (Table 2) | `sheetmusic/FFVII_main_theme_sax_quartet_SATB.mxl` | `MusicXML` | ⚠️ Filename on disk is `final_fantasy_vii_main_theme_sax_quartet_SATB.mxl` |

---

## 5. Complete Inventory Table by Category

### Category 1: Saxophone Quartet (SATB / (A)SATB / AATB / (S)AATB)
*Total: 84 entries (70 loaded in QuartetPlay, 14 missing)*

| Title | Filename | EsQuartet Location | In QuartetPlay? | Repertoire.html Tag |
| :--- | :--- | :---: | :---: | :---: |
| 25 or 6 to 4 | `25_or_6_to_4_sax_quartet_AATB.mxl` | `sheetmusic/` | ✅ Yes | `(S)AATB` (coming soon) |
| A Foggy Day | `a_foggy_day_sax_quartet_AATB.mxl` | `sheetmusic/` | ✅ Yes | `(S)AATB` (coming soon) |
| Ain't No Mountain High Enough | `aint_no_mountain_sax_quartet.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Alright, OK, You Win | `alright_ok_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` (coming soon) |
| Angry Birds - Main Theme | `angry_birds_sax_quartet.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Battlefield 1942 | `battlefield_1942.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Battlefield 1942 (Playalong) | `battlefield_1942_sax_quartet_SATB.mxl` | `playalongs/` | ❌ No | `MusicXML` |
| Beethoven Sonata No. 8 (Pathetique) - II | `beethoven_piano_sonata_no8-II_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Beethoven's 5th a la Chopin | `beethovens_5th_a_la_chopin_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Bernie's Tune | `bernies_tune_sax_quartet_AATB.mxl` | `sheetmusic/` | ✅ Yes | `(S)AATB` |
| Blue Charlie Brown | `blue_charlie_brown_sax_quartet.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Blue Christmas | `blue_christmas_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Castle Damcyan | `castle_damcyan_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` (coming soon) |
| Christmas Time Is Here | `christmas_time_is_here_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Christmas Waltz | `christmas_waltz_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Come Rain or Come Shine | `come_rain_come_shine_sax_quartet.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Cowboy Bebop (Tank! / Bad Dog) | `sax-quartet-cowboy-bebop-SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Creature Creator | `creature_creator_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` (coming soon) |
| Deck the Halls | `deck_the_halls_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Ding Dong Merrily on High | `ding_dong_merrily_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Divertimento K. 137 - II | `divertimento_K137-II_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Dudley Do-Right | `dudley_do_right_sax_quartet_SATB.mxl` | `sheetmusic/` | ❌ No | `(A)SATB` |
| Eine kleine Nachtmusik (Full) | `eine_kleine_nachtmusik_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` (coming soon) |
| Eleanor Rigby | `eleanor_rigby.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Evans Let It Snow | `evans_let_it_snow_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Final Fantasy VII - Main Theme | `final_fantasy_vii_main_theme_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` (coming soon) |
| Flyswatter (Playalong) | `flyswatter_mariopaint_sax_quartet_AATB.mxl` | `playalongs/` | ❌ No | `MusicXML` |
| Ghostbusters | `ghostbusters.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Ghostbusters (Playalong) | `ghostbusters_sax_quartet_SATB.mxl` | `playalongs/` | ❌ No | `MusicXML` |
| Godchild | `godchild.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Halo - Main Theme | `halo_opening.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Halo (Playalong) | `halo_main_theme_sax_quartet_SATB.mxl` | `playalongs/` | ❌ No | `MusicXML` |
| Happy (Pharrell) | `happy_sax_quartet_SATB.mxl` | `playalongs/` | ❌ No | `MusicXML` |
| Hark! The Herald Angels Sing | `hark_the_herald_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Haydn Quartet in C - III | `haydn_quartet_in_C-III.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Hit That Jive, Jack | `hit_that_jive_jack_sax_quartet_AATB.mxl` | `sheetmusic/` | ✅ Yes | `AATB` (coming soon) |
| I Can't Give You Anything But Love | `i_cant_give_you.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| I Get Around | `i_get_around_sax_quartet_AATB.mxl` | `playalongs/` | ❌ No | `MusicXML` |
| Isfahan | `isfahan.mxl` | `sheetmusic/` | ✅ Yes | `(S)AATB` |
| Jingle Bell Rock (SATB) | `jingle_bell_rock_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` (coming soon) |
| Joy to the World | `joy_to_the_world_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` (coming soon) |
| Juba | `juba_sax_quartet_AATB.mxl` | `sheetmusic/` | ✅ Yes | `(S)AATB` (coming soon) |
| Ken's Theme | `kens_theme.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Ken's Theme (Playalong) | `kens_theme_sax_quartet_AATB.mxl` | `playalongs/` | ❌ No | `MusicXML` |
| Land of Make Believe | `land_of_make_believe_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` (coming soon) |
| Let It Snow! | `let_it_snow_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` (coming soon) |
| Lysenko String Quartet I | `lysenko_string_quartet_I_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Mario Paint Flyswatter | `mario_paint_flyswatter.mxl` | `sheetmusic/` | ✅ Yes | `(S)AATB` |
| Misty | `misty_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Moore Slaw | `moore_slaw.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| My Little Drum | `my_little_drum_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Nica's Dream | `nicas_dream_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Pebble Beach | `pebble_beach.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Perhaps, Perhaps, Perhaps | `perhaps.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Pinball Number Count | `pinball_number_count_sax_quartet_AATB.mxl` | `playalongs/` | ❌ No | `MusicXML` |
| Pink Panther (Original) | `pink_panther_original_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` (coming soon) |
| Pink Panther Theme | `pink_panther_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` (coming soon) |
| Prayer for Ukraine | `prayer_for_ukraine_sax_quartet.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Rudolph the Red-Nosed Reindeer | `rudolph_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Santa Claus Is Coming to Town | `santa_claus_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Satin Doll | `satin_doll_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Serenade to a Cuckoo | `serenade_to_a_cuckoo_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` (coming soon) |
| Silent Night | `silent_night_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` (coming soon) |
| Silent Night in Tunisia | `silent_night_in_tunisia_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` (coming soon) |
| Silver Bells | `silver_bells_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` (coming soon) |
| Skating (Vince Guaraldi) | `skating_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Star Trek TAS | `star_trek_TAS_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Star Trek TNG | `star_trek_tng_satb.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Star Trek TOS | `star_trek_tos_satb.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Star Wars Stripes Forever | `star_wars_stripes_forever_sax_quartet.mxl` | `sheetmusic/` | ✅ Yes | `SATB` |
| Sugar Rum Cherry | `sugar_rum_cherry_sax_quartet_SATB.mxl` | `playalongs/` | ❌ No | `MusicXML` |
| Super Mario World Ending | `super_mario_world_ending_sax_quartet_SATB.mxl` | `sheetmusic/` | ❌ No | `SATB` |
| Take It All Away | `take_it_all_away.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Take It All Away (Playalong) | `take_it_all_away_sax_quartet_SATB.mxl` | `playalongs/` | ❌ No | `MusicXML` |
| Tetris 'A' | `tetris_a.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| Tetris (Playalong) | `tetris_sax_quartet_SATB.mxl` | `playalongs/` | ❌ No | `MusicXML` |
| The Christmas Song | `the_christmas_song_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `SATB` (coming soon) |
| Trogdor | `trogdor.mxl` | `sheetmusic/` | ✅ Yes | `(S)AATB` |
| Trogdor (Playalong) | `trogdor_sax_quartet_AATB.mxl` | `playalongs/` | ❌ No | `MusicXML` |
| We Wish You a Merry Christmas | `we_wish_you_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |
| You Are the Sunshine of My Life | `you_are_the_sunshine_sax_quartet_SATB.mxl` | `sheetmusic/` | ✅ Yes | `(A)SATB` |

---

### Category 2: 4 Baritone Saxophones (BBBB)
*Total: 18 entries (18 loaded in QuartetPlay, 0 missing)*

| Title | Filename | In QuartetPlay? | Repertoire.html Tag |
| :--- | :--- | :---: | :---: |
| Angry Birds - Main Theme | `angry_birds_4bari.mxl` | ✅ Yes | `BBBB` |
| Bernie's Tune | `bernies_tune_4bari.mxl` | ✅ Yes | `BBBB` |
| Blue Charlie Brown | `blue_charlie_brown_4bari.mxl` | ✅ Yes | `BBBB` |
| Carol of the Bells | `carol_of_the_bells_4bari.mxl` | ✅ Yes | `BBBB` |
| Christmas Time Is Here | `christmas_time_is_here_4bari.mxl` | ✅ Yes | `BBBB` |
| Deck the Halls | `deck_the_halls_4bari.mxl` | ✅ Yes | `BBBB` |
| Ding Dong Merrily on High | `ding_dong_merrily_4bari.mxl` | ✅ Yes | `BBBB` |
| Dudley Do-Right | `dudley_do_right_4bari.mxl` | ✅ Yes | `BBBB` |
| Evans Let It Snow | `evans_let_it_snow_4bari.mxl` | ✅ Yes | `BBBB` |
| Final Fantasy VII - Main Theme | `FFVII_main_theme_4bari.mxl` | ✅ Yes | `BBBB` |
| Hark! The Herald Angels Sing | `hark_the_herald_4bari.mxl` | ✅ Yes | `BBBB` |
| Jingle Bell Rock | `jingle_bell_rock_4bari.mxl` | ✅ Yes | `BBBB` |
| Misty | `misty_4bari.mxl` | ✅ Yes | `BBBB` |
| Prayer for Ukraine | `prayer_for_ukraine_4bari.mxl` | ✅ Yes | `BBBB` (coming soon) |
| Rudolph the Red-Nosed Reindeer | `rudolph_4bari.mxl` | ✅ Yes | `BBBB` |
| Santa Claus Is Coming to Town | `santa_claus_4bari.mxl` | ✅ Yes | `BBBB` |
| Skating | `skating_4bari.mxl` | ✅ Yes | `BBBB` |
| Winter Wonderland | `winter_wonderland_4bari.mxl` | ✅ Yes | `BBBB` |

---

### Category 3: 3 Baritone Saxophones (BBB)
*Total: 12 entries (12 loaded in QuartetPlay, 0 missing)*

| Title | Filename | In QuartetPlay? | Repertoire.html Tag |
| :--- | :--- | :---: | :---: |
| Carol of the Bells | `carol_of_the_bells_3bari.mxl` | ✅ Yes | `BBB` |
| Christmas Tree (O Tannenbaum) | `christmas_tree_3bari.mxl` | ✅ Yes | `BBB` |
| Deck the Halls | `deck_the_halls_3bari.mxl` | ✅ Yes | `BBB` |
| Dreidel Song | `dreidel_song_3bari.mxl` | ✅ Yes | `BBB` |
| Hark! The Herald Angels Sing | `hark_the_herald_3bari.mxl` | ✅ Yes | `BBB` |
| Jingle Bells (J Bells) | `j_bells_3bari.mxl` | ✅ Yes | `BBB` |
| Jingle Bell Rock | `jingle_bell_rock_3bari.mxl` | ✅ Yes | `BBB` |
| Rudolph the Red-Nosed Reindeer | `rudolph_3bari.mxl` | ✅ Yes | `BBB` |
| Santa Claus Is Coming to Town | `santa_claus_3bari.mxl` | ✅ Yes | `BBB` |
| Skating | `skating_3bari.mxl` | ✅ Yes | `BBB` |
| We Wish You a Merry Christmas | `we_wish_you_3bari.mxl` | ✅ Yes | `BBB` |
| Winter Wonderland | `winter_wonderland_3bari.mxl` | ✅ Yes | `BBB` |

---

### Category 4: Bass Clarinet Quartet
*Total: 12 entries (9 loaded in QuartetPlay, 1 missing from disk, 2 missing)*

| Title | Filename | In QuartetPlay? | Repertoire.html Tag | Notes |
| :--- | :--- | :---: | :---: | :--- |
| Angry Birds - Main Theme | `angry_birds_bass_clarinets.mxl` | ✅ Yes | `BassClarinets` | |
| Bernie's Tune | `bernies_tune_bass_clarinet_quartet.mxl` | ✅ Yes | `BassClarinets` | |
| Blue Charlie Brown | `blue_charlie_brown_bass_clarinets.mxl` | ✅ Yes | `BassClarinets` | |
| Come Rain or Come Shine | `come_rain_come_shine_bass_clarinets.mxl` | ✅ Yes | `BassClarinets` | |
| Divertimento K. 137 | `divertimento_K137_bass_clarinet_quartet.mxl` | ✅ Yes | `BassClarinets` | |
| Eine kleine Nachtmusik | `eine_kleine_bass_clarinet_quartet.mxl` | ✅ Yes | `BassClarinets` | |
| Final Fantasy VII - Main Theme | `final_fantasy_VII_main_theme_bass_clarinet_quartet.mxl` | ❌ No | `BassClarinets` | ❌ File missing on disk (only PDF exists) |
| Misty | `misty_bass_clarinet_quartet.mxl` | ✅ Yes | `BassClarinets` | |
| Prayer for Ukraine | `prayer_for_ukraine_bass_clarinet_quartet.mxl` | ✅ Yes | `BassClarinets` | |
| Satin Doll | `satin_doll_bass_clarinet_quartet.mxl` | ✅ Yes | `BassClarinets` | |
| Star Trek TOS | `star_trek_TOS_bass_clarinet_quartet.mxl` | ✅ Yes | `BassClarinets` | |
| You Are the Sunshine of My Life | `you_are_the_sunshine_bass_clarinet_quartet.mxl` | ✅ Yes | `BassClarinets` | |

---

## 6. Recommendations & Suggested Next Steps

1. **Ingest `super_mario_world_ending_sax_quartet_SATB.mxl` into QuartetPlay:**
   - It is a completely valid MXL file in `sheetmusic/`. Running the manifest generator will immediately add it to QuartetPlay.
2. **Fix or Repack `dudley_do_right_sax_quartet_SATB.mxl`:**
   - Currently, this file contains raw uncompressed MusicXML text rather than a zip archive. It can either be zipped into a standard `.mxl` package, or the ingest script can be updated to detect and support uncompressed `.xml` content in `.mxl`-named files.
3. **Ingest Unique Songs from `playalongs/`:**
   - The 4 unique pieces in `playalongs/` (`Happy`, `I Get Around`, `Pinball Number Count`, and `Sugar Rum Cherry`) could either be copied to `sheetmusic/` or the manifest generation script could be pointed to scan both directories.
4. **Fix 11 Broken Links in `repertoire.html`:**
   - Correct the 8 links incorrectly pointing to `playalongs/` so they point to `sheetmusic/`.
   - Correct the filename for `jingle_bell_rock_SATB.mxl`.
   - Remove or replace the link to the nonexistent `final_fantasy_VII...bass_clarinet...mxl`.
5. **Update "Coming Soon" in `repertoire.html`:**
   - 21 rows in `repertoire.html` have their `.mxl` files ready and working in QuartetPlay. Column 7 can be updated with their respective instrumentation links.
