# archiveTT Format Specification

archiveTT is a lightweight timed-text format for captioning media files. It prioritizes readability and fast manual authoring over machine verbosity.

## Syntax

Each cue starts with `@` followed by a timestamp, optional metadata, and caption text:

```
@timestamp[^voice[^placement]] text
```

### Timestamps

Timestamps use `m:ss` or `h:mm:ss` format, with optional millisecond precision:

| Format | Example |
|---|---|
| `m:ss` | `@0:05` |
| `m:ss.ms` | `@0:05.500` |
| `h:mm:ss` | `@1:30:00` |
| `h:mm:ss.ms` | `@1:30:00.250` |

### End times

By default, a cue ends when the next cue begins (or after 4 seconds for the last cue). You can specify explicit end times:

- **Absolute**: `@0:05-0:08` — ends at 0:08
- **Relative**: `@0:05+3` — ends 3 seconds after start (0:08)
- **Relative with ms**: `@0:05+3.5` — ends at 0:08.500

### Voice and placement

Voice (speaker) and placement are attached to the timestamp with `^`:

```
@0:00 Plain caption text.
@0:05^Sarah Voice only.
@0:10^Sarah^top Voice and placement.
@0:15^^top Placement only (no voice).
```

- **Voice**: the speaker name, between the first `^` and either the second `^` or the space before text.
- **Placement**: `top`, `left`, or `right`. Omitted means bottom (default). Follows the second `^`.

### Multi-line cues

Lines that don't start with `@` are continuation lines for the current cue:

```
@0:05 This is a long caption
that spans multiple lines.
@0:10 Next cue.
```

### Non-speech sounds

Square brackets are a convention for non-speech descriptions. They are part of the text, not syntax:

```
@0:20 [Applause]
@0:25^Host [laughing] Thank you, thank you.
```

In subtitles mode (as opposed to captions mode), bracketed content is stripped from WebVTT output.

## Full example

```
@0:00^Narrator A Hare was once boasting about how fast he could run.
@0:05^Hare^right I've never yet been beaten! I challenge anyone here to a race.
@0:11^Tortoise^left I accept your challenge.
@0:14^Hare [laughing] You? Why, I could dance around you the whole way!
@0:20^Narrator The race began, and the Hare darted off at full speed.
@0:26^Narrator Looking back, he saw the Tortoise barely out of sight.
@0:32^Hare^top I'll take a little nap. I have plenty of time.
@0:38 [Time passes]
@0:42^Narrator While the Hare slept, the Tortoise plodded on, slow and steady.
@0:50-0:56^Tortoise Slow and steady wins the race.
```
