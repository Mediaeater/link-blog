# Design Review — newsfeeds.net UI (2026-07-05)

First run of the `design-review` skill: four parallel passes (AI-slop, hierarchy/rhythm,
interaction states, accessibility) over `LinkBlogClean.jsx`, `DigestView.jsx`,
`DigestPanel.jsx`, `src/components/ui/*`, `index.css`, `App.css`, `tailwind.config.js`.
Findings verified by compiling the Tailwind config — "class generates no CSS" claims are
tested, not inferred. Report only; nothing fixed.

**Verdict: needs iteration.** The visual language (JetBrains Mono, toned neutrals,
year-break rhythm) is intentional and holds up. But a set of config-level breaks means
several styles silently don't render, and a few interaction patterns lock out keyboard
and touch users.

## Blockers

### Config-level (one-line fixes, wide blast radius)

1. **`primary-500/600` utilities generate zero CSS** — flagged independently by all four
   reviewers. `tailwind.config.js:14` defines `colors.primary: '#1DA1F2'` as a flat
   string, not a shade object, so `ring-primary-500` (`LinkBlogClean.jsx:1451`),
   `hover:text-primary-600` (`:1465`), and `text-primary-600` / `group-hover:text-primary-600`
   (`DigestView.jsx:57,70,127`) are inert. Link titles have no hover color; the focus ring
   has no color. Fix: shade-scale object (the unused `--primary-400/500/600` vars in
   `index.css:50-52` are the intended values).
2. **`text-success` / `text-error` don't exist** (`LinkBlogClean.jsx:1533,1546`) — the
   copied-checkmark loses green, the delete icon loses red. `--success`/`--error` sit
   unused in `index.css:55-57`. Fix: register in the Tailwind theme or use stock shades.
3. **`darkMode: 'class'` never set** — the app toggles a `.dark` class (index.html
   bootstrap script) but Tailwind compiles `dark:` utilities to the media-query strategy.
   Two theming systems only coincidentally agree. Also: `LinkBlogClean.jsx` and
   `DigestView.jsx` contain zero `dark:` classes while `DigestPanel.jsx` has ten — an
   OS-dark-mode visitor gets a light page with a dark modal.

### Interaction / accessibility

4. **Minimal-view trap** — the unlabeled `{count}:{total}` nav button
   (`LinkBlogClean.jsx:820,899`) hides the entire header for non-admins (`:758`), and both
   controls that undo it live inside the hidden header. A visitor who clicks it is
   stranded (no nav, no search, no h1) until a hard reload.
5. **Hover-only action buttons exclude keyboard and touch** — copy/edit/pin/delete
   (`LinkBlogClean.jsx:1530`) and open-link (`DigestView.jsx:172`) use
   `opacity-0 group-hover:opacity-100` with no `group-focus-within:opacity-100`. Tab
   focus lands on invisible controls; touch devices never see them.
6. **No label↔input association in any admin form** — zero `htmlFor`/`id` pairs in
   `LinkBlogClean.jsx:1028-1364` and `DigestPanel.jsx:147,155` (WCAG 1.3.1/4.1.2).
7. **Contrast failures (computed, WCAG AA)** — `DigestPanel.jsx`: `bg-amber-500`+white
   2.15:1 (:114), `bg-blue-500`+white 3.68:1 and `bg-green-500`+white 2.28:1 (:176),
   `bg-red-500`+white 3.76:1 (:199); `LinkBlogClean.jsx:711` `text-red-100` on red-600
   3.95:1; `ui/button.jsx` Acme `default` variant 2.98:1 and `destructive` 4.00:1 in
   light mode (live via BookmarkImporter). The data-warning banner (`:730`) already does
   it right — amber with dark text.
8. **Focus indicators effectively invisible** — `.input`'s `focus:ring-neutral-400/20`
   composites to ≈1.1:1 (`index.css:322`), Acme button ring ≈1.68:1
   (`ui/button.jsx:35`); both replace a suppressed outline (needs 3:1).
9. **Active tag filters have no visual state** — clicking a tag filters the list
   (`LinkBlogClean.jsx:1504-1520`) but the chip renders identically either way, and
   `selectedTags` is displayed nowhere.
10. **Dynamic error/warning banners have no `role="alert"`/`aria-live`**
    (`LinkBlogClean.jsx:704,729`, `DigestPanel.jsx:198`) — screen readers never hear them.
11. **Tag autocomplete has zero ARIA** (`LinkBlogClean.jsx:1087-1287`) — hand-rolled
    combobox with no `role`, `aria-expanded`, or `aria-activedescendant`.

## Documented features that don't exist (docs/code drift)

- **J/K + Cmd+K keyboard navigation** — CLAUDE.md lists it as complete, but there is no
  global keydown listener anywhere in `src/`, and `focusedLinkIndex`
  (`LinkBlogClean.jsx:43`) is `useState(-1)` with no setter destructured. The
  focus-ring markup it gates is doubly dead (see blocker 1).
- **Dark/light theme toggle** — CLAUDE.md lists it as complete; no toggle control exists
  in the app. `.dark` only ever reflects the OS preference via the index.html script.

## Quality

- **Three parallel design systems** (root cause of much of the above): the "Acme" token
  layer (`ui/button.jsx`, `index.css:81-143`) live only via BookmarkImporter; a fully
  worked-out but entirely unreferenced utility layer (`.link-title`, `.pull-quote`,
  `.search-input`… `index.css:358-430`); and the ad hoc Tailwind classes the app actually
  renders with. Four gray vocabularies (custom `--neutral-*`, stock `neutral-*`, stock
  `gray-*`, `--acme-*`) and three blues coexist. Pick one generation, wire it, delete
  the rest.
- **Title hierarchy is flat** — the `<h3>` link title inherits body 17px, only 3px larger
  than the domain line under it; the intended `.link-title` (20px) is part of the dead
  utility layer.
- **Inter font requested but never loaded** — inline `fontFamily: 'Inter'` on the tagline
  and both navs (`LinkBlogClean.jsx:807,818,897`) falls back to generic sans; only
  JetBrains Mono is fetched. Either load a deliberate sans or let the mono voice carry.
- **Amber does double duty** — same colorway for the routine Digest CTA and the urgent
  data-warning banner; Copy-HTML (blue) and Publish (amber) compete as dual primaries.
- **Double-submit race** — Add/Update Link has no `isSaving` guard; a fast double-click
  before the save round-trip resolves adds the link twice.
- **Digest modal lacks dialog semantics** — no `role="dialog"`, no focus move/trap/restore,
  no Escape handler, backdrop click does nothing (`DigestPanel.jsx:131-196`).
- **Import unreachable by keyboard** — hidden file input in a bare label
  (`LinkBlogClean.jsx:1008`).
- **Emoji-prefixed `alert()`s** in the admin save path (`:545-552`) where the app already
  has a proper banner pattern; ~10 more native `alert()`/`confirm()` calls inconsistent
  with it.
- **Duplicated link-card markup** in `LinkBlogClean.jsx:1449` and `DigestView.jsx:119`,
  already drifting; digest writeup styling flips between collapsed/expanded states
  (`DigestView.jsx:97` vs `:110`).
- **Virtualized list** (`VirtualLinkList.jsx`) means unmounted headings are invisible to
  screen-reader rotor navigation; first list item also skips its year `<h2>`.

## Polish (selected)

- Five `bg-white` surfaces against the deliberately toned `neutral-50` page.
- `text-[10px]`/`text-[11px]` arbitrary sizes outside both type scales.
- Icon buttons rely on `title` not `aria-label`; Pin button title never flips to "Unpin".
- `✕` glyph close buttons in DigestPanel while lucide `<X>` is the established pattern.
- No `active:` pressed state anywhere; modal appears with no transition.
- Placeholder text ≈2.42:1; `.tag` border ≈1.42:1 against page background.
- Dead code: `App.css` (unimported Vite boilerplate), `ui/input.jsx` (zero importers).
- No skip-to-content link ahead of the six-item sticky nav.

## Clean passes

No gradient tropes, no left-border card default, no emoji in rendered UI copy (console
logs only), no off-scale spacing values, no `tabindex > 0`, `prefers-reduced-motion`
comprehensively handled (`index.css:230-238`), year-break rhythm judged a legitimate
strategic variation, `ui/button.jsx`'s internal state coverage called out as the best
reference implementation in the codebase.
