# Universal Slicer Table

Table-like slicer for Power BI with a separate filter key and configurable display columns.

## Fields

- `Filter key`: the value written to the visual filter. Usually an ID.
- `Display columns`: columns shown in the table.
- `Sort key`: optional hidden/default sort value.

## Features

- Table layout with multiple display columns
- Quick search
- Clickable header sorting
- Single-select checkbox rows by default
- Optional multi-select mode
- Applies a Power BI basic filter using the filter key
- Font family, font size, header font size, and row height settings

## When to use (honest note)

For a plain single-field searchable slicer, prefer the **native Power BI slicer** with its
built-in Search (`selfFilterEnabled`) — virtualized, no row cap. This visual's niche is the
**multi-column "pick from a table"** finder (filter key + several display columns), which a
native slicer does not offer.

**30,000-row cap.** Like every custom visual, it is bound by
`capabilities.dataReductionAlgorithm.top.count` (max **30,000**); a filter key / display set
with more distinct values is truncated to the first 30,000. Keep it to lower-cardinality
pickers.

## Build

```powershell
npm install
npm run package
```

The packaged `.pbiviz` file is written to `dist/`.

## License

Released under the Unlicense. See the repository root `LICENSE`.
