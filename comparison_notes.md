# MusicXML Comparison: Original vs Transposed

## Key Signature
**Original:**
```xml
        <key>
          <fifths>-2</fifths>
          <mode>major</mode>
        </key>
```
(Bb Major / G Minor)

**Transposed:**
```xml
        <key>
          <fifths>0</fifths>
          <mode>major</mode>
        </key>
```
(C Major / A Minor)

**Conclusion:** The Key Signature **IS changed** physically in the XML.

## Transpose Element
**Original:** None.
**Transposed:**
```xml
        <transpose>
          <diatonic>-1</diatonic>
          <chromatic>-2</chromatic>
        </transpose>
```
This tells the playback engine to transpose down by a Major 2nd (-2 semitones, -1 scale degree) so that when it plays "C", it sounds like "Bb".

## Notes (Measure 1)
**Original:**
1. D4 (natural)
2. E4 (natural) - note `accidental="natural"` explicit
3. F#4 (accidental="sharp" explicit)
4. G4 (natural)
5. A4 (natural)

**Transposed:**
1. E4
2. F#4 (accidental="sharp" explicit)
3. G#4 (accidental="sharp" explicit)
4. A4 
5. B4 (inferred)

**Mapping:**
*   D4 -> E4 (+M2)
*   E4 -> F#4 (+M2)
*   F#4 -> G#4 (+M2)
*   G4 -> A4 (+M2)
*   A4 -> B? (Need to verify next snippet)

**Conclusion:** The Notes **ARE changed** physically in the XML.

## Comparison Findings and Fix Plan

1.  **Fundamental Issue**: The "Transposed" MusicXML sample from the user uses **Two Separate Parts** (P1, P2) instead of **One Part with Two Staves**. 
    *   *Action*: My current "split staves" logic in `xmlTranspose.ts` is a good workaround to achieve the same result (isolating Staff 1) without complex DOM restructuring. I will keep it.

2.  **Critical Bug Identified**: `xmlTranspose.ts` attempts to set `accidental` as an **attribute** on the `<note>` element (`note.setAttribute('accid', ...)`). 
    *   **Reality**: In MusicXML, accidental is a **child element** (`<accidental>sharp</accidental>`), not an attribute.
    *   **Consequence**: Verovio ignores the invalid attribute, so accidentals are not explicitly rendered unless implied by key (which they aren't, due to chromaticism).

3.  **Missing Global Transpose Tag**: The valid transposed file includes a `<transpose>` block in `<attributes>`.
    *   *Action*: I must inject this block. It informs the system of the relationship between written and sounding pitch.

4.  **Action Plan**:
    *   Fix `xmlTranspose.ts` to manipulate `<accidental>` elements.
    *   Inject `<transpose>` element into Staff 1 attributes.
    *   Update tests.
