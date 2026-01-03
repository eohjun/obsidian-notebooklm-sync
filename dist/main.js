"use strict";var b=Object.defineProperty;var f=Object.getOwnPropertyDescriptor;var g=Object.getOwnPropertyNames;var v=Object.prototype.hasOwnProperty;var k=(c,i)=>{for(var t in i)b(c,t,{get:i[t],enumerable:!0})},x=(c,i,t,e)=>{if(i&&typeof i=="object"||typeof i=="function")for(let o of g(i))!v.call(c,o)&&o!==t&&b(c,o,{get:()=>i[o],enumerable:!(e=f(i,o))||e.enumerable});return c};var y=c=>x(b({},"__esModule",{value:!0}),c);var E={};k(E,{default:()=>h});module.exports=y(E);var n=require("obsidian"),u="notebooklm-sync-view",S={zettelkastenFolder:"04_Zettelkasten",includeMetadata:!0,includeFrontmatter:!1,autoOpenView:!1},h=class extends n.Plugin{constructor(){super(...arguments);this.noteQueue=new Map;this.isProcessing=!1;this.shouldStop=!1}async onload(){await this.loadSettings(),this.registerView(u,t=>new w(t,this)),this.statusBarItem=this.addStatusBarItem(),this.updateStatusBar(),this.addRibbonIcon("send","NotebookLM\uC5D0 \uD604\uC7AC \uB178\uD2B8 \uC804\uC1A1",async()=>{await this.sendCurrentNote()}),this.addRibbonIcon("book-open","NotebookLM \uC5F4\uAE30",async()=>{await this.activateView()}),this.addCommand({id:"send-current-note",name:"\uD604\uC7AC \uB178\uD2B8\uB97C NotebookLM\uC5D0 \uC804\uC1A1",editorCallback:async()=>{await this.sendCurrentNote()}}),this.addCommand({id:"send-selection",name:"\uC120\uD0DD\uB41C \uD14D\uC2A4\uD2B8\uB97C NotebookLM\uC5D0 \uC804\uC1A1",editorCallback:async(t,e)=>{let o=t.getSelection();o?await this.sendText(o,e.file?.basename||"Selection"):new n.Notice("\uD14D\uC2A4\uD2B8\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694")}}),this.addCommand({id:"send-all-notes",name:"\uBAA8\uB4E0 \uC601\uAD6C \uB178\uD2B8\uB97C NotebookLM\uC5D0 \uC804\uC1A1",callback:async()=>{await this.sendAllPermanentNotes()}}),this.addCommand({id:"open-notebooklm",name:"NotebookLM \uC5F4\uAE30",callback:async()=>{await this.activateView()}}),this.registerEvent(this.app.workspace.on("file-menu",(t,e)=>{e instanceof n.TFile&&e.extension==="md"&&t.addItem(o=>{o.setTitle("NotebookLM\uC5D0 \uC804\uC1A1").setIcon("send").onClick(async()=>{await this.sendFile(e)})})})),this.registerEvent(this.app.workspace.on("editor-menu",(t,e,o)=>{t.addItem(r=>{r.setTitle("NotebookLM\uC5D0 \uC804\uC1A1").setIcon("send").onClick(async()=>{await this.sendCurrentNote()})});let s=e.getSelection();s&&t.addItem(r=>{r.setTitle("\uC120\uD0DD \uC601\uC5ED\uC744 NotebookLM\uC5D0 \uC804\uC1A1").setIcon("text-select").onClick(async()=>{await this.sendText(s,o.file?.basename||"Selection")})})})),this.addSettingTab(new m(this.app,this)),this.settings.autoOpenView&&this.app.workspace.onLayoutReady(()=>{this.activateView()})}async onunload(){this.app.workspace.detachLeavesOfType(u)}async loadSettings(){this.settings=Object.assign({},S,await this.loadData())}async saveSettings(){await this.saveData(this.settings)}updateStatusBar(){let t=this.noteQueue.size,e=Array.from(this.noteQueue.values()).filter(o=>o.status==="pending"||o.status==="sending").length;e>0?(this.statusBarItem.setText(`\u{1F4E4} NLM: ${e}`),this.statusBarItem.setAttribute("title",`NotebookLM \uB3D9\uAE30\uD654 \uB300\uAE30: ${e}\uAC1C`)):t>0?(this.statusBarItem.setText(`\u{1F4D8} NLM: ${t}`),this.statusBarItem.setAttribute("title",`NotebookLM \uC804\uC1A1 \uC644\uB8CC: ${t}\uAC1C`)):(this.statusBarItem.setText("\u{1F4D8} NLM"),this.statusBarItem.setAttribute("title","NotebookLM Sync \uC900\uBE44\uB428"))}async activateView(){let t=this.app.workspace.getLeavesOfType(u);if(t.length>0)this.app.workspace.revealLeaf(t[0]);else{let e=this.app.workspace.getRightLeaf(!1);e&&(await e.setViewState({type:u,active:!0}),this.app.workspace.revealLeaf(e))}}getView(){let t=this.app.workspace.getLeavesOfType(u);return t.length>0?t[0].view:null}isPermanentNote(t){let e=this.settings.zettelkastenFolder;return t.path.startsWith(e)&&t.extension==="md"&&/^\d{12}/.test(t.basename)}async getNoteData(t){let e=await this.app.vault.cachedRead(t),o=this.app.metadataCache.getFileCache(t),s=e;this.settings.includeFrontmatter||(s=s.replace(/^---[\s\S]*?---\n?/,""));let r={title:t.basename,content:s,path:t.path};return this.settings.includeMetadata&&(r.metadata={created:t.stat.ctime,modified:t.stat.mtime,tags:o?.tags?.map(a=>a.tag)||[]}),r}async sendCurrentNote(){let t=this.app.workspace.getActiveFile();if(!t){new n.Notice("\uC5F4\uB824\uC788\uB294 \uB178\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4");return}await this.sendFile(t)}async sendFile(t){let e=await this.getNoteData(t);await this.queueNote(e)}async sendText(t,e){let o={title:e,content:t,path:""};await this.queueNote(o)}async sendAllPermanentNotes(){let t=this.app.vault.getMarkdownFiles().filter(o=>this.isPermanentNote(o));if(t.length===0){new n.Notice(`${this.settings.zettelkastenFolder} \uD3F4\uB354\uC5D0 \uC601\uAD6C \uB178\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4`);return}new n.Notice(`${t.length}\uAC1C\uC758 \uC601\uAD6C \uB178\uD2B8\uB97C \uC804\uC1A1 \uC900\uBE44 \uC911...`);for(let o of t){let s=await this.getNoteData(o);await this.queueNote(s,!1)}new n.Notice(`${t.length}\uAC1C \uB178\uD2B8\uAC00 \uB300\uAE30\uC5F4\uC5D0 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4`),this.updateStatusBar(),await this.activateView();let e=this.getView();e&&e.showQueuePanel()}async queueNote(t,e=!0){let o=t.path||`text-${Date.now()}`;if(this.noteQueue.set(o,{id:o,note:t,status:"pending"}),this.updateStatusBar(),e){await this.activateView();let s=this.getView();s&&s.showQueuePanel()}}async processQueue(t){let e=this.getView();if(!e||!e.webview){new n.Notice("NotebookLM \uBDF0\uAC00 \uC5F4\uB824\uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4");return}let o=Array.from(this.noteQueue.values()).filter(a=>a.status==="pending");if(o.length===0){new n.Notice("\uC804\uC1A1\uD560 \uB178\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4");return}this.isProcessing=!0,this.shouldStop=!1,new n.Notice(`${o.length}\uAC1C \uB178\uD2B8 \uC804\uC1A1 \uC2DC\uC791...`),e.updateQueueList();for(let a of o){if(this.shouldStop){new n.Notice("\u23F9\uFE0F \uC804\uC1A1\uC774 \uC911\uC9C0\uB418\uC5C8\uC2B5\uB2C8\uB2E4");break}a.status="sending",this.updateStatusBar(),e.updateQueueList();try{await e.addSourceToNotebook(a.note),a.status="sent",new n.Notice(`\u2713 ${a.note.title} \uC804\uC1A1 \uC644\uB8CC`)}catch(l){a.status="failed",a.error=l instanceof Error?l.message:String(l),new n.Notice(`\u2717 ${a.note.title} \uC804\uC1A1 \uC2E4\uD328: ${a.error}`)}this.updateStatusBar(),e.updateQueueList(),this.shouldStop||await this.delay(2e3)}this.isProcessing=!1,this.shouldStop=!1,e.updateQueueList();let s=Array.from(this.noteQueue.values()).filter(a=>a.status==="sent").length,r=Array.from(this.noteQueue.values()).filter(a=>a.status==="failed").length;new n.Notice(`\uC804\uC1A1 \uC644\uB8CC: \uC131\uACF5 ${s}\uAC1C, \uC2E4\uD328 ${r}\uAC1C`)}stopProcessing(){this.isProcessing&&(this.shouldStop=!0,new n.Notice("\u23F9\uFE0F \uC804\uC1A1 \uC911\uC9C0 \uC694\uCCAD\uB428..."))}clearQueue(){this.noteQueue.clear(),this.updateStatusBar()}delay(t){return new Promise(e=>setTimeout(e,t))}},w=class extends n.ItemView{constructor(t,e){super(t);this.webview=null;this.isLoggedIn=!1;this.plugin=e}getViewType(){return u}getDisplayText(){return"NotebookLM"}getIcon(){return"book-open"}async onOpen(){let t=this.containerEl.children[1];t.empty(),t.addClass("notebooklm-view-container"),this.buildToolbar(t),this.buildQueuePanel(t),this.buildWebviewContainer(t),this.initWebview()}async onClose(){this.webview&&(this.webview.remove(),this.webview=null)}buildToolbar(t){this.toolbarEl=t.createDiv({cls:"nlm-toolbar"});let e=this.toolbarEl.createDiv({cls:"nlm-status"});e.createSpan({cls:"nlm-status-dot"}),e.createSpan({cls:"nlm-status-text",text:"\uC5F0\uACB0 \uC911..."});let o=this.toolbarEl.createDiv({cls:"nlm-toolbar-buttons"}),s=o.createEl("button",{cls:"nlm-btn"});s.createSpan({text:"\u21BB \uC0C8\uB85C\uACE0\uCE68"}),s.addEventListener("click",()=>this.refresh());let r=o.createEl("button",{cls:"nlm-btn"});r.createSpan({text:"\u{1F3E0} \uD648"}),r.addEventListener("click",()=>this.goHome());let a=o.createEl("button",{cls:"nlm-btn nlm-btn-primary"});a.createSpan({text:"\u{1F4CB} \uB300\uAE30\uC5F4"}),a.addEventListener("click",()=>this.toggleQueuePanel())}buildQueuePanel(t){this.queuePanelEl=t.createDiv({cls:"nlm-queue-panel hidden"});let e=this.queuePanelEl.createDiv({cls:"nlm-queue-header"});e.createEl("h3",{text:"\u{1F4CB} \uC804\uC1A1 \uB300\uAE30\uC5F4"}),e.createEl("button",{cls:"nlm-btn-icon",text:"\u2715"}).addEventListener("click",()=>this.hideQueuePanel()),this.queuePanelEl.createDiv({cls:"nlm-queue-content"}).createDiv({cls:"nlm-queue-list"});let r=this.queuePanelEl.createDiv({cls:"nlm-queue-actions"})}updateQueueActions(){let t=this.queuePanelEl.querySelector(".nlm-queue-actions");if(t)if(t.empty(),this.plugin.isProcessing){let e=t.createEl("button",{cls:"nlm-btn nlm-btn-danger"});e.createSpan({text:"\u23F9\uFE0F \uC804\uC1A1 \uC911\uC9C0"}),e.addEventListener("click",()=>{this.plugin.stopProcessing()})}else{let e=t.createEl("button",{cls:"nlm-btn nlm-btn-primary"});e.createSpan({text:"\u{1F4E4} \uBAA8\uB450 \uC804\uC1A1"}),e.addEventListener("click",()=>this.sendAllQueued());let o=t.createEl("button",{cls:"nlm-btn"});o.createSpan({text:"\u{1F5D1}\uFE0F \uB300\uAE30\uC5F4 \uBE44\uC6B0\uAE30"}),o.addEventListener("click",()=>{this.plugin.clearQueue(),this.updateQueueList()})}}buildWebviewContainer(t){this.webviewContainerEl=t.createDiv({cls:"nlm-webview-container"})}initWebview(){this.webview=document.createElement("webview"),this.webview.setAttribute("src","https://notebooklm.google.com"),this.webview.setAttribute("partition","persist:notebooklm"),this.webview.setAttribute("httpreferrer","https://google.com"),this.webview.setAttribute("allowpopups","true"),this.webview.addClass("nlm-webview"),this.webviewContainerEl.appendChild(this.webview),this.webview.addEventListener("did-start-loading",()=>{this.updateStatus("loading","\uB85C\uB529 \uC911...")}),this.webview.addEventListener("did-finish-load",()=>{this.checkLoginStatus()}),this.webview.addEventListener("did-fail-load",()=>{this.updateStatus("error","\uB85C\uB4DC \uC2E4\uD328")})}async checkLoginStatus(){if(this.webview)try{let t=await this.webview.executeJavaScript(`
        (function() {
          // Check if logged in by looking for user avatar or logout button
          const avatar = document.querySelector('[aria-label*="Google"], img[src*="googleusercontent"]');
          const logoutBtn = document.querySelector('[aria-label*="\uB85C\uADF8\uC544\uC6C3"], [aria-label*="Sign out"]');
          const projectList = document.querySelector('project-button, .project-table, [class*="notebook"]');
          return !!(avatar || logoutBtn || projectList);
        })();
      `);this.isLoggedIn=t,t?this.updateStatus("connected","\uC5F0\uACB0\uB428"):this.updateStatus("disconnected","\uB85C\uADF8\uC778 \uD544\uC694")}catch{this.updateStatus("error","\uC0C1\uD0DC \uD655\uC778 \uC2E4\uD328")}}updateStatus(t,e){let o=this.toolbarEl.querySelector(".nlm-status-dot"),s=this.toolbarEl.querySelector(".nlm-status-text");o&&(o.className=`nlm-status-dot nlm-status-${t}`),s&&(s.textContent=e)}refresh(){this.webview?.reload()}goHome(){this.webview?.loadURL("https://notebooklm.google.com")}async isOnHomePage(){if(!this.webview)return!1;try{return await this.webview.executeJavaScript(`
        (function() {
          const url = window.location.href;
          // \uD648 \uD398\uC774\uC9C0: notebooklm.google.com \uB610\uB294 notebooklm.google.com/ (\uB178\uD2B8\uBD81 ID \uC5C6\uC74C)
          // \uB178\uD2B8\uBD81 \uD398\uC774\uC9C0: notebooklm.google.com/notebook/XXXX
          return !url.includes('/notebook/');
        })();
      `)}catch{return!1}}async ensureHomePage(){if(!this.webview)return!1;if(await this.isOnHomePage())return!0;new n.Notice("\u{1F4CD} NotebookLM \uD648\uC73C\uB85C \uC774\uB3D9 \uC911..."),this.webview.loadURL("https://notebooklm.google.com");let e=20;for(let o=0;o<e;o++)if(await this.plugin.delay(500),await this.webview.executeJavaScript(`
        (function() {
          // \uD648 \uD398\uC774\uC9C0 \uB85C\uB4DC \uC644\uB8CC \uD655\uC778: \uB178\uD2B8\uBD81 \uBAA9\uB85D \uC694\uC18C \uC874\uC7AC
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

          // URL\uC774 \uD648\uC774\uACE0 \uB85C\uB529\uC774 \uB05D\uB0AC\uB294\uC9C0 \uD655\uC778
          const url = window.location.href;
          const isHomeUrl = !url.includes('/notebook/');
          const hasContent = document.body.textContent.length > 100;
          return isHomeUrl && hasContent;
        })();
      `))return new n.Notice("\u2705 \uD648 \uD398\uC774\uC9C0 \uB85C\uB4DC \uC644\uB8CC"),await this.plugin.delay(500),!0;return new n.Notice("\u26A0\uFE0F \uD648 \uD398\uC774\uC9C0 \uB85C\uB4DC \uC2DC\uAC04 \uCD08\uACFC"),!1}showQueuePanel(){this.queuePanelEl.removeClass("hidden"),this.updateQueueList()}hideQueuePanel(){this.queuePanelEl.addClass("hidden")}toggleQueuePanel(){this.queuePanelEl.hasClass("hidden")?this.showQueuePanel():this.hideQueuePanel()}updateQueueList(){let t=this.queuePanelEl.querySelector(".nlm-queue-list");if(!t)return;t.empty();let e=Array.from(this.plugin.noteQueue.values());if(e.length===0){t.createDiv({cls:"nlm-queue-empty",text:"\uB300\uAE30\uC5F4\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4"}),this.updateQueueActions();return}for(let o of e){let s=t.createDiv({cls:`nlm-queue-item nlm-queue-${o.status}`}),r=s.createSpan({cls:"nlm-queue-icon"});switch(o.status){case"pending":r.textContent="\u23F3";break;case"sending":r.textContent="\u{1F4E4}";break;case"sent":r.textContent="\u2705";break;case"failed":r.textContent="\u274C";break}let a=s.createDiv({cls:"nlm-queue-info"});a.createDiv({cls:"nlm-queue-title",text:o.note.title}),o.error&&a.createDiv({cls:"nlm-queue-error",text:o.error}),o.status!=="sending"&&s.createEl("button",{cls:"nlm-btn-icon",text:"\u2715"}).addEventListener("click",()=>{this.plugin.noteQueue.delete(o.id),this.updateQueueList(),this.plugin.updateStatusBar()})}this.updateQueueActions()}async sendAllQueued(){if(!this.isLoggedIn){new n.Notice("NotebookLM\uC5D0 \uBA3C\uC800 \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694");return}if(!await this.ensureHomePage()){new n.Notice("NotebookLM \uD648\uC73C\uB85C \uC774\uB3D9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC218\uB3D9\uC73C\uB85C \uD648 \uBC84\uD2BC\uC744 \uD074\uB9AD\uD574\uC8FC\uC138\uC694.");return}let e=[];for(let o=0;o<10&&(e=await this.getNotebooks(),!(e.length>0));o++)o===0&&new n.Notice("\u{1F4CB} \uB178\uD2B8\uBD81 \uBAA9\uB85D \uB85C\uB529 \uC911..."),await this.plugin.delay(1e3);if(e.length===0){new n.Notice("\uB178\uD2B8\uBD81\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. NotebookLM\uC5D0\uC11C \uB178\uD2B8\uBD81\uC744 \uC0DD\uC131\uD574\uC8FC\uC138\uC694.");return}new p(this.app,this.plugin,e,async o=>{o&&(await this.navigateToNotebook(o),await this.plugin.delay(2e3),await this.plugin.processQueue(o.id),this.updateQueueList())}).open()}async getNotebooks(){if(!this.webview)return[];try{return await this.webview.executeJavaScript(`
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
      `)||[]}catch{return[]}}async navigateToNotebook(t){if(this.webview){if(new n.Notice(`\u{1F4C2} "${t.title}" \uB178\uD2B8\uBD81\uC73C\uB85C \uC774\uB3D9 \uC911...`),t.url)this.webview.loadURL(t.url);else if(!await this.webview.executeJavaScript(`
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
      `))return;throw new Error("\uB178\uD2B8\uBD81 \uD398\uC774\uC9C0 \uB85C\uB4DC \uC2DC\uAC04 \uCD08\uACFC")}async addSourceToNotebook(t){if(!this.webview)throw new Error("WebView not ready");let e=t.content;if(t.metadata){let s=[];t.metadata.tags?.length&&s.push(`Tags: ${t.metadata.tags.join(", ")}`),s.length>0&&(e=s.join(`
`)+`

`+e)}e=`# ${t.title}

${e}`,!await this.addSourceViaAPI(t.title,e)&&(new n.Notice("API \uC2E4\uD328. DOM \uBC29\uC2DD\uC73C\uB85C \uC7AC\uC2DC\uB3C4..."),await this.addSourceViaDOM(t.title,e))}async addSourceViaAPI(t,e){if(!this.webview)return!1;try{new n.Notice(`"${t}" API\uB85C \uCD94\uAC00 \uC911...`);let o=await this.webview.executeJavaScript(`
        (function() {
          const match = window.location.pathname.match(/\\/notebook\\/([^/]+)/);
          const notebookId = match ? match[1] : null;

          let atToken = null;
          // WIZ_global_data\uC5D0\uC11C \uBA3C\uC800 \uCC3E\uAE30
          if (window.WIZ_global_data && window.WIZ_global_data.SNlM0e) {
            atToken = window.WIZ_global_data.SNlM0e;
          }
          // script \uD0DC\uADF8\uC5D0\uC11C \uCC3E\uAE30
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
      `);if(console.log("[NotebookLM Sync] Page info:",o),!o.notebookId)return console.log("[NotebookLM Sync] No notebook ID found"),!1;if(!o.atToken)return console.log("[NotebookLM Sync] No auth token found"),!1;let s=Buffer.from(t,"utf-8").toString("base64"),r=Buffer.from(e,"utf-8").toString("base64"),a="obsidian_"+Date.now();await this.webview.executeJavaScript(`
        (function() {
          function decodeBase64UTF8(base64) {
            var binary = atob(base64);
            var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            return new TextDecoder('utf-8').decode(bytes);
          }

          var notebookId = "${o.notebookId}";
          var atToken = "${o.atToken}";
          var title = decodeBase64UTF8("${s}");
          var content = decodeBase64UTF8("${r}");
          var requestId = "${a}";

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
      `);let l=null;for(let d=0;d<20&&(await this.plugin.delay(500),l=await this.webview.executeJavaScript(`
          (function() {
            var r = window['__nlm_result_${a}'];
            if (r && !r.pending) {
              delete window['__nlm_result_${a}'];
              return r;
            }
            return null;
          })();
        `),!l);d++);return console.log("[NotebookLM Sync] API result:",l),l?.success?(new n.Notice(`\u2705 "${t}" \uC18C\uC2A4 \uCD94\uAC00 \uC644\uB8CC!`),!0):!1}catch(o){return console.error("[NotebookLM Sync] API failed:",o),!1}}async addSourceViaDOM(t,e){if(!this.webview)throw new Error("WebView not ready");new n.Notice(`"${t}" DOM \uBC29\uC2DD\uC73C\uB85C \uCD94\uAC00 \uC911...`);let o=await this.webview.executeJavaScript(`
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
    `);if(!o?.success)throw new Error(o?.error||"\uC18C\uC2A4 \uCD94\uAC00 \uBC84\uD2BC\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4");await this.plugin.delay(1500);let s=await this.webview.executeJavaScript(`
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
    `);if(!s?.success){let l=s?.availableOptions?.join(", ")||"none";throw console.log("NotebookLM Sync - Available options:",l),new Error(`${s?.error||"\uD14D\uC2A4\uD2B8 \uBD99\uC5EC\uB123\uAE30 \uC635\uC158\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4"} [\uC635\uC158: ${l}]`)}await this.plugin.delay(1500);let r=await this.webview.executeJavaScript(`
      (function() {
        const content = ${JSON.stringify(e)};

        // \uC815\uD655\uD55C \uC140\uB809\uD130: textarea.text-area (star-notebooklm\uC5D0\uC11C \uAC80\uC99D\uB428)
        let textarea = document.querySelector('textarea.text-area');

        // \uC5C6\uC73C\uBA74 \uB2E4\uC774\uC5BC\uB85C\uADF8 \uB0B4 textarea \uCC3E\uAE30
        if (!textarea) {
          const modal = document.querySelector('.upload-dialog-panel, [role="dialog"], mat-dialog-container, mat-bottom-sheet-container');
          if (modal) {
            textarea = modal.querySelector('textarea');
          }
        }

        // \uADF8\uB798\uB3C4 \uC5C6\uC73C\uBA74 \uC77C\uBC18 visible textarea
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
          // Angular/React \uB4F1\uC5D0\uC11C \uAC12 \uBCC0\uACBD \uAC10\uC9C0\uB97C \uC704\uD574 \uC5EC\uB7EC \uC774\uBCA4\uD2B8 \uBC1C\uC0DD
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
    `);if(console.log("[NotebookLM Sync] Step 3 result:",r),!r?.success){try{await navigator.clipboard.writeText(e),new n.Notice(`\u{1F4CB} \uC790\uB3D9 \uC785\uB825 \uC2E4\uD328. \uD074\uB9BD\uBCF4\uB4DC\uC5D0 \uBCF5\uC0AC\uB428.

Cmd/Ctrl+V\uB85C \uBD99\uC5EC\uB123\uAE30 \uD6C4 \uC0BD\uC785 \uD074\uB9AD`,8e3)}catch{throw new Error(`\uD14D\uC2A4\uD2B8 \uC785\uB825\uB780\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4 (textarea count: ${r?.textareaCount||0})`)}return}await this.plugin.delay(800);let a=await this.webview.executeJavaScript(`
      (function() {
        const buttons = document.querySelectorAll('button');
        // \uC815\uD655\uD55C \uD14D\uC2A4\uD2B8 \uB9E4\uCE6D \uBA3C\uC800
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim();
          if ((text === '\uC0BD\uC785' || text === 'Insert') && !btn.disabled) {
            btn.click();
            console.log('[NotebookLM Sync] Clicked \uC0BD\uC785 button');
            return { success: true, text: text };
          }
        }

        // disabled \uC0C1\uD0DC\uC778 \uACBD\uC6B0 \uC54C\uB9BC
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim();
          if (text === '\uC0BD\uC785' || text === 'Insert') {
            return { success: false, error: '\uC0BD\uC785 button is disabled', disabled: true };
          }
        }

        return { success: false, error: '\uC0BD\uC785 button not found' };
      })();
    `);console.log("[NotebookLM Sync] Step 4 result:",a),a?.success?new n.Notice(`\u2705 "${t}" \uC18C\uC2A4\uAC00 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4!`):a?.disabled?new n.Notice(`\u{1F4DD} \uD14D\uC2A4\uD2B8 \uC785\uB825 \uC644\uB8CC!
"\uC0BD\uC785" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD574\uC8FC\uC138\uC694.`,5e3):new n.Notice(`\u{1F4DD} \uD14D\uC2A4\uD2B8 \uC785\uB825 \uC644\uB8CC!
"\uC0BD\uC785" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD574\uC8FC\uC138\uC694.`,5e3),await this.plugin.delay(1500)}},p=class extends n.Modal{constructor(i,t,e,o){super(i),this.plugin=t,this.notebooks=e,this.onSelect=o}onOpen(){let{contentEl:i}=this;i.empty(),i.addClass("nlm-modal"),i.createEl("h2",{text:"\u{1F4DA} \uB178\uD2B8\uBD81 \uC120\uD0DD"}),i.createEl("p",{cls:"nlm-modal-desc",text:"\uB178\uD2B8\uB97C \uCD94\uAC00\uD560 NotebookLM \uB178\uD2B8\uBD81\uC744 \uC120\uD0DD\uD558\uC138\uC694."});let t=Array.from(this.plugin.noteQueue.values()).filter(l=>l.status==="pending").length;t>0&&i.createDiv({cls:"nlm-modal-summary"}).createSpan({text:`\u{1F4CB} ${t}\uAC1C \uB178\uD2B8 \uC804\uC1A1 \uB300\uAE30 \uC911`});let e=i.createDiv({cls:"nlm-notebook-list"});for(let l of this.notebooks){let d=e.createDiv({cls:"nlm-notebook-item"});d.createDiv({cls:"nlm-notebook-info"}).createDiv({cls:"nlm-notebook-title",text:l.title}),d.addEventListener("click",()=>{this.onSelect(l),this.close()})}let o=e.createDiv({cls:"nlm-notebook-item nlm-notebook-new"});o.createSpan({cls:"nlm-notebook-icon",text:"\u2795"});let s=o.createDiv({cls:"nlm-notebook-info"});s.createDiv({cls:"nlm-notebook-title",text:"\uC0C8 \uB178\uD2B8\uBD81 \uB9CC\uB4E4\uAE30"}),s.createDiv({cls:"nlm-notebook-desc",text:"NotebookLM\uC5D0\uC11C \uC0C8 \uB178\uD2B8\uBD81\uC744 \uC0DD\uC131\uD569\uB2C8\uB2E4"}),o.addEventListener("click",()=>{new n.Notice("NotebookLM\uC5D0\uC11C \uC0C8 \uB178\uD2B8\uBD81\uC744 \uB9CC\uB4E0 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694"),this.close()}),i.createDiv({cls:"nlm-modal-footer"}).createEl("button",{text:"\uCDE8\uC18C"}).addEventListener("click",()=>this.close())}onClose(){this.contentEl.empty()}},m=class extends n.PluginSettingTab{constructor(i,t){super(i,t),this.plugin=t}display(){let{containerEl:i}=this;i.empty(),i.createEl("h2",{text:"NotebookLM Sync \uC124\uC815"}),i.createEl("h3",{text:"\uC77C\uBC18"}),new n.Setting(i).setName("Zettelkasten \uD3F4\uB354").setDesc("\uC601\uAD6C \uB178\uD2B8\uAC00 \uC800\uC7A5\uB41C \uD3F4\uB354 (YYYYMMDDHHMM \uD615\uC2DD)").addText(e=>e.setPlaceholder("04_Zettelkasten").setValue(this.plugin.settings.zettelkastenFolder).onChange(async o=>{this.plugin.settings.zettelkastenFolder=o,await this.plugin.saveSettings()})),new n.Setting(i).setName("\uC2DC\uC791 \uC2DC \uC790\uB3D9 \uC5F4\uAE30").setDesc("Obsidian \uC2DC\uC791 \uC2DC NotebookLM \uBDF0\uB97C \uC790\uB3D9\uC73C\uB85C \uC5FD\uB2C8\uB2E4").addToggle(e=>e.setValue(this.plugin.settings.autoOpenView).onChange(async o=>{this.plugin.settings.autoOpenView=o,await this.plugin.saveSettings()})),i.createEl("h3",{text:"\uCF58\uD150\uCE20"}),new n.Setting(i).setName("\uBA54\uD0C0\uB370\uC774\uD130 \uD3EC\uD568").setDesc("\uB178\uD2B8 \uC804\uC1A1 \uC2DC \uD0DC\uADF8 \uB4F1 \uBA54\uD0C0\uB370\uC774\uD130\uB97C \uD3EC\uD568\uD569\uB2C8\uB2E4").addToggle(e=>e.setValue(this.plugin.settings.includeMetadata).onChange(async o=>{this.plugin.settings.includeMetadata=o,await this.plugin.saveSettings()})),new n.Setting(i).setName("Frontmatter \uD3EC\uD568").setDesc("YAML frontmatter\uB97C \uB178\uD2B8 \uB0B4\uC6A9\uC5D0 \uD3EC\uD568\uD569\uB2C8\uB2E4").addToggle(e=>e.setValue(this.plugin.settings.includeFrontmatter).onChange(async o=>{this.plugin.settings.includeFrontmatter=o,await this.plugin.saveSettings()})),i.createEl("h3",{text:"\uC0AC\uC6A9\uBC95"});let t=i.createDiv({cls:"nlm-settings-info"});t.createEl("p",{text:"1. \uC624\uB978\uCABD \uC0AC\uC774\uB4DC\uBC14\uC5D0\uC11C NotebookLM \uBDF0\uB97C \uC5FD\uB2C8\uB2E4"}),t.createEl("p",{text:"2. Google \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD569\uB2C8\uB2E4"}),t.createEl("p",{text:'3. \uB178\uD2B8\uB97C \uC120\uD0DD\uD558\uACE0 "NotebookLM\uC5D0 \uC804\uC1A1" \uBA85\uB839\uC744 \uC2E4\uD589\uD569\uB2C8\uB2E4'}),t.createEl("p",{text:"4. \uB300\uC0C1 \uB178\uD2B8\uBD81\uC744 \uC120\uD0DD\uD558\uBA74 \uB178\uD2B8\uAC00 \uC18C\uC2A4\uB85C \uCD94\uAC00\uB429\uB2C8\uB2E4"})}};
