# The brands

One line per brand: its id, its status, when it was last touched. The status
moves through the same small lifecycle every time.

`briefed → active → archived`

| id | name | status | updated |
|---|---|---|---|
| acme-coffee | ACME Coffee | active | 2026-11-13 |

A line here is a pointer. The record lives in `records/<id>/`.
