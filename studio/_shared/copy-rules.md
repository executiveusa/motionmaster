# How to write an ad's words

An ad's words live in two fields: **primary text** and **headline**. Both are
in the platform, not in the picture. Both have hard limits.

| field | limit |
|---|---|
| primary text | 40 characters at the bottom, 150 at the top |
| headline | 27 characters on Feed, 55 on Reels |

## The primary text

It is the body of the ad: what the offer is, and why it is worth a click.
It is read before the picture is, often.

- **Say the thing.** One sentence a stranger would understand.
- **Write like a person.** Not a brand deck, not a press release.
- **One idea, then the reason.** Not three reasons.
- **No superlatives the brief cannot support.** "The best coffee" is a claim
  you have to be able to prove. "Coffee that arrives the night before" is a
  fact you can check.
- **Under a hundred and fifty characters**, and over forty.

## The headline

It is the short line, usually above or below the picture. It is the thing
that has to survive a scroll.

- **A phrase, not a sentence.** It reads at a glance.
- **It may be the same idea as the primary text**, tightened. That is fine.
- **On twenty-seven characters it has to be almost a phrase.** Count it.

## The claim in the picture

The creative carries the brand, not the argument. A short line burned into the
picture is allowed — a claim, a price, a product name — but the argument
belongs in the primary text. And if there is a picture line at all, it sits
inside the safe zone, because a word under the platform's own interface is a
word nobody reads.

## Before it ships

Run the copy through the checker. It knows the placement's limits:

```bash
node scripts/check-ad-copy.mjs --placement reels-9x16 \
  --primary-text "…" --headline "…"
```

A copy that is too short is as wrong as one that is too long. Meta asks for
forty characters at the bottom, not zero.
