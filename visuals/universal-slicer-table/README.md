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

## Build

```powershell
npm install
npm run package
```

The packaged `.pbiviz` file is written to `dist/`.

## License

Released under the Unlicense. See the repository root `LICENSE`.
