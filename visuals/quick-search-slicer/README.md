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

## When to use (honest note)

Power BI's native slicer already has a built-in **Search** (slicer `…` menu → Search, i.e.
the `selfFilterEnabled` setting) — virtualized, no row cap, no iframe overhead. For an
ordinary searchable list slicer, prefer the native one; this visual reinvents a built-in
feature that is easy to miss.

Reach for this only if you specifically want the combined behavior in a single control:
a `Contains` text filter **plus** an `In` value list, with search-while-typing.

**30,000-row cap.** Like every Power BI custom visual, this one is limited by
`capabilities.dataReductionAlgorithm.top.count` (max **30,000**). On a field with more than
~30k distinct values it shows only the first 30,000 (incomplete) and gets slow, because the
whole value list is serialized into the sandboxed iframe. Native slicers have no such limit
(they window/virtualize) — bind high-cardinality fields to a native slicer instead.

