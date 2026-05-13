# Power BI Custom Visuals

Small Power BI custom visuals by György Görög.

## Visuals

### Universal Slicer Table

A table-like slicer with a separate filter key and configurable display columns. It is useful when a normal slicer is too cramped, but a table visual is not acceptable because row selection must behave like a slicer filter.

Current package:

- `artifacts/publicationSlicerTableA1B2C3D4E5F60718293A4B5C6D7E8F90.0.8.0.0.pbiviz`

Source:

- `visuals/universal-slicer-table`

### Scrollable Text

A scrollable text box for long text measures or text columns. It supports font family, font size, line height, padding, text/background color, and simple alignment controls.

Current package:

- `artifacts/scrollableTextF2A3B4C5D6E7F8091A2B3C4D5E6F7081.0.1.8.0.pbiviz`

Source:

- `visuals/scrollable-text`

## Build

Each visual is a standalone Power BI custom visual project.

```powershell
cd visuals/scrollable-text
npm install
npm run package

cd ../universal-slicer-table
npm install
npm run package
```

## License

Released under the Unlicense. See `LICENSE`.
