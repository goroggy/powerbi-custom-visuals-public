# Quick Search Slicer

Power BI custom visual that combines:

- a text input slicer using a `Contains` filter
- a regular value slicer list using an `In` filter

Bind one grouping field to `Field`.

Interaction:

- typing filters the list immediately
- when `Search while typing` is enabled, typing also applies a report filter after a short debounce
- clicking a value applies exact selection
- Ctrl/Shift-click adds values when multi-select is enabled
- `Clear` removes the search filter
- `All` removes the value selection filter

