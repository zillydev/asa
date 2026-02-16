# Asa

Chrome/Edge "New Tab" page. Based on [Clear Morning](https://github.com/SaltyAom/clear-morning).

Features:

- Google search suggestions
- Configurable command prefixes and pinned links
- Video/image backgrounds
- Weather forecast with UV index
- Keyboard-driven navigation (vim keys supported)

## Setup

1. Clone the repo
2. Go to `chrome://extensions`, enable Developer Mode, click "Load unpacked", select the repo directory

## Commands

Type a command prefix followed by a space and your query:

| Command | Action               |
| ------- | -------------------- |
| `yt`    | YouTube search       |
| `gh`    | Go to GitHub path    |
| `ask`   | Perplexity search    |
| `gpt`   | ChatGPT conversation |
| `cl`    | Claude conversation  |
| `bg`    | Switch background    |

### Shortcuts (no space needed)

| Shortcut   | Action                             |
| ---------- | ---------------------------------- |
| `:`        | `http://localhost:<query>`         |
| `//`       | `https://<query>`                  |
| `<number>` | Go to pinned link at that position |

## Keyboard Shortcuts

| Key                    | Action                                      |
| ---------------------- | ------------------------------------------- |
| Arrow Down / `Ctrl+j`  | Navigate to first suggestion                |
| `j` / `k`              | Next / previous suggestion (in dropdown)    |
| Arrow Left / Backspace | Return to search box                        |
| Tab                    | Fill search box with highlighted suggestion |
| Enter                  | Navigate to selected suggestion             |
| Escape                 | Close dropdown / unfocus search             |
| `` ` `` (backtick)     | Toggle UI visibility                        |
| `t`                    | Toggle 12/24-hour time format               |

## Customizing Backgrounds

1. Add your file to the `backgrounds/` directory
2. Add the filename to `BACKGROUND_FILES` in `scripts/background.js`

Supported formats: `.mp4`, `.webm`, `.mov`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

## Customizing Pins

Edit the `Pins` array in `scripts/config.js`:

```javascript
const Pins = [
  { href: "https://instagram.com", icon: `<svg ...>...</svg>` },
  { href: "https://github.com", icon: `<svg ...>...</svg>` },
]
```

## Customizing Commands

Edit the `providers` array inside `LinkProviders` in `scripts/config.js`:

```javascript
{
  id: "youtube",
  prefix: "yt ",
  match(search) { return search.startsWith(this.prefix) },
  link: (search) => `https://www.youtube.com/results?search_query=${search.slice(3)}`,
  icon: () => `<svg ...>...</svg>`,
},
```

To add a command with a custom dropdown (like `bg`), add a `suggest` function that returns `[{ label, href }]`.
