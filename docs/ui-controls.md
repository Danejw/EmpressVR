# Shared user-interface controls

Use `src/components/ui/app-select.tsx` for dropdown selections on both visitor
and staff pages. It replaces independent native `<select>` elements with one
consistent, accessible and themeable component.

`AppSelect` accepts a stable string `value`, a controlled `onChange(value)`
callback, and an array of `{value,label}` options. Optional features include
`searchable`, `searchPlaceholder`, `disabled`, `required`, `ariaLabel`,
`placeholder`, and `id`. Pass a stable `id` whenever a visible label
uses `htmlFor`. The control supports pointer selection, Arrow keys, Enter,
Escape, searchable filtering, focus management, and visible selected states.

For IANA timezone inputs, use
`src/features/scheduling/time-zone-options.ts` to supply the full set of
runtime-supported canonical zones, with Honolulu, London, New York and UTC
at the top. Store the exact IANA identifier, never a numeric UTC offset.
Use `src/features/scheduling/zoned-time.ts` to convert user-selected local
times to unambiguous UTC timestamps. Do not silently convert DST gaps or
repeated local times.

In the staff session editor, the native `datetime-local` inputs enforce
timezone-specific future-only minimum values via
`src/features/scheduling/future-session.ts`. These `min` attributes
disable past dates/times in browsers that support it; server-side validation
remains mandatory, including a current-time check, because a browser's clock
can be incorrect or the input may be bypassed.

The events CMS can continue to publish verified historical events, so it does
not share the future-only appointment restriction. Other dropdowns across
EmpressVR use `AppSelect` for consistent styling and interaction.

When adding new select fields, reuse the existing component rather than
creating another dropdown implementation.
