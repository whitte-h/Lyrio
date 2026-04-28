# Lyrio — Song Helper for Obsidian

Lyrio keeps song sections in sync across your notes. Tag a block as `::Chorus`, edit it anywhere, and every other `::Chorus` block updates automatically.

---

## Syntax

| Form | Meaning |
|---|---|
| `::Tag` | Opens a section named `Tag` |
| `::Tag*` | Local-only marker — changes here never propagate to other instances |
| `::Tag::` | Closes a section (only when *Use closing tag* is enabled) |
| `::Tag \| Am C F G \|` | Marker with inline bar content (chords, key, notes…) |

Section names are **case-sensitive**: `::Chorus` and `::chorus` are treated as different sections.

---

## Auto-sync

When you edit any section block, Lyrio updates every other instance of that section in the note.

```
::Chorus
La la la

::Verse
My own verse

::Chorus          ← typing here also updates the block above, and vice versa
La la la
```

A 300 ms debounce prevents excessive updates while you type.

### Auto-fill

Write a bare `::Tag` with no body and Lyrio immediately fills it with the content of the nearest existing instance:

```
::Chorus
La la la la

::Chorus          ← becomes "La la la la" automatically
```

---

## Inline bar content

Append `| … |` to any marker to attach metadata (chords, key, capo, etc.) to that section tag:

```
::Chorus | Am C F G |
La la la
```

- Once defined on any instance, typing a bare `::Chorus` elsewhere auto-fills **both** the bar content and the lyrics.
- Editing the bar content on one marker syncs it to all other `::Chorus` markers.

---

## Closing tags

Enable *Use closing tag* in settings to delimit sections explicitly instead of relying on blank lines:

```
::Chorus
La la la
::Chorus::

Some prose between sections without a blank line.

::Chorus
La la la
::Chorus::
```

---

## Exception tags

Some tags should not replicate their body to other instances. By default **Verse** is an exception tag.

For exception tags:
- The **color** is applied normally.
- The **bar content** (`| … |`) syncs across all instances of the same tag — so chords stay consistent.
- The **body lyrics are not synced** — each instance can have its own unique content.

```
::Verse | G D Em C |
First verse lyrics, unique to this block.

::Verse | G D Em C |     ← bar content synced, but lyrics are independent
Second verse, completely different words.
```

Configure which tags are exceptions in Settings → *Exception tags* (comma-separated).

---

## Local markers (`::Tag*`)

Add `*` after the tag name to mark an instance as local. Edits to a local block are ignored by the sync engine and never propagate.

```
::Chorus
La la la

::Chorus*
A private scratch version — won't affect other instances.
```

---

## Settings

| Setting | Default | Description |
|---|---|---|
| Auto-sync sections | On | Automatically sync all instances when any is edited |
| Use closing tag | Off | Use `::Tag::` to close sections instead of blank lines |
| Color section blocks | Off | Draw a colored left border on body lines matching the tag color |
| Exception tags | `Verse` | Tags that sync bar content but not body. Comma-separated. |

---

## Commands

**Show song sections in this note** — logs all section markers found in the current note to the developer console.

---

## Example

```
# My Song

::Verse | G D Em C |
First verse goes here.
Each line is its own lyric.

::PreChorus
Building up...

::Chorus | Am F C G |
This is the main chorus.
Everyone sings along.

::Verse | G D Em C |
Second verse — different words, same chords.

::PreChorus
Building up again...

::Chorus | Am F C G |
This is the main chorus.
Everyone sings along.

::Bridge
Something different here.

::Chorus | Am F C G |
This is the main chorus.
Everyone sings along.
```

The two `::Verse` blocks have independent lyrics but share the same bar content. All three `::Chorus` blocks stay fully in sync.
