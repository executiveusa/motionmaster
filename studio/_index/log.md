# The catalog

One line per campaign: its id, its brand, its placement, its status. The
status moves through the same small lifecycle every time.

`briefed → copied → designed → produced → delivered → archived`

| id | brand | placement | status | updated |
|---|---|---|---|---|
| acme-coffee-slow-mornings | acme-coffee | reels-9x16 | produced | 2026-11-13 |

A line here is a pointer, not a record. The record lives in
`records/<brand>/campaigns/<id>/`.
