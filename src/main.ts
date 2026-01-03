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
    this.addRibbonIcon('send', 'NotebookLM에 현재 노트 전송', async () => {
      await this.sendCurrentNote();
    });

    this.addRibbonIcon('book-open', 'NotebookLM 열기', async () => {
      await this.activateView();
    });

    // Commands
    this.addCommand({
      id: 'send-current-note',
      name: '현재 노트를 NotebookLM에 전송',
      editorCallback: async () => {
        await this.sendCurrentNote();
      },
    });

    this.addCommand({
      id: 'send-selection',
      name: '선택된 텍스트를 NotebookLM에 전송',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const selection = editor.getSelection();
        if (selection) {
          await this.sendText(selection, view.file?.basename || 'Selection');
        } else {
          new Notice('텍스트를 선택해주세요');
        }
      },
    });

    this.addCommand({
      id: 'send-all-notes',
      name: '모든 영구 노트를 NotebookLM에 전송',
      callback: async () => {
        await this.sendAllPermanentNotes();
      },
    });

    this.addCommand({
      id: 'open-notebooklm',
      name: 'NotebookLM 열기',
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
              .setTitle('NotebookLM에 전송')
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
            .setTitle('NotebookLM에 전송')
            .setIcon('send')
            .onClick(async () => {
              await this.sendCurrentNote();
            });
        });

        const selection = editor.getSelection();
        if (selection) {
          menu.addItem((item) => {
            item
              .setTitle('선택 영역을 NotebookLM에 전송')
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
      this.statusBarItem.setAttribute('title', `NotebookLM 동기화 대기: ${pending}개`);
    } else if (queueSize > 0) {
      this.statusBarItem.setText(`📘 NLM: ${queueSize}`);
      this.statusBarItem.setAttribute('title', `NotebookLM 전송 완료: ${queueSize}개`);
    } else {
      this.statusBarItem.setText('📘 NLM');
      this.statusBarItem.setAttribute('title', 'NotebookLM Sync 준비됨');
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
    const folder = this.settings.zettelkastenFolder;
    return (
      file.path.startsWith(folder) &&
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
      path: file.path,
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
      new Notice('열려있는 노트가 없습니다');
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
      new Notice(`${this.settings.zettelkastenFolder} 폴더에 영구 노트가 없습니다`);
      return;
    }

    new Notice(`${files.length}개의 영구 노트를 전송 준비 중...`);

    for (const file of files) {
      const noteData = await this.getNoteData(file);
      await this.queueNote(noteData, false);
    }

    new Notice(`${files.length}개 노트가 대기열에 추가되었습니다`);
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
      new Notice('NotebookLM 뷰가 열려있지 않습니다');
      return;
    }

    const pending = Array.from(this.noteQueue.values()).filter(
      (n) => n.status === 'pending'
    );

    if (pending.length === 0) {
      new Notice('전송할 노트가 없습니다');
      return;
    }

    this.isProcessing = true;
    this.shouldStop = false;
    new Notice(`${pending.length}개 노트 전송 시작...`);
    view.updateQueueList(); // Update UI to show stop button

    for (const item of pending) {
      // Check stop flag
      if (this.shouldStop) {
        new Notice('⏹️ 전송이 중지되었습니다');
        break;
      }

      item.status = 'sending';
      this.updateStatusBar();
      view.updateQueueList();

      try {
        await view.addSourceToNotebook(item.note);
        item.status = 'sent';
        new Notice(`✓ ${item.note.title} 전송 완료`);
      } catch (error) {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : String(error);
        new Notice(`✗ ${item.note.title} 전송 실패: ${item.error}`);
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

    new Notice(`전송 완료: 성공 ${sent}개, 실패 ${failed}개`);
  }

  stopProcessing(): void {
    if (this.isProcessing) {
      this.shouldStop = true;
      new Notice('⏹️ 전송 중지 요청됨...');
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
    statusEl.createSpan({ cls: 'nlm-status-text', text: '연결 중...' });

    // Toolbar buttons
    const buttonsEl = this.toolbarEl.createDiv({ cls: 'nlm-toolbar-buttons' });

    const refreshBtn = buttonsEl.createEl('button', { cls: 'nlm-btn' });
    refreshBtn.createSpan({ text: '↻ 새로고침' });
    refreshBtn.addEventListener('click', () => this.refresh());

    const homeBtn = buttonsEl.createEl('button', { cls: 'nlm-btn' });
    homeBtn.createSpan({ text: '🏠 홈' });
    homeBtn.addEventListener('click', () => this.goHome());

    const queueBtn = buttonsEl.createEl('button', { cls: 'nlm-btn nlm-btn-primary' });
    queueBtn.createSpan({ text: '📋 대기열' });
    queueBtn.addEventListener('click', () => this.toggleQueuePanel());
  }

  buildQueuePanel(container: Element): void {
    this.queuePanelEl = container.createDiv({ cls: 'nlm-queue-panel hidden' });

    const header = this.queuePanelEl.createDiv({ cls: 'nlm-queue-header' });
    header.createEl('h3', { text: '📋 전송 대기열' });

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
      stopBtn.createSpan({ text: '⏹️ 전송 중지' });
      stopBtn.addEventListener('click', () => {
        this.plugin.stopProcessing();
      });
    } else {
      // Show normal buttons when not processing
      const sendAllBtn = actions.createEl('button', { cls: 'nlm-btn nlm-btn-primary' });
      sendAllBtn.createSpan({ text: '📤 모두 전송' });
      sendAllBtn.addEventListener('click', () => this.sendAllQueued());

      const clearBtn = actions.createEl('button', { cls: 'nlm-btn' });
      clearBtn.createSpan({ text: '🗑️ 대기열 비우기' });
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
      this.updateStatus('loading', '로딩 중...');
    });

    this.webview.addEventListener('did-finish-load', () => {
      this.checkLoginStatus();
    });

    this.webview.addEventListener('did-fail-load', () => {
      this.updateStatus('error', '로드 실패');
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
        this.updateStatus('connected', '연결됨');
      } else {
        this.updateStatus('disconnected', '로그인 필요');
      }
    } catch {
      this.updateStatus('error', '상태 확인 실패');
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
      listEl.createDiv({ cls: 'nlm-queue-empty', text: '대기열이 비어있습니다' });
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
      new Notice('NotebookLM에 먼저 로그인해주세요');
      return;
    }

    const notebooks = await this.getNotebooks();
    if (notebooks.length === 0) {
      new Notice('노트북을 찾을 수 없습니다. NotebookLM 홈에서 노트북을 선택하거나 생성해주세요.');
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

    new Notice(`📂 "${notebook.title}" 노트북으로 이동 중...`);

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
        throw new Error(`노트북 "${notebook.title}"을 찾을 수 없습니다`);
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

    throw new Error('노트북 페이지 로드 시간 초과');
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

    // Step 1: Click "소스 추가" button (specific selectors first)
    const step1 = await this.webview.executeJavaScript(`
      (function() {
        // Try specific selectors first
        const selectors = [
          'button.add-source-button',
          'button[aria-label="출처 추가"]',
          'button[aria-label="업로드 소스 대화상자 열기"]',
          'button.upload-button',
          'button.upload-icon-button'
        ];

        for (const sel of selectors) {
          const btn = document.querySelector(sel);
          if (btn && !btn.disabled) {
            btn.click();
            return { success: true, method: 'selector', selector: sel };
          }
        }

        // Fall back to text search, but be more specific
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim();
          // Only match very specific text, not generic "추가"
          if (text === '소스 추가' || text === '소스 업로드' ||
              text === 'Add source' || text === 'Add sources' ||
              text.includes('출처 추가')) {
            btn.click();
            return { success: true, method: 'text', text: text };
          }
        }

        return { success: false, error: 'Add source button not found' };
      })();
    `);

    if (!step1?.success) {
      throw new Error(step1?.error || '소스 추가 버튼을 찾을 수 없습니다');
    }

    await this.plugin.delay(1500);

    // Step 2: Click "텍스트 붙여넣기" option
    const step2 = await this.webview.executeJavaScript(`
      (function() {
        // Scroll modal content first
        const scrollables = document.querySelectorAll('.cdk-overlay-pane, mat-bottom-sheet-container, .upload-dialog-panel');
        for (const el of scrollables) {
          el.scrollTop = el.scrollHeight;
        }

        // Look for text paste option
        const allElements = document.querySelectorAll('button, [role="button"], [role="menuitem"], mat-list-item, [class*="option"]');
        for (const el of allElements) {
          const text = (el.textContent || '').trim().toLowerCase();
          if (text.includes('텍스트 붙여넣기') || text.includes('paste text') ||
              text.includes('복사된 텍스트') || text.includes('copied text') ||
              text === '텍스트') {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            el.click();
            return { success: true, text: text };
          }
        }

        return { success: false, error: 'Text paste option not found' };
      })();
    `);

    if (!step2?.success) {
      throw new Error(step2?.error || '텍스트 붙여넣기 옵션을 찾을 수 없습니다');
    }

    await this.plugin.delay(1000);

    // Step 3: Fill in the content
    const step3 = await this.webview.executeJavaScript(`
      (function() {
        const content = ${JSON.stringify(content)};
        const title = ${JSON.stringify(note.title)};

        // Find textarea
        const textareas = document.querySelectorAll('textarea');
        let filled = false;
        for (const ta of textareas) {
          if (ta.offsetParent !== null) {
            ta.value = content;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            ta.dispatchEvent(new Event('change', { bubbles: true }));
            filled = true;
            break;
          }
        }

        // Also try contenteditable
        if (!filled) {
          const editables = document.querySelectorAll('[contenteditable="true"]');
          for (const ed of editables) {
            if (ed.offsetParent !== null) {
              ed.textContent = content;
              ed.dispatchEvent(new Event('input', { bubbles: true }));
              filled = true;
              break;
            }
          }
        }

        // Fill title if input exists
        const titleInputs = document.querySelectorAll('input[type="text"]');
        for (const inp of titleInputs) {
          if (inp.offsetParent !== null && !inp.value) {
            inp.value = title;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            break;
          }
        }

        return { success: filled };
      })();
    `);

    if (!step3?.success) {
      throw new Error('텍스트 입력란을 찾을 수 없습니다');
    }

    await this.plugin.delay(500);

    // Step 4: Click submit button
    const step4 = await this.webview.executeJavaScript(`
      (function() {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim().toLowerCase();
          // Look for submit buttons in modals
          if ((text.includes('삽입') || text === 'insert' || text === '확인' || text === 'ok') &&
              btn.offsetParent !== null && !btn.disabled) {
            btn.click();
            return { success: true, text: text };
          }
        }

        // Try mat-button or primary buttons
        const primaryBtns = document.querySelectorAll('button.mat-primary, button[color="primary"], button.primary');
        for (const btn of primaryBtns) {
          if (btn.offsetParent !== null && !btn.disabled) {
            btn.click();
            return { success: true, method: 'primary-button' };
          }
        }

        return { success: false, error: 'Submit button not found' };
      })();
    `);

    if (!step4?.success) {
      throw new Error(step4?.error || '삽입 버튼을 찾을 수 없습니다');
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

    contentEl.createEl('h2', { text: '📚 노트북 선택' });
    contentEl.createEl('p', {
      cls: 'nlm-modal-desc',
      text: '노트를 추가할 NotebookLM 노트북을 선택하세요.',
    });

    // Queue summary
    const pendingCount = Array.from(this.plugin.noteQueue.values()).filter(
      (n) => n.status === 'pending'
    ).length;

    if (pendingCount > 0) {
      const summaryEl = contentEl.createDiv({ cls: 'nlm-modal-summary' });
      summaryEl.createSpan({ text: `📋 ${pendingCount}개 노트 전송 대기 중` });
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
    newInfoEl.createDiv({ cls: 'nlm-notebook-title', text: '새 노트북 만들기' });
    newInfoEl.createDiv({ cls: 'nlm-notebook-desc', text: 'NotebookLM에서 새 노트북을 생성합니다' });

    newItemEl.addEventListener('click', () => {
      new Notice('NotebookLM에서 새 노트북을 만든 후 다시 시도해주세요');
      this.close();
    });

    // Cancel button
    const footerEl = contentEl.createDiv({ cls: 'nlm-modal-footer' });
    const cancelBtn = footerEl.createEl('button', { text: '취소' });
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

    containerEl.createEl('h2', { text: 'NotebookLM Sync 설정' });

    // General section
    containerEl.createEl('h3', { text: '일반' });

    new Setting(containerEl)
      .setName('Zettelkasten 폴더')
      .setDesc('영구 노트가 저장된 폴더 (YYYYMMDDHHMM 형식)')
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
      .setName('시작 시 자동 열기')
      .setDesc('Obsidian 시작 시 NotebookLM 뷰를 자동으로 엽니다')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoOpenView).onChange(async (value) => {
          this.plugin.settings.autoOpenView = value;
          await this.plugin.saveSettings();
        })
      );

    // Content section
    containerEl.createEl('h3', { text: '콘텐츠' });

    new Setting(containerEl)
      .setName('메타데이터 포함')
      .setDesc('노트 전송 시 태그 등 메타데이터를 포함합니다')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeMetadata).onChange(async (value) => {
          this.plugin.settings.includeMetadata = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Frontmatter 포함')
      .setDesc('YAML frontmatter를 노트 내용에 포함합니다')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeFrontmatter).onChange(async (value) => {
          this.plugin.settings.includeFrontmatter = value;
          await this.plugin.saveSettings();
        })
      );

    // Info section
    containerEl.createEl('h3', { text: '사용법' });

    const infoEl = containerEl.createDiv({ cls: 'nlm-settings-info' });
    infoEl.createEl('p', { text: '1. 오른쪽 사이드바에서 NotebookLM 뷰를 엽니다' });
    infoEl.createEl('p', { text: '2. Google 계정으로 로그인합니다' });
    infoEl.createEl('p', { text: '3. 노트를 선택하고 "NotebookLM에 전송" 명령을 실행합니다' });
    infoEl.createEl('p', { text: '4. 대상 노트북을 선택하면 노트가 소스로 추가됩니다' });
  }
}
