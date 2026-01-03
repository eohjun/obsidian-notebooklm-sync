"use strict";var h=Object.defineProperty;var g=Object.getOwnPropertyDescriptor;var f=Object.getOwnPropertyNames;var v=Object.prototype.hasOwnProperty;var k=(c,o)=>{for(var t in o)h(c,t,{get:o[t],enumerable:!0})},x=(c,o,t,e)=>{if(o&&typeof o=="object"||typeof o=="function")for(let n of f(o))!v.call(c,n)&&n!==t&&h(c,n,{get:()=>o[n],enumerable:!(e=g(o,n))||e.enumerable});return c};var y=c=>x(h({},"__esModule",{value:!0}),c);var S={};k(S,{default:()=>d});module.exports=y(S);var s=require("obsidian"),u="notebooklm-sync-view",E={zettelkastenFolder:"04_Zettelkasten",includeMetadata:!0,includeFrontmatter:!1,autoOpenView:!1},d=class extends s.Plugin{constructor(){super(...arguments);this.noteQueue=new Map;this.isProcessing=!1;this.shouldStop=!1}async onload(){await this.loadSettings(),this.registerView(u,t=>new b(t,this)),this.statusBarItem=this.addStatusBarItem(),this.updateStatusBar(),this.addRibbonIcon("send","NotebookLM\uC5D0 \uD604\uC7AC \uB178\uD2B8 \uC804\uC1A1",async()=>{await this.sendCurrentNote()}),this.addRibbonIcon("book-open","NotebookLM \uC5F4\uAE30",async()=>{await this.activateView()}),this.addCommand({id:"send-current-note",name:"\uD604\uC7AC \uB178\uD2B8\uB97C NotebookLM\uC5D0 \uC804\uC1A1",editorCallback:async()=>{await this.sendCurrentNote()}}),this.addCommand({id:"send-selection",name:"\uC120\uD0DD\uB41C \uD14D\uC2A4\uD2B8\uB97C NotebookLM\uC5D0 \uC804\uC1A1",editorCallback:async(t,e)=>{let n=t.getSelection();n?await this.sendText(n,e.file?.basename||"Selection"):new s.Notice("\uD14D\uC2A4\uD2B8\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694")}}),this.addCommand({id:"send-all-notes",name:"\uBAA8\uB4E0 \uC601\uAD6C \uB178\uD2B8\uB97C NotebookLM\uC5D0 \uC804\uC1A1",callback:async()=>{await this.sendAllPermanentNotes()}}),this.addCommand({id:"open-notebooklm",name:"NotebookLM \uC5F4\uAE30",callback:async()=>{await this.activateView()}}),this.registerEvent(this.app.workspace.on("file-menu",(t,e)=>{e instanceof s.TFile&&e.extension==="md"&&t.addItem(n=>{n.setTitle("NotebookLM\uC5D0 \uC804\uC1A1").setIcon("send").onClick(async()=>{await this.sendFile(e)})})})),this.registerEvent(this.app.workspace.on("editor-menu",(t,e,n)=>{t.addItem(l=>{l.setTitle("NotebookLM\uC5D0 \uC804\uC1A1").setIcon("send").onClick(async()=>{await this.sendCurrentNote()})});let i=e.getSelection();i&&t.addItem(l=>{l.setTitle("\uC120\uD0DD \uC601\uC5ED\uC744 NotebookLM\uC5D0 \uC804\uC1A1").setIcon("text-select").onClick(async()=>{await this.sendText(i,n.file?.basename||"Selection")})})})),this.addSettingTab(new m(this.app,this)),this.settings.autoOpenView&&this.app.workspace.onLayoutReady(()=>{this.activateView()})}async onunload(){this.app.workspace.detachLeavesOfType(u)}async loadSettings(){this.settings=Object.assign({},E,await this.loadData())}async saveSettings(){await this.saveData(this.settings)}updateStatusBar(){let t=this.noteQueue.size,e=Array.from(this.noteQueue.values()).filter(n=>n.status==="pending"||n.status==="sending").length;e>0?(this.statusBarItem.setText(`\u{1F4E4} NLM: ${e}`),this.statusBarItem.setAttribute("title",`NotebookLM \uB3D9\uAE30\uD654 \uB300\uAE30: ${e}\uAC1C`)):t>0?(this.statusBarItem.setText(`\u{1F4D8} NLM: ${t}`),this.statusBarItem.setAttribute("title",`NotebookLM \uC804\uC1A1 \uC644\uB8CC: ${t}\uAC1C`)):(this.statusBarItem.setText("\u{1F4D8} NLM"),this.statusBarItem.setAttribute("title","NotebookLM Sync \uC900\uBE44\uB428"))}async activateView(){let t=this.app.workspace.getLeavesOfType(u);if(t.length>0)this.app.workspace.revealLeaf(t[0]);else{let e=this.app.workspace.getRightLeaf(!1);e&&(await e.setViewState({type:u,active:!0}),this.app.workspace.revealLeaf(e))}}getView(){let t=this.app.workspace.getLeavesOfType(u);return t.length>0?t[0].view:null}isPermanentNote(t){let e=this.settings.zettelkastenFolder;return t.path.startsWith(e)&&t.extension==="md"&&/^\d{12}/.test(t.basename)}async getNoteData(t){let e=await this.app.vault.cachedRead(t),n=this.app.metadataCache.getFileCache(t),i=e;this.settings.includeFrontmatter||(i=i.replace(/^---[\s\S]*?---\n?/,""));let l={title:t.basename,content:i,path:t.path};return this.settings.includeMetadata&&(l.metadata={created:t.stat.ctime,modified:t.stat.mtime,tags:n?.tags?.map(a=>a.tag)||[]}),l}async sendCurrentNote(){let t=this.app.workspace.getActiveFile();if(!t){new s.Notice("\uC5F4\uB824\uC788\uB294 \uB178\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4");return}await this.sendFile(t)}async sendFile(t){let e=await this.getNoteData(t);await this.queueNote(e)}async sendText(t,e){let n={title:e,content:t,path:""};await this.queueNote(n)}async sendAllPermanentNotes(){let t=this.app.vault.getMarkdownFiles().filter(n=>this.isPermanentNote(n));if(t.length===0){new s.Notice(`${this.settings.zettelkastenFolder} \uD3F4\uB354\uC5D0 \uC601\uAD6C \uB178\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4`);return}new s.Notice(`${t.length}\uAC1C\uC758 \uC601\uAD6C \uB178\uD2B8\uB97C \uC804\uC1A1 \uC900\uBE44 \uC911...`);for(let n of t){let i=await this.getNoteData(n);await this.queueNote(i,!1)}new s.Notice(`${t.length}\uAC1C \uB178\uD2B8\uAC00 \uB300\uAE30\uC5F4\uC5D0 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4`),this.updateStatusBar(),await this.activateView();let e=this.getView();e&&e.showQueuePanel()}async queueNote(t,e=!0){let n=t.path||`text-${Date.now()}`;if(this.noteQueue.set(n,{id:n,note:t,status:"pending"}),this.updateStatusBar(),e){await this.activateView();let i=this.getView();i&&i.showQueuePanel()}}async processQueue(t){let e=this.getView();if(!e||!e.webview){new s.Notice("NotebookLM \uBDF0\uAC00 \uC5F4\uB824\uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4");return}let n=Array.from(this.noteQueue.values()).filter(a=>a.status==="pending");if(n.length===0){new s.Notice("\uC804\uC1A1\uD560 \uB178\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4");return}this.isProcessing=!0,this.shouldStop=!1,new s.Notice(`${n.length}\uAC1C \uB178\uD2B8 \uC804\uC1A1 \uC2DC\uC791...`),e.updateQueueList();for(let a of n){if(this.shouldStop){new s.Notice("\u23F9\uFE0F \uC804\uC1A1\uC774 \uC911\uC9C0\uB418\uC5C8\uC2B5\uB2C8\uB2E4");break}a.status="sending",this.updateStatusBar(),e.updateQueueList();try{await e.addSourceToNotebook(a.note),a.status="sent",new s.Notice(`\u2713 ${a.note.title} \uC804\uC1A1 \uC644\uB8CC`)}catch(r){a.status="failed",a.error=r instanceof Error?r.message:String(r),new s.Notice(`\u2717 ${a.note.title} \uC804\uC1A1 \uC2E4\uD328: ${a.error}`)}this.updateStatusBar(),e.updateQueueList(),this.shouldStop||await this.delay(2e3)}this.isProcessing=!1,this.shouldStop=!1,e.updateQueueList();let i=Array.from(this.noteQueue.values()).filter(a=>a.status==="sent").length,l=Array.from(this.noteQueue.values()).filter(a=>a.status==="failed").length;new s.Notice(`\uC804\uC1A1 \uC644\uB8CC: \uC131\uACF5 ${i}\uAC1C, \uC2E4\uD328 ${l}\uAC1C`)}stopProcessing(){this.isProcessing&&(this.shouldStop=!0,new s.Notice("\u23F9\uFE0F \uC804\uC1A1 \uC911\uC9C0 \uC694\uCCAD\uB428..."))}clearQueue(){this.noteQueue.clear(),this.updateStatusBar()}delay(t){return new Promise(e=>setTimeout(e,t))}},b=class extends s.ItemView{constructor(t,e){super(t);this.webview=null;this.isLoggedIn=!1;this.plugin=e}getViewType(){return u}getDisplayText(){return"NotebookLM"}getIcon(){return"book-open"}async onOpen(){let t=this.containerEl.children[1];t.empty(),t.addClass("notebooklm-view-container"),this.buildToolbar(t),this.buildQueuePanel(t),this.buildWebviewContainer(t),this.initWebview()}async onClose(){this.webview&&(this.webview.remove(),this.webview=null)}buildToolbar(t){this.toolbarEl=t.createDiv({cls:"nlm-toolbar"});let e=this.toolbarEl.createDiv({cls:"nlm-status"});e.createSpan({cls:"nlm-status-dot"}),e.createSpan({cls:"nlm-status-text",text:"\uC5F0\uACB0 \uC911..."});let n=this.toolbarEl.createDiv({cls:"nlm-toolbar-buttons"}),i=n.createEl("button",{cls:"nlm-btn"});i.createSpan({text:"\u21BB \uC0C8\uB85C\uACE0\uCE68"}),i.addEventListener("click",()=>this.refresh());let l=n.createEl("button",{cls:"nlm-btn"});l.createSpan({text:"\u{1F3E0} \uD648"}),l.addEventListener("click",()=>this.goHome());let a=n.createEl("button",{cls:"nlm-btn nlm-btn-primary"});a.createSpan({text:"\u{1F4CB} \uB300\uAE30\uC5F4"}),a.addEventListener("click",()=>this.toggleQueuePanel())}buildQueuePanel(t){this.queuePanelEl=t.createDiv({cls:"nlm-queue-panel hidden"});let e=this.queuePanelEl.createDiv({cls:"nlm-queue-header"});e.createEl("h3",{text:"\u{1F4CB} \uC804\uC1A1 \uB300\uAE30\uC5F4"}),e.createEl("button",{cls:"nlm-btn-icon",text:"\u2715"}).addEventListener("click",()=>this.hideQueuePanel()),this.queuePanelEl.createDiv({cls:"nlm-queue-content"}).createDiv({cls:"nlm-queue-list"});let l=this.queuePanelEl.createDiv({cls:"nlm-queue-actions"})}updateQueueActions(){let t=this.queuePanelEl.querySelector(".nlm-queue-actions");if(t)if(t.empty(),this.plugin.isProcessing){let e=t.createEl("button",{cls:"nlm-btn nlm-btn-danger"});e.createSpan({text:"\u23F9\uFE0F \uC804\uC1A1 \uC911\uC9C0"}),e.addEventListener("click",()=>{this.plugin.stopProcessing()})}else{let e=t.createEl("button",{cls:"nlm-btn nlm-btn-primary"});e.createSpan({text:"\u{1F4E4} \uBAA8\uB450 \uC804\uC1A1"}),e.addEventListener("click",()=>this.sendAllQueued());let n=t.createEl("button",{cls:"nlm-btn"});n.createSpan({text:"\u{1F5D1}\uFE0F \uB300\uAE30\uC5F4 \uBE44\uC6B0\uAE30"}),n.addEventListener("click",()=>{this.plugin.clearQueue(),this.updateQueueList()})}}buildWebviewContainer(t){this.webviewContainerEl=t.createDiv({cls:"nlm-webview-container"})}initWebview(){this.webview=document.createElement("webview"),this.webview.setAttribute("src","https://notebooklm.google.com"),this.webview.setAttribute("partition","persist:notebooklm"),this.webview.setAttribute("httpreferrer","https://google.com"),this.webview.setAttribute("allowpopups","true"),this.webview.addClass("nlm-webview"),this.webviewContainerEl.appendChild(this.webview),this.webview.addEventListener("did-start-loading",()=>{this.updateStatus("loading","\uB85C\uB529 \uC911...")}),this.webview.addEventListener("did-finish-load",()=>{this.checkLoginStatus()}),this.webview.addEventListener("did-fail-load",()=>{this.updateStatus("error","\uB85C\uB4DC \uC2E4\uD328")})}async checkLoginStatus(){if(this.webview)try{let t=await this.webview.executeJavaScript(`
        (function() {
          // Check if logged in by looking for user avatar or logout button
          const avatar = document.querySelector('[aria-label*="Google"], img[src*="googleusercontent"]');
          const logoutBtn = document.querySelector('[aria-label*="\uB85C\uADF8\uC544\uC6C3"], [aria-label*="Sign out"]');
          const projectList = document.querySelector('project-button, .project-table, [class*="notebook"]');
          return !!(avatar || logoutBtn || projectList);
        })();
      `);this.isLoggedIn=t,t?this.updateStatus("connected","\uC5F0\uACB0\uB428"):this.updateStatus("disconnected","\uB85C\uADF8\uC778 \uD544\uC694")}catch{this.updateStatus("error","\uC0C1\uD0DC \uD655\uC778 \uC2E4\uD328")}}updateStatus(t,e){let n=this.toolbarEl.querySelector(".nlm-status-dot"),i=this.toolbarEl.querySelector(".nlm-status-text");n&&(n.className=`nlm-status-dot nlm-status-${t}`),i&&(i.textContent=e)}refresh(){this.webview?.reload()}goHome(){this.webview?.loadURL("https://notebooklm.google.com")}showQueuePanel(){this.queuePanelEl.removeClass("hidden"),this.updateQueueList()}hideQueuePanel(){this.queuePanelEl.addClass("hidden")}toggleQueuePanel(){this.queuePanelEl.hasClass("hidden")?this.showQueuePanel():this.hideQueuePanel()}updateQueueList(){let t=this.queuePanelEl.querySelector(".nlm-queue-list");if(!t)return;t.empty();let e=Array.from(this.plugin.noteQueue.values());if(e.length===0){t.createDiv({cls:"nlm-queue-empty",text:"\uB300\uAE30\uC5F4\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4"}),this.updateQueueActions();return}for(let n of e){let i=t.createDiv({cls:`nlm-queue-item nlm-queue-${n.status}`}),l=i.createSpan({cls:"nlm-queue-icon"});switch(n.status){case"pending":l.textContent="\u23F3";break;case"sending":l.textContent="\u{1F4E4}";break;case"sent":l.textContent="\u2705";break;case"failed":l.textContent="\u274C";break}let a=i.createDiv({cls:"nlm-queue-info"});a.createDiv({cls:"nlm-queue-title",text:n.note.title}),n.error&&a.createDiv({cls:"nlm-queue-error",text:n.error}),n.status!=="sending"&&i.createEl("button",{cls:"nlm-btn-icon",text:"\u2715"}).addEventListener("click",()=>{this.plugin.noteQueue.delete(n.id),this.updateQueueList(),this.plugin.updateStatusBar()})}this.updateQueueActions()}async sendAllQueued(){if(!this.isLoggedIn){new s.Notice("NotebookLM\uC5D0 \uBA3C\uC800 \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694");return}let t=await this.getNotebooks();if(t.length===0){new s.Notice("\uB178\uD2B8\uBD81\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. NotebookLM \uD648\uC5D0\uC11C \uB178\uD2B8\uBD81\uC744 \uC120\uD0DD\uD558\uAC70\uB098 \uC0DD\uC131\uD574\uC8FC\uC138\uC694.");return}new p(this.app,this.plugin,t,async e=>{e&&(await this.navigateToNotebook(e),await this.plugin.delay(2e3),await this.plugin.processQueue(e.id),this.updateQueueList())}).open()}async getNotebooks(){if(!this.webview)return[];try{return await this.webview.executeJavaScript(`
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
                if (title && !seen.has(title) && !title.includes('\uC0C8 \uB178\uD2B8') && !title.includes('\uB9CC\uB4E4\uAE30')) {
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
                if (!title.includes('\uC0C8 \uB178\uD2B8') && !title.includes('\uB9CC\uB4E4\uAE30')) {
                  notebooks.push({ id: match[1], title, url: 'https://notebooklm.google.com' + href, viewType: 'link' });
                }
              }
            });
          }

          return notebooks;
        })();
      `)||[]}catch{return[]}}async navigateToNotebook(t){if(this.webview){if(new s.Notice(`\u{1F4C2} "${t.title}" \uB178\uD2B8\uBD81\uC73C\uB85C \uC774\uB3D9 \uC911...`),t.url)this.webview.loadURL(t.url);else if(!await this.webview.executeJavaScript(`
        (function() {
          const title = ${JSON.stringify(t.title)};

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
      `))throw new Error(`\uB178\uD2B8\uBD81 "${t.title}"\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4`);await this.waitForNotebookPage()}}async waitForNotebookPage(){if(!this.webview)return;let t=10;for(let e=0;e<t;e++)if(await this.plugin.delay(500),await this.webview.executeJavaScript(`
        (function() {
          // Check if we're on a notebook page (not home page)
          // Notebook pages have source panels, chat interface, etc.
          const indicators = [
            'button.add-source-button',
            'button[aria-label="\uCD9C\uCC98 \uCD94\uAC00"]',
            'button[aria-label="\uC5C5\uB85C\uB4DC \uC18C\uC2A4 \uB300\uD654\uC0C1\uC790 \uC5F4\uAE30"]',
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
      `))return;throw new Error("\uB178\uD2B8\uBD81 \uD398\uC774\uC9C0 \uB85C\uB4DC \uC2DC\uAC04 \uCD08\uACFC")}async addSourceToNotebook(t){if(!this.webview)throw new Error("WebView not ready");let e=t.content;if(t.metadata){let r=[];t.metadata.tags?.length&&r.push(`Tags: ${t.metadata.tags.join(", ")}`),r.length>0&&(e=r.join(`
`)+`

`+e)}e=`# ${t.title}

${e}`;let n=await this.webview.executeJavaScript(`
      (function() {
        // Try specific selectors first
        const selectors = [
          'button.add-source-button',
          'button.upload-button',
          'button.upload-icon-button',
          'button[aria-label="\uC18C\uC2A4 \uC5C5\uB85C\uB4DC"]',
          'button[aria-label="\uCD9C\uCC98 \uCD94\uAC00"]'
        ];

        for (const sel of selectors) {
          const btn = document.querySelector(sel);
          if (btn && !btn.disabled) {
            btn.click();
            return { success: true, method: 'selector', selector: sel };
          }
        }

        // Text search - exact matches first
        const exactTexts = ['\uC18C\uC2A4 \uC5C5\uB85C\uB4DC', '\uC18C\uC2A4 \uCD94\uAC00', 'Add source', 'Upload source'];
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
          if ((text.includes('\uC18C\uC2A4') && text.includes('\uC5C5\uB85C\uB4DC')) ||
              (text.includes('source') && text.includes('upload'))) {
            btn.click();
            return { success: true, method: 'partial-text', text: text };
          }
        }

        return { success: false, error: 'Source upload button not found' };
      })();
    `);if(!n?.success)throw new Error(n?.error||"\uC18C\uC2A4 \uCD94\uAC00 \uBC84\uD2BC\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4");await this.plugin.delay(1500);let i=await this.webview.executeJavaScript(`
      (function() {
        // Text patterns for "copied text" option (Korean and English)
        // Based on actual NotebookLM UI: "\uBCF5\uC0AC\uB41C \uD14D\uC2A4\uD2B8"
        const textPatterns = [
          '\uBCF5\uC0AC\uB41C \uD14D\uC2A4\uD2B8',
          '\uBCF5\uC0AC\uD55C \uD14D\uC2A4\uD2B8',
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
    `);if(!i?.success){let r=i?.availableOptions?.join(", ")||"none";throw console.log("NotebookLM Sync - Available options:",r),new Error(`${i?.error||"\uD14D\uC2A4\uD2B8 \uBD99\uC5EC\uB123\uAE30 \uC635\uC158\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4"} [\uC635\uC158: ${r}]`)}await this.plugin.delay(1500);let l=await this.webview.executeJavaScript(`
      (async function() {
        const content = ${JSON.stringify(e)};
        let filled = false;
        let targetTextarea = null;

        // Helper function to set value properly for Angular/React
        function setNativeValue(element, value) {
          const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
          const prototype = Object.getPrototypeOf(element);
          const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

          if (valueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value);
          } else if (valueSetter) {
            valueSetter.call(element, value);
          } else {
            element.value = value;
          }
        }

        // Wait for textarea to be available (retry up to 5 times)
        for (let attempt = 0; attempt < 5; attempt++) {
          const textareas = document.querySelectorAll('textarea');
          for (const ta of textareas) {
            const placeholder = (ta.placeholder || '').toLowerCase();
            const isVisible = ta.offsetParent !== null || ta.offsetWidth > 0;

            if (isVisible && (placeholder.includes('\uC5EC\uAE30\uC5D0') || placeholder.includes('\uBD99\uC5EC\uB123') || placeholder.includes('paste'))) {
              targetTextarea = ta;
              break;
            }
          }

          // If not found by placeholder, try any visible textarea
          if (!targetTextarea) {
            for (const ta of textareas) {
              if (ta.offsetParent !== null || ta.offsetWidth > 0) {
                targetTextarea = ta;
                break;
              }
            }
          }

          if (targetTextarea) break;
          await new Promise(r => setTimeout(r, 300));
        }

        if (targetTextarea) {
          // Focus and set value using native setter
          targetTextarea.focus();
          setNativeValue(targetTextarea, content);

          // Dispatch multiple events to ensure framework picks up the change
          targetTextarea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          targetTextarea.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          targetTextarea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

          // Also try Angular-specific event
          const ngModelEvent = new Event('ngModelChange', { bubbles: true });
          targetTextarea.dispatchEvent(ngModelEvent);

          filled = true;
        }

        return {
          success: filled,
          method: targetTextarea ? 'native-setter' : 'none',
          textareaFound: !!targetTextarea,
          textareaCount: document.querySelectorAll('textarea').length
        };
      })();
    `);if(!l?.success)throw console.log("NotebookLM Sync - Step 3 result:",l),new Error(`\uD14D\uC2A4\uD2B8 \uC785\uB825\uB780\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4 (textarea count: ${l?.textareaCount||0})`);await this.plugin.delay(500);let a=await this.webview.executeJavaScript(`
      (function() {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim().toLowerCase();
          // Look for submit buttons in modals
          if ((text.includes('\uC0BD\uC785') || text === 'insert' || text === '\uD655\uC778' || text === 'ok') &&
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
    `);if(!a?.success)throw new Error(a?.error||"\uC0BD\uC785 \uBC84\uD2BC\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4");await this.plugin.delay(1500)}},p=class extends s.Modal{constructor(o,t,e,n){super(o),this.plugin=t,this.notebooks=e,this.onSelect=n}onOpen(){let{contentEl:o}=this;o.empty(),o.addClass("nlm-modal"),o.createEl("h2",{text:"\u{1F4DA} \uB178\uD2B8\uBD81 \uC120\uD0DD"}),o.createEl("p",{cls:"nlm-modal-desc",text:"\uB178\uD2B8\uB97C \uCD94\uAC00\uD560 NotebookLM \uB178\uD2B8\uBD81\uC744 \uC120\uD0DD\uD558\uC138\uC694."});let t=Array.from(this.plugin.noteQueue.values()).filter(r=>r.status==="pending").length;t>0&&o.createDiv({cls:"nlm-modal-summary"}).createSpan({text:`\u{1F4CB} ${t}\uAC1C \uB178\uD2B8 \uC804\uC1A1 \uB300\uAE30 \uC911`});let e=o.createDiv({cls:"nlm-notebook-list"});for(let r of this.notebooks){let w=e.createDiv({cls:"nlm-notebook-item"});w.createDiv({cls:"nlm-notebook-info"}).createDiv({cls:"nlm-notebook-title",text:r.title}),w.addEventListener("click",()=>{this.onSelect(r),this.close()})}let n=e.createDiv({cls:"nlm-notebook-item nlm-notebook-new"});n.createSpan({cls:"nlm-notebook-icon",text:"\u2795"});let i=n.createDiv({cls:"nlm-notebook-info"});i.createDiv({cls:"nlm-notebook-title",text:"\uC0C8 \uB178\uD2B8\uBD81 \uB9CC\uB4E4\uAE30"}),i.createDiv({cls:"nlm-notebook-desc",text:"NotebookLM\uC5D0\uC11C \uC0C8 \uB178\uD2B8\uBD81\uC744 \uC0DD\uC131\uD569\uB2C8\uB2E4"}),n.addEventListener("click",()=>{new s.Notice("NotebookLM\uC5D0\uC11C \uC0C8 \uB178\uD2B8\uBD81\uC744 \uB9CC\uB4E0 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694"),this.close()}),o.createDiv({cls:"nlm-modal-footer"}).createEl("button",{text:"\uCDE8\uC18C"}).addEventListener("click",()=>this.close())}onClose(){this.contentEl.empty()}},m=class extends s.PluginSettingTab{constructor(o,t){super(o,t),this.plugin=t}display(){let{containerEl:o}=this;o.empty(),o.createEl("h2",{text:"NotebookLM Sync \uC124\uC815"}),o.createEl("h3",{text:"\uC77C\uBC18"}),new s.Setting(o).setName("Zettelkasten \uD3F4\uB354").setDesc("\uC601\uAD6C \uB178\uD2B8\uAC00 \uC800\uC7A5\uB41C \uD3F4\uB354 (YYYYMMDDHHMM \uD615\uC2DD)").addText(e=>e.setPlaceholder("04_Zettelkasten").setValue(this.plugin.settings.zettelkastenFolder).onChange(async n=>{this.plugin.settings.zettelkastenFolder=n,await this.plugin.saveSettings()})),new s.Setting(o).setName("\uC2DC\uC791 \uC2DC \uC790\uB3D9 \uC5F4\uAE30").setDesc("Obsidian \uC2DC\uC791 \uC2DC NotebookLM \uBDF0\uB97C \uC790\uB3D9\uC73C\uB85C \uC5FD\uB2C8\uB2E4").addToggle(e=>e.setValue(this.plugin.settings.autoOpenView).onChange(async n=>{this.plugin.settings.autoOpenView=n,await this.plugin.saveSettings()})),o.createEl("h3",{text:"\uCF58\uD150\uCE20"}),new s.Setting(o).setName("\uBA54\uD0C0\uB370\uC774\uD130 \uD3EC\uD568").setDesc("\uB178\uD2B8 \uC804\uC1A1 \uC2DC \uD0DC\uADF8 \uB4F1 \uBA54\uD0C0\uB370\uC774\uD130\uB97C \uD3EC\uD568\uD569\uB2C8\uB2E4").addToggle(e=>e.setValue(this.plugin.settings.includeMetadata).onChange(async n=>{this.plugin.settings.includeMetadata=n,await this.plugin.saveSettings()})),new s.Setting(o).setName("Frontmatter \uD3EC\uD568").setDesc("YAML frontmatter\uB97C \uB178\uD2B8 \uB0B4\uC6A9\uC5D0 \uD3EC\uD568\uD569\uB2C8\uB2E4").addToggle(e=>e.setValue(this.plugin.settings.includeFrontmatter).onChange(async n=>{this.plugin.settings.includeFrontmatter=n,await this.plugin.saveSettings()})),o.createEl("h3",{text:"\uC0AC\uC6A9\uBC95"});let t=o.createDiv({cls:"nlm-settings-info"});t.createEl("p",{text:"1. \uC624\uB978\uCABD \uC0AC\uC774\uB4DC\uBC14\uC5D0\uC11C NotebookLM \uBDF0\uB97C \uC5FD\uB2C8\uB2E4"}),t.createEl("p",{text:"2. Google \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD569\uB2C8\uB2E4"}),t.createEl("p",{text:'3. \uB178\uD2B8\uB97C \uC120\uD0DD\uD558\uACE0 "NotebookLM\uC5D0 \uC804\uC1A1" \uBA85\uB839\uC744 \uC2E4\uD589\uD569\uB2C8\uB2E4'}),t.createEl("p",{text:"4. \uB300\uC0C1 \uB178\uD2B8\uBD81\uC744 \uC120\uD0DD\uD558\uBA74 \uB178\uD2B8\uAC00 \uC18C\uC2A4\uB85C \uCD94\uAC00\uB429\uB2C8\uB2E4"})}};
