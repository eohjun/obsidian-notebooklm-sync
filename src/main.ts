/**
 * NotebookLM Sync Plugin
 *
 * Sync Obsidian permanent notes to Google NotebookLM.
 */

import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
  TFile,
  MarkdownView,
  Menu,
  Editor,
  ItemView,
  WorkspaceLeaf,
  Modal,
  normalizePath,
} from 'obsidian';

// ─────────────────────────────────────────────────────────────
// Constants & Types
// ─────────────────────────────────────────────────────────────

const VIEW_TYPE_NOTEBOOKLM = 'notebooklm-sync-view';

interface NotebookLMSyncSettings {
  zettelkastenFolder: string;
  includeMetadata: boolean;
  includeFrontmatter: boolean;
  autoOpenView: boolean;
}

const DEFAULT_SETTINGS: NotebookLMSyncSettings = {
  zettelkastenFolder: '04_Zettelkasten',
  includeMetadata: true,
  includeFrontmatter: false,
  autoOpenView: false,
};

interface NotebookInfo {
  id: string;
  title: string;
  url?: string;
  viewType?: string;
}

interface NoteData {
  title: string;
  content: string;
  path: string;
  metadata?: {
    created?: number;
    modified?: number;
    tags?: string[];
  };
}

interface QueuedNote {
  id: string;
  note: NoteData;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  error?: string;
}

// ─────────────────────────────────────────────────────────────
// Main Plugin Class
// ─────────────────────────────────────────────────────────────

export default class NotebookLMSyncPlugin extends Plugin {
  settings!: NotebookLMSyncSettings;
  statusBarItem!: HTMLElement;
  noteQueue: Map<string, QueuedNote> = new Map();
  isProcessing = false;
  shouldStop = false;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Register view
    this.registerView(
      VIEW_TYPE_NOTEBOOKLM,
      (leaf) => new NotebookLMView(leaf, this)
    );

    // Status bar
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar();

    // Ribbon icons
    this.addRibbonIcon('send', 'Send current note to NotebookLM', async () => {
      await this.sendCurrentNote();
    });

    this.addRibbonIcon('book-open', 'Open NotebookLM', async () => {
      await this.activateView();
    });

    // Commands
    this.addCommand({
      id: 'send-current-note',
      name: 'Send current note to NotebookLM',
      editorCallback: async () => {
        await this.sendCurrentNote();
      },
    });

    this.addCommand({
      id: 'send-selection',
      name: 'Send selected text to NotebookLM',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const selection = editor.getSelection();
        if (selection) {
          await this.sendText(selection, view.file?.basename || 'Selection');
        } else {
          new Notice('Please select some text');
        }
      },
    });

    this.addCommand({
      id: 'send-all-notes',
      name: 'Send all permanent notes to NotebookLM',
      callback: async () => {
        await this.sendAllPermanentNotes();
      },
    });

    this.addCommand({
      id: 'open-notebooklm',
      name: 'Open NotebookLM',
      callback: async () => {
        await this.activateView();
      },
    });

    // Context menus
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu: Menu, file: TFile) => {
        if (file instanceof TFile && file.extension === 'md') {
          menu.addItem((item) => {
            item
              .setTitle('Send to NotebookLM')
              .setIcon('send')
              .onClick(async () => {
                await this.sendFile(file);
              });
          });
        }
      })
    );

    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
        menu.addItem((item) => {
          item
            .setTitle('Send to NotebookLM')
            .setIcon('send')
            .onClick(async () => {
              await this.sendCurrentNote();
            });
        });

        const selection = editor.getSelection();
        if (selection) {
          menu.addItem((item) => {
            item
              .setTitle('Send selection to NotebookLM')
              .setIcon('text-select')
              .onClick(async () => {
                await this.sendText(selection, view.file?.basename || 'Selection');
              });
          });
        }
      })
    );

    // Settings tab
    this.addSettingTab(new NotebookLMSyncSettingTab(this.app, this));

    // Auto open view
    if (this.settings.autoOpenView) {
      this.app.workspace.onLayoutReady(() => {
        this.activateView();
      });
    }
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_NOTEBOOKLM);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  updateStatusBar(): void {
    const queueSize = this.noteQueue.size;
    const pending = Array.from(this.noteQueue.values()).filter(
      (n) => n.status === 'pending' || n.status === 'sending'
    ).length;

    if (pending > 0) {
      this.statusBarItem.setText(`📤 NLM: ${pending}`);
      this.statusBarItem.setAttribute('title', `NotebookLM sync pending: ${pending}`);
    } else if (queueSize > 0) {
      this.statusBarItem.setText(`📘 NLM: ${queueSize}`);
      this.statusBarItem.setAttribute('title', `NotebookLM sent: ${queueSize}`);
    } else {
      this.statusBarItem.setText('📘 NLM');
      this.statusBarItem.setAttribute('title', 'NotebookLM Sync ready');
    }
  }

  async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTEBOOKLM);

    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
    } else {
      const leaf = this.app.workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_NOTEBOOKLM,
          active: true,
        });
        this.app.workspace.revealLeaf(leaf);
      }
    }
  }

  getView(): NotebookLMView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTEBOOKLM);
    if (leaves.length > 0) {
      return leaves[0].view as NotebookLMView;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // Note Processing
  // ─────────────────────────────────────────────────────────────

  isPermanentNote(file: TFile): boolean {
    const folder = normalizePath(this.settings.zettelkastenFolder);
    const filePath = normalizePath(file.path);
    return (
      filePath.startsWith(folder) &&
      file.extension === 'md' &&
      /^\d{12}/.test(file.basename)
    );
  }

  async getNoteData(file: TFile): Promise<NoteData> {
    const content = await this.app.vault.cachedRead(file);
    const metadata = this.app.metadataCache.getFileCache(file);

    let processedContent = content;

    // Remove frontmatter if setting is off
    if (!this.settings.includeFrontmatter) {
      processedContent = processedContent.replace(/^---[\s\S]*?---\n?/, '');
    }

    const noteData: NoteData = {
      title: file.basename,
      content: processedContent,
      path: normalizePath(file.path),
    };

    if (this.settings.includeMetadata) {
      noteData.metadata = {
        created: file.stat.ctime,
        modified: file.stat.mtime,
        tags: metadata?.tags?.map((t) => t.tag) || [],
      };
    }

    return noteData;
  }

  async sendCurrentNote(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice('No note is currently open');
      return;
    }
    await this.sendFile(file);
  }

  async sendFile(file: TFile): Promise<void> {
    const noteData = await this.getNoteData(file);
    await this.queueNote(noteData);
  }

  async sendText(text: string, title: string): Promise<void> {
    const noteData: NoteData = {
      title,
      content: text,
      path: '',
    };
    await this.queueNote(noteData);
  }

  async sendAllPermanentNotes(): Promise<void> {
    const files = this.app.vault.getMarkdownFiles().filter((f) => this.isPermanentNote(f));

    if (files.length === 0) {
      new Notice(`No permanent notes found in ${this.settings.zettelkastenFolder}`);
      return;
    }

    new Notice(`Preparing to send ${files.length} permanent notes...`);

    for (const file of files) {
      const noteData = await this.getNoteData(file);
      await this.queueNote(noteData, false);
    }

    new Notice(`${files.length} notes added to queue`);
    this.updateStatusBar();

    // Open view and show notebook selector
    await this.activateView();
    const view = this.getView();
    if (view) {
      view.showQueuePanel();
    }
  }

  async queueNote(noteData: NoteData, showModal = true): Promise<void> {
    const id = noteData.path || `text-${Date.now()}`;

    this.noteQueue.set(id, {
      id,
      note: noteData,
      status: 'pending',
    });

    this.updateStatusBar();

    if (showModal) {
      await this.activateView();
      const view = this.getView();
      if (view) {
        view.showQueuePanel();
      }
    }
  }

  async processQueue(notebookId: string): Promise<void> {
    const view = this.getView();
    if (!view || !view.webview) {
      new Notice('NotebookLM view is not open');
      return;
    }

    const pending = Array.from(this.noteQueue.values()).filter(
      (n) => n.status === 'pending'
    );

    if (pending.length === 0) {
      new Notice('No notes to send');
      return;
    }

    this.isProcessing = true;
    this.shouldStop = false;
    new Notice(`Starting to send ${pending.length} notes...`);
    view.updateQueueList(); // Update UI to show stop button

    for (const item of pending) {
      // Check stop flag
      if (this.shouldStop) {
        new Notice('Sending stopped');
        break;
      }

      item.status = 'sending';
      this.updateStatusBar();
      view.updateQueueList();

      try {
        await view.addSourceToNotebook(item.note);
        item.status = 'sent';
        new Notice(`Sent: ${item.note.title}`);
      } catch (error) {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : String(error);
        new Notice(`Failed: ${item.note.title} - ${item.error}`);
      }

      this.updateStatusBar();
      view.updateQueueList();

      // Small delay between requests
      if (!this.shouldStop) {
        await this.delay(2000);
      }
    }

    this.isProcessing = false;
    this.shouldStop = false;
    view.updateQueueList();

    const sent = Array.from(this.noteQueue.values()).filter((n) => n.status === 'sent').length;
    const failed = Array.from(this.noteQueue.values()).filter((n) => n.status === 'failed').length;

    new Notice(`Complete: ${sent} sent, ${failed} failed`);
  }

  stopProcessing(): void {
    if (this.isProcessing) {
      this.shouldStop = true;
      new Notice('Stop requested...');
    }
  }

  clearQueue(): void {
    this.noteQueue.clear();
    this.updateStatusBar();
  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─────────────────────────────────────────────────────────────
// NotebookLM View (Webview)
// ─────────────────────────────────────────────────────────────

class NotebookLMView extends ItemView {
  plugin: NotebookLMSyncPlugin;
  webview: Electron.WebviewTag | null = null;
  toolbarEl!: HTMLElement;
  webviewContainerEl!: HTMLElement;
  queuePanelEl!: HTMLElement;
  isLoggedIn = false;

  constructor(leaf: WorkspaceLeaf, plugin: NotebookLMSyncPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_NOTEBOOKLM;
  }

  getDisplayText(): string {
    return 'NotebookLM';
  }

  getIcon(): string {
    return 'book-open';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('notebooklm-view-container');

    // Build UI
    this.buildToolbar(container);
    this.buildQueuePanel(container);
    this.buildWebviewContainer(container);

    // Initialize webview
    this.initWebview();
  }

  async onClose(): Promise<void> {
    if (this.webview) {
      this.webview.remove();
      this.webview = null;
    }
  }

  buildToolbar(container: Element): void {
    this.toolbarEl = container.createDiv({ cls: 'nlm-toolbar' });

    // Status indicator
    const statusEl = this.toolbarEl.createDiv({ cls: 'nlm-status' });
    statusEl.createSpan({ cls: 'nlm-status-dot' });
    statusEl.createSpan({ cls: 'nlm-status-text', text: 'Connecting...' });

    // Toolbar buttons
    const buttonsEl = this.toolbarEl.createDiv({ cls: 'nlm-toolbar-buttons' });

    const refreshBtn = buttonsEl.createEl('button', { cls: 'nlm-btn' });
    refreshBtn.createSpan({ text: '↻ Refresh' });
    refreshBtn.addEventListener('click', () => this.refresh());

    const homeBtn = buttonsEl.createEl('button', { cls: 'nlm-btn' });
    homeBtn.createSpan({ text: '🏠 Home' });
    homeBtn.addEventListener('click', () => this.goHome());

    const queueBtn = buttonsEl.createEl('button', { cls: 'nlm-btn nlm-btn-primary' });
    queueBtn.createSpan({ text: '📋 Queue' });
    queueBtn.addEventListener('click', () => this.toggleQueuePanel());
  }

  buildQueuePanel(container: Element): void {
    this.queuePanelEl = container.createDiv({ cls: 'nlm-queue-panel hidden' });

    const header = this.queuePanelEl.createDiv({ cls: 'nlm-queue-header' });
    header.createEl('h3', { text: '📋 Send Queue' });

    const closeBtn = header.createEl('button', { cls: 'nlm-btn-icon', text: '✕' });
    closeBtn.addEventListener('click', () => this.hideQueuePanel());

    const content = this.queuePanelEl.createDiv({ cls: 'nlm-queue-content' });
    content.createDiv({ cls: 'nlm-queue-list' });

    const actions = this.queuePanelEl.createDiv({ cls: 'nlm-queue-actions' });
    // Actions will be populated by updateQueueList based on processing state
  }

  updateQueueActions(): void {
    const actions = this.queuePanelEl.querySelector('.nlm-queue-actions');
    if (!actions) return;

    actions.empty();

    if (this.plugin.isProcessing) {
      // Show stop button when processing
      const stopBtn = actions.createEl('button', { cls: 'nlm-btn nlm-btn-danger' });
      stopBtn.createSpan({ text: '⏹️ Stop' });
      stopBtn.addEventListener('click', () => {
        this.plugin.stopProcessing();
      });
    } else {
      // Show normal buttons when not processing
      const sendAllBtn = actions.createEl('button', { cls: 'nlm-btn nlm-btn-primary' });
      sendAllBtn.createSpan({ text: '📤 Send All' });
      sendAllBtn.addEventListener('click', () => this.sendAllQueued());

      const clearBtn = actions.createEl('button', { cls: 'nlm-btn' });
      clearBtn.createSpan({ text: '🗑️ Clear Queue' });
      clearBtn.addEventListener('click', () => {
        this.plugin.clearQueue();
        this.updateQueueList();
      });
    }
  }

  buildWebviewContainer(container: Element): void {
    this.webviewContainerEl = container.createDiv({ cls: 'nlm-webview-container' });
  }

  initWebview(): void {
    // Create webview element
    this.webview = document.createElement('webview') as Electron.WebviewTag;
    this.webview.setAttribute('src', 'https://notebooklm.google.com');
    this.webview.setAttribute('partition', 'persist:notebooklm');
    this.webview.setAttribute('httpreferrer', 'https://google.com');
    this.webview.setAttribute('allowpopups', 'true');
    // Do NOT set custom user-agent - Electron's default UA works better with Google services
    this.webview.addClass('nlm-webview');

    this.webviewContainerEl.appendChild(this.webview);

    // Event listeners
    this.webview.addEventListener('did-start-loading', () => {
      this.updateStatus('loading', 'Loading...');
    });

    this.webview.addEventListener('did-finish-load', () => {
      this.checkLoginStatus();
    });

    this.webview.addEventListener('did-fail-load', () => {
      this.updateStatus('error', 'Load failed');
    });
  }

  async checkLoginStatus(): Promise<void> {
    if (!this.webview) return;

    try {
      const result = await this.webview.executeJavaScript(`
        (function() {
          // Check if logged in by looking for user avatar or logout button
          const avatar = document.querySelector('[aria-label*="Google"], img[src*="googleusercontent"]');
          const logoutBtn = document.querySelector('[aria-label*="로그아웃"], [aria-label*="Sign out"]');
          const projectList = document.querySelector('project-button, .project-table, [class*="notebook"]');
          return !!(avatar || logoutBtn || projectList);
        })();
      `);

      this.isLoggedIn = result;
      if (result) {
        this.updateStatus('connected', 'Connected');
      } else {
        this.updateStatus('disconnected', 'Login required');
      }
    } catch {
      this.updateStatus('error', 'Status check failed');
    }
  }

  updateStatus(state: 'loading' | 'connected' | 'disconnected' | 'error', text: string): void {
    const dot = this.toolbarEl.querySelector('.nlm-status-dot');
    const textEl = this.toolbarEl.querySelector('.nlm-status-text');

    if (dot) {
      dot.className = `nlm-status-dot nlm-status-${state}`;
    }
    if (textEl) {
      textEl.textContent = text;
    }
  }

  refresh(): void {
    this.webview?.reload();
  }

  goHome(): void {
    this.webview?.loadURL('https://notebooklm.google.com');
  }

  // Check if currently on home page (notebook list)
  async isOnHomePage(): Promise<boolean> {
    if (!this.webview) return false;

    try {
      const result = await this.webview.executeJavaScript(`
        (function() {
          const url = window.location.href;
          // Home page: notebooklm.google.com or notebooklm.google.com/ (no notebook ID)
          // Notebook page: notebooklm.google.com/notebook/XXXX
          return !url.includes('/notebook/');
        })();
      `);
      return result;
    } catch {
      return false;
    }
  }

  // Navigate to home page and wait for load
  async ensureHomePage(): Promise<boolean> {
    if (!this.webview) return false;

    const isHome = await this.isOnHomePage();
    if (isHome) {
      return true;
    }

    // Navigate to home if not already there
    new Notice('Navigating to NotebookLM home...');
    this.webview.loadURL('https://notebooklm.google.com');

    // Wait for home page load (max 10 seconds)
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      await this.plugin.delay(500);

      const loaded = await this.webview.executeJavaScript(`
        (function() {
          // Check home page load: notebook list elements exist
          const indicators = [
            'project-button.project-button',
            'table.project-table',
            'a[href*="/notebook/"]',
            '[class*="project-list"]'
          ];

          for (const sel of indicators) {
            if (document.querySelector(sel)) {
              return true;
            }
          }

          // Check if URL is home and loading is complete
          const url = window.location.href;
          const isHomeUrl = !url.includes('/notebook/');
          const hasContent = document.body.textContent.length > 100;
          return isHomeUrl && hasContent;
        })();
      `);

      if (loaded) {
        new Notice('Home page loaded');
        await this.plugin.delay(500); // Additional stabilization wait
        return true;
      }
    }

    new Notice('Home page load timeout');
    return false;
  }

  showQueuePanel(): void {
    this.queuePanelEl.removeClass('hidden');
    this.updateQueueList();
  }

  hideQueuePanel(): void {
    this.queuePanelEl.addClass('hidden');
  }

  toggleQueuePanel(): void {
    if (this.queuePanelEl.hasClass('hidden')) {
      this.showQueuePanel();
    } else {
      this.hideQueuePanel();
    }
  }

  updateQueueList(): void {
    const listEl = this.queuePanelEl.querySelector('.nlm-queue-list');
    if (!listEl) return;

    listEl.empty();

    const queue = Array.from(this.plugin.noteQueue.values());

    if (queue.length === 0) {
      listEl.createDiv({ cls: 'nlm-queue-empty', text: 'Queue is empty' });
      this.updateQueueActions();
      return;
    }

    for (const item of queue) {
      const itemEl = listEl.createDiv({ cls: `nlm-queue-item nlm-queue-${item.status}` });

      const iconEl = itemEl.createSpan({ cls: 'nlm-queue-icon' });
      switch (item.status) {
        case 'pending':
          iconEl.textContent = '⏳';
          break;
        case 'sending':
          iconEl.textContent = '📤';
          break;
        case 'sent':
          iconEl.textContent = '✅';
          break;
        case 'failed':
          iconEl.textContent = '❌';
          break;
      }

      const infoEl = itemEl.createDiv({ cls: 'nlm-queue-info' });
      infoEl.createDiv({ cls: 'nlm-queue-title', text: item.note.title });
      if (item.error) {
        infoEl.createDiv({ cls: 'nlm-queue-error', text: item.error });
      }

      // Only show remove button if not currently sending
      if (item.status !== 'sending') {
        const removeBtn = itemEl.createEl('button', { cls: 'nlm-btn-icon', text: '✕' });
        removeBtn.addEventListener('click', () => {
          this.plugin.noteQueue.delete(item.id);
          this.updateQueueList();
          this.plugin.updateStatusBar();
        });
      }
    }

    this.updateQueueActions();
  }

  async sendAllQueued(): Promise<void> {
    if (!this.isLoggedIn) {
      new Notice('Please log in to NotebookLM first');
      return;
    }

    // Navigate to home if not already there
    const isHome = await this.ensureHomePage();
    if (!isHome) {
      new Notice('Cannot navigate to NotebookLM home. Please click the Home button manually.');
      return;
    }

    // Wait for notebook list to load (max 10 seconds, retry)
    let notebooks: NotebookInfo[] = [];
    for (let attempt = 0; attempt < 10; attempt++) {
      notebooks = await this.getNotebooks();
      if (notebooks.length > 0) {
        break;
      }
      // Wait after first attempt
      if (attempt === 0) {
        new Notice('Loading notebook list...');
      }
      await this.plugin.delay(1000);
    }

    if (notebooks.length === 0) {
      new Notice('No notebooks found. Please create a notebook in NotebookLM.');
      return;
    }

    // Show notebook selection modal
    new NotebookSelectModal(this.app, this.plugin, notebooks, async (selected) => {
      if (selected) {
        await this.navigateToNotebook(selected);
        await this.plugin.delay(2000);
        await this.plugin.processQueue(selected.id);
        this.updateQueueList();
      }
    }).open();
  }

  async getNotebooks(): Promise<NotebookInfo[]> {
    if (!this.webview) return [];

    try {
      const result = await this.webview.executeJavaScript(`
        (function() {
          const notebooks = [];
          const seen = new Set();

          // Method 1: Table view (mobile)
          const table = document.querySelector('table.project-table');
          if (table) {
            const rows = table.querySelectorAll('tbody tr, tr');
            rows.forEach((row, index) => {
              const titleEl = row.querySelector('.project-table-title, [class*="table-title"]');
              if (titleEl) {
                const title = titleEl.textContent.trim();
                if (title && !seen.has(title)) {
                  seen.add(title);
                  notebooks.push({ id: 'row-' + index, title, viewType: 'table' });
                }
              }
            });
          }

          // Method 2: Card view (desktop)
          if (notebooks.length === 0) {
            const projectButtons = document.querySelectorAll('project-button.project-button');
            projectButtons.forEach((btn, index) => {
              const titleEl = btn.querySelector('span.project-button-title');
              if (titleEl) {
                const title = titleEl.textContent.trim();
                if (title && !seen.has(title) && !title.includes('새 노트') && !title.includes('만들기')) {
                  seen.add(title);
                  notebooks.push({ id: 'btn-' + index, title, viewType: 'button' });
                }
              }
            });
          }

          // Method 3: Link based
          if (notebooks.length === 0) {
            document.querySelectorAll('a[href*="/notebook/"]').forEach(el => {
              const href = el.getAttribute('href') || '';
              const match = href.match(/\\/notebook\\/([^/\\?]+)/);
              if (match && !seen.has(match[1])) {
                seen.add(match[1]);
                const title = el.textContent.trim() || 'Untitled';
                if (!title.includes('새 노트') && !title.includes('만들기')) {
                  notebooks.push({ id: match[1], title, url: 'https://notebooklm.google.com' + href, viewType: 'link' });
                }
              }
            });
          }

          return notebooks;
        })();
      `);
      return result || [];
    } catch {
      return [];
    }
  }

  async navigateToNotebook(notebook: NotebookInfo): Promise<void> {
    if (!this.webview) return;

    new Notice(`Navigating to "${notebook.title}"...`);

    if (notebook.url) {
      this.webview.loadURL(notebook.url);
    } else {
      const clicked = await this.webview.executeJavaScript(`
        (function() {
          const title = ${JSON.stringify(notebook.title)};

          // Try table click
          const titleEls = document.querySelectorAll('.project-table-title');
          for (const el of titleEls) {
            if (el.textContent.trim() === title) {
              const row = el.closest('tr');
              if (row) { row.click(); return true; }
            }
          }

          // Try button click
          const btns = document.querySelectorAll('project-button.project-button');
          for (const btn of btns) {
            const titleEl = btn.querySelector('span.project-button-title');
            if (titleEl && titleEl.textContent.trim() === title) {
              btn.click(); return true;
            }
          }

          return false;
        })();
      `);

      if (!clicked) {
        throw new Error(`Notebook "${notebook.title}" not found`);
      }
    }

    // Wait for notebook page to load - check for source panel
    await this.waitForNotebookPage();
  }

  async waitForNotebookPage(): Promise<void> {
    if (!this.webview) return;

    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      await this.plugin.delay(500);

      const isNotebookPage = await this.webview.executeJavaScript(`
        (function() {
          // Check if we're on a notebook page (not home page)
          // Notebook pages have source panels, chat interface, etc.
          const indicators = [
            'button.add-source-button',
            'button[aria-label="출처 추가"]',
            'button[aria-label="업로드 소스 대화상자 열기"]',
            '[class*="source-panel"]',
            '[class*="chat-input"]',
            'mat-tab-group'  // Tab group for Sources/Chat
          ];

          for (const sel of indicators) {
            if (document.querySelector(sel)) {
              return true;
            }
          }

          // Also check URL
          return window.location.href.includes('/notebook/');
        })();
      `);

      if (isNotebookPage) {
        return;
      }
    }

    throw new Error('Notebook page load timeout');
  }

  async addSourceToNotebook(note: NoteData): Promise<void> {
    if (!this.webview) throw new Error('WebView not ready');

    // Prepare content with optional metadata
    let content = note.content;
    if (note.metadata) {
      const meta = [];
      if (note.metadata.tags?.length) {
        meta.push(`Tags: ${note.metadata.tags.join(', ')}`);
      }
      if (meta.length > 0) {
        content = meta.join('\n') + '\n\n' + content;
      }
    }

    // Add title as header
    content = `# ${note.title}\n\n${content}`;

    // Try API method first (izAoDd RPC)
    const apiSuccess = await this.addSourceViaAPI(note.title, content);
    if (apiSuccess) {
      return;
    }

    // Fallback to DOM method
    new Notice('API failed. Retrying via DOM...');
    await this.addSourceViaDOM(note.title, content);
  }

  // Direct API call method (izAoDd RPC)
  async addSourceViaAPI(title: string, content: string): Promise<boolean> {
    if (!this.webview) return false;

    try {
      new Notice(`Adding "${title}" via API...`);

      // Step 1: Extract notebook ID and auth token
      const pageInfo = await this.webview.executeJavaScript(`
        (function() {
          const match = window.location.pathname.match(/\\/notebook\\/([^/]+)/);
          const notebookId = match ? match[1] : null;

          let atToken = null;
          // First try WIZ_global_data
          if (window.WIZ_global_data && window.WIZ_global_data.SNlM0e) {
            atToken = window.WIZ_global_data.SNlM0e;
          }
          // Then try script tag
          if (!atToken) {
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
              const text = script.textContent || '';
              const tokenMatch = text.match(/"SNlM0e":"([^"]+)"/);
              if (tokenMatch) {
                atToken = tokenMatch[1];
                break;
              }
            }
          }

          return { notebookId, atToken };
        })();
      `);

      console.log('[NotebookLM Sync] Page info:', pageInfo);

      if (!pageInfo.notebookId) {
        console.log('[NotebookLM Sync] No notebook ID found');
        return false;
      }

      if (!pageInfo.atToken) {
        console.log('[NotebookLM Sync] No auth token found');
        return false;
      }

      // Step 2: Add text source via izAoDd RPC
      const encodedTitle = Buffer.from(title, 'utf-8').toString('base64');
      const encodedContent = Buffer.from(content, 'utf-8').toString('base64');
      const requestId = 'obsidian_' + Date.now();

      await this.webview.executeJavaScript(`
        (function() {
          function decodeBase64UTF8(base64) {
            var binary = atob(base64);
            var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            return new TextDecoder('utf-8').decode(bytes);
          }

          var notebookId = "${pageInfo.notebookId}";
          var atToken = "${pageInfo.atToken}";
          var title = decodeBase64UTF8("${encodedTitle}");
          var content = decodeBase64UTF8("${encodedContent}");
          var requestId = "${requestId}";

          window['__nlm_result_' + requestId] = { pending: true };

          var rpcId = 'izAoDd';
          var requestPayload = [[[null, [title, content], null, 2]], notebookId];
          var requestBody = [[[rpcId, JSON.stringify(requestPayload), null, "generic"]]];

          var formData = new URLSearchParams();
          formData.append('at', atToken);
          formData.append('f.req', JSON.stringify(requestBody));

          var xhr = new XMLHttpRequest();
          xhr.open('POST', '/_/LabsTailwindUi/data/batchexecute?rpcids=' + rpcId, true);
          xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
          xhr.withCredentials = true;

          xhr.onload = function() {
            var text = xhr.responseText;
            console.log('[API Response]', text.substring(0, 300));
            if (xhr.status === 200 && text.includes('wrb.fr')) {
              window['__nlm_result_' + requestId] = { success: true, pending: false };
            } else {
              window['__nlm_result_' + requestId] = { success: false, pending: false, error: 'API error: ' + xhr.status };
            }
          };

          xhr.onerror = function() {
            window['__nlm_result_' + requestId] = { success: false, pending: false, error: 'Network error' };
          };

          xhr.send(formData.toString());
        })();
      `);

      // Poll for result (max 10 seconds)
      let result = null;
      for (let i = 0; i < 20; i++) {
        await this.plugin.delay(500);
        result = await this.webview.executeJavaScript(`
          (function() {
            var r = window['__nlm_result_${requestId}'];
            if (r && !r.pending) {
              delete window['__nlm_result_${requestId}'];
              return r;
            }
            return null;
          })();
        `);
        if (result) break;
      }

      console.log('[NotebookLM Sync] API result:', result);

      if (result?.success) {
        new Notice(`Source "${title}" added successfully!`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[NotebookLM Sync] API failed:', error);
      return false;
    }
  }

  // Add source via DOM manipulation
  async addSourceViaDOM(title: string, content: string): Promise<void> {
    if (!this.webview) throw new Error('WebView not ready');

    new Notice(`Adding "${title}" via DOM...`);

    // Step 1: Click "Upload source" button
    const step1 = await this.webview.executeJavaScript(`
      (function() {
        // Try specific selectors first
        const selectors = [
          'button.add-source-button',
          'button.upload-button',
          'button.upload-icon-button',
          'button[aria-label="소스 업로드"]',
          'button[aria-label="출처 추가"]'
        ];

        for (const sel of selectors) {
          const btn = document.querySelector(sel);
          if (btn && !btn.disabled) {
            btn.click();
            return { success: true, method: 'selector', selector: sel };
          }
        }

        // Text search - exact matches first
        const exactTexts = ['소스 업로드', '소스 추가', 'Add source', 'Upload source'];
        const buttons = document.querySelectorAll('button');
        for (const exactText of exactTexts) {
          for (const btn of buttons) {
            const text = (btn.textContent || '').trim();
            if (text === exactText && btn.offsetParent !== null) {
              btn.click();
              return { success: true, method: 'exact-text', text: text };
            }
          }
        }

        // Partial match as fallback
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim();
          if ((text.includes('소스') && text.includes('업로드')) ||
              (text.includes('source') && text.includes('upload'))) {
            btn.click();
            return { success: true, method: 'partial-text', text: text };
          }
        }

        return { success: false, error: 'Source upload button not found' };
      })();
    `);

    if (!step1?.success) {
      throw new Error(step1?.error || 'Source add button not found');
    }

    await this.plugin.delay(1500);

    // Step 2: Click "Copied text" option
    const step2 = await this.webview.executeJavaScript(`
      (function() {
        // Text patterns for "copied text" option (Korean and English)
        // Based on actual NotebookLM UI: "복사된 텍스트"
        const textPatterns = [
          '복사된 텍스트',
          '복사한 텍스트',
          'copied text',
          'pasted text'
        ];

        // Look for the option - check all clickable elements
        const selectors = [
          'button',
          '[role="button"]',
          '[role="menuitem"]',
          '[role="option"]',
          'mat-list-item',
          'mat-list-option',
          '[class*="option"]',
          '[class*="chip"]',
          'div[tabindex]',
          'span[tabindex]'
        ];

        const allElements = document.querySelectorAll(selectors.join(', '));
        const availableTexts = [];

        // First try exact match
        for (const el of allElements) {
          const text = (el.textContent || '').trim();
          if (text.length > 0 && text.length < 100) {
            availableTexts.push(text.substring(0, 50));
          }

          for (const pattern of textPatterns) {
            if (text === pattern || text.toLowerCase() === pattern.toLowerCase()) {
              el.scrollIntoView({ behavior: 'instant', block: 'center' });
              el.click();
              return { success: true, text: text, method: 'exact' };
            }
          }
        }

        // Then try partial match
        for (const el of allElements) {
          const text = (el.textContent || '').trim().toLowerCase();
          for (const pattern of textPatterns) {
            if (text.includes(pattern.toLowerCase())) {
              el.scrollIntoView({ behavior: 'instant', block: 'center' });
              el.click();
              return { success: true, text: text, method: 'partial' };
            }
          }
        }

        return {
          success: false,
          error: 'Copied text option not found',
          availableOptions: [...new Set(availableTexts)].slice(0, 15)
        };
      })();
    `);

    if (!step2?.success) {
      const availableOpts = step2?.availableOptions?.join(', ') || 'none';
      console.log('NotebookLM Sync - Available options:', availableOpts);
      throw new Error(`${step2?.error || 'Paste text option not found'} [options: ${availableOpts}]`);
    }

    // Wait for textarea to appear (Step 2 opens a new panel)
    await this.plugin.delay(1500);

    // Step 3: Fill in the content - Use textarea.text-area selector (star-notebooklm pattern)
    const step3 = await this.webview.executeJavaScript(`
      (function() {
        const content = ${JSON.stringify(content)};

        // Exact selector: textarea.text-area (verified in star-notebooklm)
        let textarea = document.querySelector('textarea.text-area');

        // If not found, look for textarea in dialog
        if (!textarea) {
          const modal = document.querySelector('.upload-dialog-panel, [role="dialog"], mat-dialog-container, mat-bottom-sheet-container');
          if (modal) {
            textarea = modal.querySelector('textarea');
          }
        }

        // If still not found, look for any visible textarea
        if (!textarea) {
          const textareas = document.querySelectorAll('textarea');
          for (const ta of textareas) {
            if (ta.offsetParent !== null) {
              textarea = ta;
              break;
            }
          }
        }

        if (textarea && textarea.offsetParent !== null) {
          textarea.focus();
          textarea.value = content;
          // Dispatch multiple events for Angular/React change detection
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          textarea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
          console.log('[NotebookLM Sync] Text inserted into textarea');
          return { success: true, selector: textarea.className };
        }

        return {
          success: false,
          error: 'textarea not found or not visible',
          textareaCount: document.querySelectorAll('textarea').length
        };
      })();
    `);

    console.log('[NotebookLM Sync] Step 3 result:', step3);

    if (!step3?.success) {
      // Clipboard fallback
      try {
        await navigator.clipboard.writeText(content);
        new Notice(`Auto-input failed. Copied to clipboard.\n\nPaste with Cmd/Ctrl+V then click Insert`, 8000);
      } catch {
        throw new Error(`Text input field not found (textarea count: ${step3?.textareaCount || 0})`);
      }
      return;
    }

    await this.plugin.delay(800);

    // Step 4: Click submit button (star-notebooklm pattern: exact text matching)
    const step4 = await this.webview.executeJavaScript(`
      (function() {
        const buttons = document.querySelectorAll('button');
        // Try exact text match first
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim();
          if ((text === '삽입' || text === 'Insert') && !btn.disabled) {
            btn.click();
            console.log('[NotebookLM Sync] Clicked Insert button');
            return { success: true, text: text };
          }
        }

        // Check if button is disabled
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim();
          if (text === '삽입' || text === 'Insert') {
            return { success: false, error: 'Insert button is disabled', disabled: true };
          }
        }

        return { success: false, error: 'Insert button not found' };
      })();
    `);

    console.log('[NotebookLM Sync] Step 4 result:', step4);

    if (step4?.success) {
      new Notice(`Source "${title}" added!`);
    } else if (step4?.disabled) {
      new Notice(`Text input complete!\nPlease click the "Insert" button.`, 5000);
    } else {
      new Notice(`Text input complete!\nPlease click the "Insert" button.`, 5000);
    }

    // Wait for the source to be added
    await this.plugin.delay(1500);
  }
}

// ─────────────────────────────────────────────────────────────
// Notebook Selection Modal
// ─────────────────────────────────────────────────────────────

class NotebookSelectModal extends Modal {
  plugin: NotebookLMSyncPlugin;
  notebooks: NotebookInfo[];
  onSelect: (notebook: NotebookInfo | null) => void;

  constructor(
    app: App,
    plugin: NotebookLMSyncPlugin,
    notebooks: NotebookInfo[],
    onSelect: (notebook: NotebookInfo | null) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.notebooks = notebooks;
    this.onSelect = onSelect;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('nlm-modal');

    contentEl.createEl('h2', { text: 'Select Notebook' });
    contentEl.createEl('p', {
      cls: 'nlm-modal-desc',
      text: 'Select the NotebookLM notebook to add notes to.',
    });

    // Queue summary
    const pendingCount = Array.from(this.plugin.noteQueue.values()).filter(
      (n) => n.status === 'pending'
    ).length;

    if (pendingCount > 0) {
      const summaryEl = contentEl.createDiv({ cls: 'nlm-modal-summary' });
      summaryEl.createSpan({ text: `${pendingCount} notes pending` });
    }

    // Notebook list
    const listEl = contentEl.createDiv({ cls: 'nlm-notebook-list' });

    for (const notebook of this.notebooks) {
      const itemEl = listEl.createDiv({ cls: 'nlm-notebook-item' });
      // No icon - NotebookLM already provides icons for each notebook

      const infoEl = itemEl.createDiv({ cls: 'nlm-notebook-info' });
      infoEl.createDiv({ cls: 'nlm-notebook-title', text: notebook.title });

      itemEl.addEventListener('click', () => {
        this.onSelect(notebook);
        this.close();
      });
    }

    // Create new option
    const newItemEl = listEl.createDiv({ cls: 'nlm-notebook-item nlm-notebook-new' });
    newItemEl.createSpan({ cls: 'nlm-notebook-icon', text: '➕' });

    const newInfoEl = newItemEl.createDiv({ cls: 'nlm-notebook-info' });
    newInfoEl.createDiv({ cls: 'nlm-notebook-title', text: 'Create new notebook' });
    newInfoEl.createDiv({ cls: 'nlm-notebook-desc', text: 'Create a new notebook in NotebookLM' });

    newItemEl.addEventListener('click', () => {
      new Notice('Please create a new notebook in NotebookLM and try again');
      this.close();
    });

    // Cancel button
    const footerEl = contentEl.createDiv({ cls: 'nlm-modal-footer' });
    const cancelBtn = footerEl.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// ─────────────────────────────────────────────────────────────
// Settings Tab
// ─────────────────────────────────────────────────────────────

class NotebookLMSyncSettingTab extends PluginSettingTab {
  plugin: NotebookLMSyncPlugin;

  constructor(app: App, plugin: NotebookLMSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'NotebookLM Sync Settings' });

    // General section
    containerEl.createEl('h3', { text: 'General' });

    new Setting(containerEl)
      .setName('Zettelkasten folder')
      .setDesc('Folder containing permanent notes (YYYYMMDDHHMM format)')
      .addText((text) =>
        text
          .setPlaceholder('04_Zettelkasten')
          .setValue(this.plugin.settings.zettelkastenFolder)
          .onChange(async (value) => {
            this.plugin.settings.zettelkastenFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Auto-open on startup')
      .setDesc('Automatically open NotebookLM view when Obsidian starts')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoOpenView).onChange(async (value) => {
          this.plugin.settings.autoOpenView = value;
          await this.plugin.saveSettings();
        })
      );

    // Content section
    containerEl.createEl('h3', { text: 'Content' });

    new Setting(containerEl)
      .setName('Include metadata')
      .setDesc('Include tags and other metadata when sending notes')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeMetadata).onChange(async (value) => {
          this.plugin.settings.includeMetadata = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Include frontmatter')
      .setDesc('Include YAML frontmatter in note content')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeFrontmatter).onChange(async (value) => {
          this.plugin.settings.includeFrontmatter = value;
          await this.plugin.saveSettings();
        })
      );

    // Info section
    containerEl.createEl('h3', { text: 'Usage' });

    const infoEl = containerEl.createDiv({ cls: 'nlm-settings-info' });
    infoEl.createEl('p', { text: '1. Open the NotebookLM view from the right sidebar' });
    infoEl.createEl('p', { text: '2. Log in with your Google account' });
    infoEl.createEl('p', { text: '3. Select a note and run the "Send to NotebookLM" command' });
    infoEl.createEl('p', { text: '4. Select the target notebook to add the note as a source' });
  }
}
