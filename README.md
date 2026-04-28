# Lyrio - Song Helper for Obsidian

Lyrio is an Obsidian plugin that automatically synchronizes song sections (Chorus, Verse, Bridge, etc.) across your notes. Perfect for organizing and maintaining consistency in song lyrics and structures.

## Features

- **Auto-Sync Sections**: Edit any `::Chorus` block and all instances automatically update
- **Multiple Section Types**: Use any section name you want (`::Verse`, `::Bridge`, `::Prechorus`, etc.)
- **Smart Detection**: Automatically detects section boundaries (content between marker and blank line)
- **Debounced Syncing**: Changes are processed with intelligent debouncing to avoid performance issues
- **Optional Notifications**: Get feedback when sections are synced
- **Configurable**: Toggle auto-sync and notifications in settings

## How to Use

### Basic Syntax

Write sections in your notes using the `::SectionName` marker:

```
::Chorus
Your chorus lyrics here
More lyrics in the chorus

Some other content

::Verse
Verse lyrics here
More verse content

::Chorus
(This will auto-sync with the first chorus!)

::Bridge
Bridge lyrics
More bridge content

::Chorus
(All chorus instances stay in sync!)
```

### Commands

- **Show song sections in this note**: Display all section markers found in the current note
- **Sync all song sections**: Manually trigger a sync of all sections in the note

### Settings

- **Auto-sync sections**: Enable/disable automatic syncing when you edit a section (default: ON)
- **Show notifications**: Display notifications when sections are synced (default: ON)

## How It Works

1. When you modify any `::SectionName` block (from the marker to the next blank line), Lyrio detects the change
2. It automatically finds all other instances of `::SectionName` in the note
3. All matching sections are updated with the new content
4. Changes propagate through debouncing (300ms delay to avoid excessive updates)

## Tips

- **Organization**: Keep sections separated by blank lines for best results
- **Consistent Naming**: Use the same capitalization for section names you want to sync (`::Chorus` will NOT sync with `::chorus`)
- **Performance**: Large documents with many sections will sync smoothly thanks to debouncing
- **Manual Sync**: Use the "Sync all song sections" command anytime you want to manually trigger a sync

## Example: Song Structure

```
# My Song Title

::Verse
First verse lyrics
Go here on separate lines

::PreChorus
Building up the song
This part leads to the chorus

::Chorus
This is the main chorus
Everyone knows these lines

::Verse
Second verse lyrics
Different from the first

::PreChorus
Building up again
Towards the chorus

::Chorus
This is the main chorus
Everyone knows these lines

::Bridge
A different section
Breaking up the song structure

::Chorus
This is the main chorus
Everyone knows these lines

::Outro
Ending the song
Fade out here
```

## Technical Details

- **Section Markers**: Must start a line with `::` followed by alphanumeric characters (e.g., `::Verse`, `::Chorus2`)
- **Section Boundaries**: A section continues until a blank line is encountered
- **Edit Detection**: Lyrio watches for document changes and applies syncing with a 300ms debounce
- **Performance**: Syncing is instant and doesn't block the editor

## Support

For issues or suggestions, please check the plugin settings and documentation.
