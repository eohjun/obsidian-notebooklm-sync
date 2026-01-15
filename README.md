# NotebookLM Sync

An Obsidian plugin that syncs your permanent notes to Google NotebookLM as notebook sources.

## Features

- **Notebook Sync**: Send selected notes to NotebookLM notebook sources
- **Batch Sync**: Sync multiple notes at once by folder
- **Selective Sync**: Choose individual notes to sync
- **Sync Status Tracking**: Check which notes have been synced

## PKM Workflow

```
Permanent Notes (Zettelkasten) → NotebookLM Sync → NotebookLM Sources
                                    (Utilize)
```

Use this plugin to leverage your accumulated PKM knowledge with Google NotebookLM's RAG capabilities.

## Requirements

- **Desktop Only**: This plugin works only on desktop (mobile not supported)
- **Google Account**: Required for NotebookLM access
- **NotebookLM Access**: Access to Google NotebookLM service

## Installation

### BRAT (Recommended)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Open BRAT settings
3. Click "Add Beta plugin"
4. Enter: `eohjun/obsidian-notebooklm-sync`
5. Enable the plugin

### Manual

1. Download `main.js`, `manifest.json` from the latest release
2. Create folder: `<vault>/.obsidian/plugins/notebooklm-sync/`
3. Copy downloaded files to the folder
4. Enable the plugin in Obsidian settings

## Setup

### Google Authentication

1. Open Settings → NotebookLM Sync
2. Authenticate with your Google account
3. Select the NotebookLM notebook to sync to

## Commands

| Command | Description |
|---------|-------------|
| **Sync current note** | Sync current note to NotebookLM |
| **Sync selected notes** | Sync selected notes |
| **Sync folder** | Sync entire folder |
| **View sync status** | Check sync status |

## Usage Workflow

```
1. Complete Google account authentication
2. Select notes or folder to sync
3. Run sync command
4. Verify synced sources in NotebookLM
5. Use NotebookLM AI features with your knowledge
```

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Target Notebook | Notebook to sync to | - |
| Auto-sync | Auto-sync on note modification | false |
| Sync folder | Default sync folder | `04_Zettelkasten` |
| Include frontmatter | Include frontmatter in sync | false |

## Use Cases

### PKM → RAG Integration

1. **Knowledge Search**: Search your notes in natural language via NotebookLM
2. **Summary Generation**: Generate comprehensive summaries from multiple notes
3. **Q&A**: Ask questions based on your accumulated knowledge
4. **Audio Generation**: Convert note content to podcast-style audio

## Related Plugins

This plugin works well with:

- **[Evergreen Note Cultivator](https://github.com/eohjun/obsidian-evergreen-note-cultivator)**: Sync only high-quality notes
- **[Knowledge Synthesizer](https://github.com/eohjun/obsidian-knowledge-synthesizer)**: Use synthesized notes in NotebookLM

## Development

```bash
# Install dependencies
npm install

# Development with watch mode
npm run dev

# Production build
npm run build
```

## License

MIT
