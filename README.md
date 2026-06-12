# Power BI Custom Visuals

Small Power BI custom visuals by György Görög.

## Visuals

### Quick Search Slicer

A compact slicer that combines free-text contains search with a regular value list.

Current package:

- `artifacts/quickSearchSlicerA1B2C3D4E5F60718293A4B5C6D7E8F91.0.1.9.0.pbiviz`

Source:

- `visuals/quick-search-slicer`

### Universal Slicer Table

A table-like slicer with a separate filter key and configurable display columns. It is useful when a normal slicer is too cramped, but a table visual is not acceptable because row selection must behave like a slicer filter.

Current package:

- `artifacts/publicationSlicerTableA1B2C3D4E5F60718293A4B5C6D7E8F90.0.8.6.0.pbiviz`

Source:

- `visuals/universal-slicer-table`

### Scrollable Text

A scrollable text box for long text measures or text columns. It supports font family, font size, line height, padding, text/background color, and simple alignment controls.

Current package:

- `artifacts/scrollableTextF2A3B4C5D6E7F8091A2B3C4D5E6F7081.0.1.8.0.pbiviz`

Source:

- `visuals/scrollable-text`

### Text Filter (Lockable)

A Microsoft Text Filter fork with a lock option. When locked, it keeps its filter even when report-level Clear All Slicers-style reset logic runs.

Current package:

- `artifacts/textFilterLockableEG7291A0B1C2D3E4F5.2.3.0.0.pbiviz`

Source:

- `visuals/text-filter-lockable`

## Install

The built packages are in `artifacts/`. To use one in Power BI Desktop:

1. Open Power BI Desktop.
2. In the **Visualizations** pane, choose **... (more options) → Import a visual from a file**.
3. Select the `.pbiviz` from `artifacts/`.
4. The visual appears in the Visualizations pane — use it like any built-in visual.

Importing visuals from a file may need to be enabled under **File → Options and settings → Options → Security** (or by your Power BI admin).

## Build

Each visual is a standalone Power BI custom visual project.

```powershell
cd visuals/quick-search-slicer
npm install
npm run package

cd ../scrollable-text
npm install
npm run package

cd ../universal-slicer-table
npm install
npm run package

cd ../text-filter-lockable
npm install
npm run package
```

## License

Original visuals in this repository are released under the Unlicense. Text Filter (Lockable) is a fork of Microsoft's Text Filter visual and carries its own MIT license in `visuals/text-filter-lockable/LICENSE`.
