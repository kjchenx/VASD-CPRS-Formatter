# VASD CPRS Lab Formatter (https://kjchenx.github.io/VASD-CPRS-Formatter/)

A single-page HTML application that reformats raw CPRS (VA Electronic Medical Record) lab output into a clean, human-readable view with trend tables.

## Usage

1. Open `index.html` in Chrome or Microsoft Edge.
2. Paste raw CPRS lab output into the input box.
3. Click **Format** — the formatted output appears in the display area.
4. Use the trend radio buttons (Single / Week / All) to control how many dates appear in the trend tables.

## Architecture

Everything lives in `index.html` (one file, no build step required).

### Data flow

```
Paste raw text → fs() parser → global arrays → fr() formatter → ff() assembler → display
```

| Phase | Function | Responsibility |
|-------|----------|----------------|
| Parse | `fs()` | Splits text line-by-line; populates `listVals`, `listTime`, `listSpecimen`, `listCrit`, `listUH`, `listComment`. Narrative micro blocks go into `listMicro` / `listMicroSpec`. |
| Format | `fr()` | Reads the parsed arrays; builds formatted section strings (`cbcData`, `chemistryData`, `urineData`, `stoolData`, `pleuralData`, `peritonealData`, `csfData`, `otherData`). |
| Output | `ff()` | Assembles all section strings + MICRO narrative + trend tables; writes final HTML to `#edtData`. |

### Parser detection logic (`fs`)

A line is treated as a lab result row when **either**:
- It contains a VA site code pattern ` [NNN]` or ` [NNNN]` (e.g., `[664]`), **or**
- The current timestamp is very old / unset **and** the line starts with a known `replaceArray` key (fallback for edge cases without site codes).

**Lab name**: everything to the left of the first double-space on the line.
**Value**: the first whitespace-delimited token after that gap (`/\S[.A-Za-z0-9,_+:\/\-=]*/`).
Multi-word values (`Not Detected`, `NONE OBSERVED`, `< 0.5`, etc.) are captured with explicit prefix branches before that regex.

### Lab name normalization (`replaceArray`)

```js
replaceArray["CREATININE LEVEL"] = "Creatinine";
replaceArray["GIARDIA AG"]        = "Giardia Ag";
// …
```

Every extracted lab name is looked up in `replaceArray`; if found, it is replaced with the canonical name before being stored. Downstream rendering code uses only the canonical names.

**To add a new lab**: add an entry to `replaceArray` (and optionally add the canonical name to a `listElements` trend category).

### Trend tables (`generateTrendText`)

| Array | Purpose |
|-------|---------|
| `listTrends[]` | Category names (CBC, Chem, GI, …) |
| `listElements[i][]` | Canonical lab names in category *i* |
| `listNames[i][]` | Short column headers for the trend table |
| `listTrendSpecimens[i]` | Pipe-delimited accepted specimen strings for category *i* |

### Supported sections / specimen types

| Section | Specimen(s) |
|---------|-------------|
| HEMATOLOGY | BLOOD |
| CHEMISTRY | SERUM, PLASMA |
| URINE STUDIES | URINE, 24 HR |
| **STOOL STUDIES** | **FECES, STOOL** |
| PLEURAL FLUID STUDIES | PLEURAL FLUID |
| PERITONEAL FLUID STUDIES | PERITONEAL FLUID |
| CSF STUDIES | CEREBROSPINAL (prefix match) |
| OTHER | Everything else |
| MICRO | Narrative blocks from microbiology reports |

### Microbiology narrative parsing

Microbiology sections use free-text rather than tabular format. The parser captures them into `listMicro[]` (content) and `listMicroSpec[]` (specimen @ time label) when it encounters:

| Keyword | Captured as |
|---------|------------|
| `Collection date:` | Starts a new listMicro entry |
| `CULTURE RESULTS:` | Culture narrative block |
| `GRAM STAIN:` | Gram stain result |
| `ACID FAST BACILLI:` / `AFB STAIN:` | AFB stain result |
| `Remark(s):` | Lab remark |
| `Fungus/Yeast:` | Fungal culture result |
| `ANTIBIOTIC SUSCEPTIBILITY TEST RESULTS:` | Susceptibility table (hidden in brief view) |

## Browser support

Chrome and Microsoft Edge (Chromium). No non-standard APIs are used.
