"use strict";var b=Object.defineProperty;var g=Object.getOwnPropertyDescriptor;var v=Object.getOwnPropertyNames;var f=Object.prototype.hasOwnProperty;var k=(c,o)=>{for(var t in o)b(c,t,{get:o[t],enumerable:!0})},E=(c,o,t,e)=>{if(o&&typeof o=="object"||typeof o=="function")for(let n of v(o))!f.call(c,n)&&n!==t&&b(c,n,{get:()=>o[n],enumerable:!(e=g(o,n))||e.enumerable});return c};var y=c=>E(b({},"__esModule",{value:!0}),c);var S={};k(S,{default:()=>d});module.exports=y(S);var s=require("obsidian"),u="notebooklm-sync-view",x={zettelkastenFolder:"04_Zettelkasten",includeMetadata:!0,includeFrontmatter:!1,autoOpenView:!1},d=class extends s.Plugin{constructor(){super(...arguments);this.noteQueue=new Map}async onload(){await this.loadSettings(),this.registerView(u,t=>new m(t,this)),this.statusBarItem=this.addStatusBarItem(),this.updateStatusBar(),this.addRibbonIcon("send","NotebookLM\uC5D0 \uD604\uC7AC \uB178\uD2B8 \uC804\uC1A1",async()=>{await this.sendCurrentNote()}),this.addRibbonIcon("book-open","NotebookLM \uC5F4\uAE30",async()=>{await this.activateView()}),this.addCommand({id:"send-current-note",name:"\uD604\uC7AC \uB178\uD2B8\uB97C NotebookLM\uC5D0 \uC804\uC1A1",editorCallback:async()=>{await this.sendCurrentNote()}}),this.addCommand({id:"send-selection",name:"\uC120\uD0DD\uB41C \uD14D\uC2A4\uD2B8\uB97C NotebookLM\uC5D0 \uC804\uC1A1",editorCallback:async(t,e)=>{let n=t.getSelection();n?await this.sendText(n,e.file?.basename||"Selection"):new s.Notice("\uD14D\uC2A4\uD2B8\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694")}}),this.addCommand({id:"send-all-notes",name:"\uBAA8\uB4E0 \uC601\uAD6C \uB178\uD2B8\uB97C NotebookLM\uC5D0 \uC804\uC1A1",callback:async()=>{await this.sendAllPermanentNotes()}}),this.addCommand({id:"open-notebooklm",name:"NotebookLM \uC5F4\uAE30",callback:async()=>{await this.activateView()}}),this.registerEvent(this.app.workspace.on("file-menu",(t,e)=>{e instanceof s.TFile&&e.extension==="md"&&t.addItem(n=>{n.setTitle("NotebookLM\uC5D0 \uC804\uC1A1").setIcon("send").onClick(async()=>{await this.sendFile(e)})})})),this.registerEvent(this.app.workspace.on("editor-menu",(t,e,n)=>{t.addItem(l=>{l.setTitle("NotebookLM\uC5D0 \uC804\uC1A1").setIcon("send").onClick(async()=>{await this.sendCurrentNote()})});let i=e.getSelection();i&&t.addItem(l=>{l.setTitle("\uC120\uD0DD \uC601\uC5ED\uC744 NotebookLM\uC5D0 \uC804\uC1A1").setIcon("text-select").onClick(async()=>{await this.sendText(i,n.file?.basename||"Selection")})})})),this.addSettingTab(new w(this.app,this)),this.settings.autoOpenView&&this.app.workspace.onLayoutReady(()=>{this.activateView()})}async onunload(){this.app.workspace.detachLeavesOfType(u)}async loadSettings(){this.settings=Object.assign({},x,await this.loadData())}async saveSettings(){await this.saveData(this.settings)}updateStatusBar(){let t=this.noteQueue.size,e=Array.from(this.noteQueue.values()).filter(n=>n.status==="pending"||n.status==="sending").length;e>0?(this.statusBarItem.setText(`\u{1F4E4} NLM: ${e}`),this.statusBarItem.setAttribute("title",`NotebookLM \uB3D9\uAE30\uD654 \uB300\uAE30: ${e}\uAC1C`)):t>0?(this.statusBarItem.setText(`\u{1F4D8} NLM: ${t}`),this.statusBarItem.setAttribute("title",`NotebookLM \uC804\uC1A1 \uC644\uB8CC: ${t}\uAC1C`)):(this.statusBarItem.setText("\u{1F4D8} NLM"),this.statusBarItem.setAttribute("title","NotebookLM Sync \uC900\uBE44\uB428"))}async activateView(){let t=this.app.workspace.getLeavesOfType(u);if(t.length>0)this.app.workspace.revealLeaf(t[0]);else{let e=this.app.workspace.getRightLeaf(!1);e&&(await e.setViewState({type:u,active:!0}),this.app.workspace.revealLeaf(e))}}getView(){let t=this.app.workspace.getLeavesOfType(u);return t.length>0?t[0].view:null}isPermanentNote(t){let e=this.settings.zettelkastenFolder;return t.path.startsWith(e)&&t.extension==="md"&&/^\d{12}/.test(t.basename)}async getNoteData(t){let e=await this.app.vault.cachedRead(t),n=this.app.metadataCache.getFileCache(t),i=e;this.settings.includeFrontmatter||(i=i.replace(/^---[\s\S]*?---\n?/,""));let l={title:t.basename,content:i,path:t.path};return this.settings.includeMetadata&&(l.metadata={created:t.stat.ctime,modified:t.stat.mtime,tags:n?.tags?.map(a=>a.tag)||[]}),l}async sendCurrentNote(){let t=this.app.workspace.getActiveFile();if(!t){new s.Notice("\uC5F4\uB824\uC788\uB294 \uB178\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4");return}await this.sendFile(t)}async sendFile(t){let e=await this.getNoteData(t);await this.queueNote(e)}async sendText(t,e){let n={title:e,content:t,path:""};await this.queueNote(n)}async sendAllPermanentNotes(){let t=this.app.vault.getMarkdownFiles().filter(n=>this.isPermanentNote(n));if(t.length===0){new s.Notice(`${this.settings.zettelkastenFolder} \uD3F4\uB354\uC5D0 \uC601\uAD6C \uB178\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4`);return}new s.Notice(`${t.length}\uAC1C\uC758 \uC601\uAD6C \uB178\uD2B8\uB97C \uC804\uC1A1 \uC900\uBE44 \uC911...`);for(let n of t){let i=await this.getNoteData(n);await this.queueNote(i,!1)}new s.Notice(`${t.length}\uAC1C \uB178\uD2B8\uAC00 \uB300\uAE30\uC5F4\uC5D0 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4`),this.updateStatusBar(),await this.activateView();let e=this.getView();e&&e.showQueuePanel()}async queueNote(t,e=!0){let n=t.path||`text-${Date.now()}`;if(this.noteQueue.set(n,{id:n,note:t,status:"pending"}),this.updateStatusBar(),e){await this.activateView();let i=this.getView();i&&i.showQueuePanel()}}async processQueue(t){let e=this.getView();if(!e||!e.webview){new s.Notice("NotebookLM \uBDF0\uAC00 \uC5F4\uB824\uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4");return}let n=Array.from(this.noteQueue.values()).filter(a=>a.status==="pending");if(n.length===0){new s.Notice("\uC804\uC1A1\uD560 \uB178\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4");return}new s.Notice(`${n.length}\uAC1C \uB178\uD2B8 \uC804\uC1A1 \uC2DC\uC791...`);for(let a of n){a.status="sending",this.updateStatusBar();try{await e.addSourceToNotebook(a.note),a.status="sent",new s.Notice(`\u2713 ${a.note.title} \uC804\uC1A1 \uC644\uB8CC`)}catch(r){a.status="failed",a.error=r instanceof Error?r.message:String(r),new s.Notice(`\u2717 ${a.note.title} \uC804\uC1A1 \uC2E4\uD328`)}this.updateStatusBar(),await this.delay(1500)}let i=Array.from(this.noteQueue.values()).filter(a=>a.status==="sent").length,l=Array.from(this.noteQueue.values()).filter(a=>a.status==="failed").length;new s.Notice(`\uC804\uC1A1 \uC644\uB8CC: \uC131\uACF5 ${i}\uAC1C, \uC2E4\uD328 ${l}\uAC1C`)}clearQueue(){this.noteQueue.clear(),this.updateStatusBar()}delay(t){return new Promise(e=>setTimeout(e,t))}},m=class extends s.ItemView{constructor(t,e){super(t);this.webview=null;this.isLoggedIn=!1;this.plugin=e}getViewType(){return u}getDisplayText(){return"NotebookLM"}getIcon(){return"book-open"}async onOpen(){let t=this.containerEl.children[1];t.empty(),t.addClass("notebooklm-view-container"),this.buildToolbar(t),this.buildQueuePanel(t),this.buildWebviewContainer(t),this.initWebview()}async onClose(){this.webview&&(this.webview.remove(),this.webview=null)}buildToolbar(t){this.toolbarEl=t.createDiv({cls:"nlm-toolbar"});let e=this.toolbarEl.createDiv({cls:"nlm-status"});e.createSpan({cls:"nlm-status-dot"}),e.createSpan({cls:"nlm-status-text",text:"\uC5F0\uACB0 \uC911..."});let n=this.toolbarEl.createDiv({cls:"nlm-toolbar-buttons"}),i=n.createEl("button",{cls:"nlm-btn"});i.createSpan({text:"\u21BB \uC0C8\uB85C\uACE0\uCE68"}),i.addEventListener("click",()=>this.refresh());let l=n.createEl("button",{cls:"nlm-btn"});l.createSpan({text:"\u{1F3E0} \uD648"}),l.addEventListener("click",()=>this.goHome());let a=n.createEl("button",{cls:"nlm-btn nlm-btn-primary"});a.createSpan({text:"\u{1F4CB} \uB300\uAE30\uC5F4"}),a.addEventListener("click",()=>this.toggleQueuePanel())}buildQueuePanel(t){this.queuePanelEl=t.createDiv({cls:"nlm-queue-panel hidden"});let e=this.queuePanelEl.createDiv({cls:"nlm-queue-header"});e.createEl("h3",{text:"\u{1F4CB} \uC804\uC1A1 \uB300\uAE30\uC5F4"}),e.createEl("button",{cls:"nlm-btn-icon",text:"\u2715"}).addEventListener("click",()=>this.hideQueuePanel()),this.queuePanelEl.createDiv({cls:"nlm-queue-content"}).createDiv({cls:"nlm-queue-list"});let l=this.queuePanelEl.createDiv({cls:"nlm-queue-actions"}),a=l.createEl("button",{cls:"nlm-btn nlm-btn-primary"});a.createSpan({text:"\u{1F4E4} \uBAA8\uB450 \uC804\uC1A1"}),a.addEventListener("click",()=>this.sendAllQueued());let r=l.createEl("button",{cls:"nlm-btn"});r.createSpan({text:"\u{1F5D1}\uFE0F \uB300\uAE30\uC5F4 \uBE44\uC6B0\uAE30"}),r.addEventListener("click",()=>{this.plugin.clearQueue(),this.updateQueueList()})}buildWebviewContainer(t){this.webviewContainerEl=t.createDiv({cls:"nlm-webview-container"})}initWebview(){this.webview=document.createElement("webview"),this.webview.setAttribute("src","https://notebooklm.google.com"),this.webview.setAttribute("partition","persist:notebooklm"),this.webview.setAttribute("httpreferrer","https://google.com"),this.webview.setAttribute("allowpopups","true"),this.webview.addClass("nlm-webview"),this.webviewContainerEl.appendChild(this.webview),this.webview.addEventListener("did-start-loading",()=>{this.updateStatus("loading","\uB85C\uB529 \uC911...")}),this.webview.addEventListener("did-finish-load",()=>{this.checkLoginStatus()}),this.webview.addEventListener("did-fail-load",()=>{this.updateStatus("error","\uB85C\uB4DC \uC2E4\uD328")})}async checkLoginStatus(){if(this.webview)try{let t=await this.webview.executeJavaScript(`
        (function() {
          // Check if logged in by looking for user avatar or logout button
          const avatar = document.querySelector('[aria-label*="Google"], img[src*="googleusercontent"]');
          const logoutBtn = document.querySelector('[aria-label*="\uB85C\uADF8\uC544\uC6C3"], [aria-label*="Sign out"]');
          const projectList = document.querySelector('project-button, .project-table, [class*="notebook"]');
          return !!(avatar || logoutBtn || projectList);
        })();
      `);this.isLoggedIn=t,t?this.updateStatus("connected","\uC5F0\uACB0\uB428"):this.updateStatus("disconnected","\uB85C\uADF8\uC778 \uD544\uC694")}catch{this.updateStatus("error","\uC0C1\uD0DC \uD655\uC778 \uC2E4\uD328")}}updateStatus(t,e){let n=this.toolbarEl.querySelector(".nlm-status-dot"),i=this.toolbarEl.querySelector(".nlm-status-text");n&&(n.className=`nlm-status-dot nlm-status-${t}`),i&&(i.textContent=e)}refresh(){this.webview?.reload()}goHome(){this.webview?.loadURL("https://notebooklm.google.com")}showQueuePanel(){this.queuePanelEl.removeClass("hidden"),this.updateQueueList()}hideQueuePanel(){this.queuePanelEl.addClass("hidden")}toggleQueuePanel(){this.queuePanelEl.hasClass("hidden")?this.showQueuePanel():this.hideQueuePanel()}updateQueueList(){let t=this.queuePanelEl.querySelector(".nlm-queue-list");if(!t)return;t.empty();let e=Array.from(this.plugin.noteQueue.values());if(e.length===0){t.createDiv({cls:"nlm-queue-empty",text:"\uB300\uAE30\uC5F4\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4"});return}for(let n of e){let i=t.createDiv({cls:`nlm-queue-item nlm-queue-${n.status}`}),l=i.createSpan({cls:"nlm-queue-icon"});switch(n.status){case"pending":l.textContent="\u23F3";break;case"sending":l.textContent="\u{1F4E4}";break;case"sent":l.textContent="\u2705";break;case"failed":l.textContent="\u274C";break}let a=i.createDiv({cls:"nlm-queue-info"});a.createDiv({cls:"nlm-queue-title",text:n.note.title}),n.error&&a.createDiv({cls:"nlm-queue-error",text:n.error}),i.createEl("button",{cls:"nlm-btn-icon",text:"\u2715"}).addEventListener("click",()=>{this.plugin.noteQueue.delete(n.id),this.updateQueueList(),this.plugin.updateStatusBar()})}}async sendAllQueued(){if(!this.isLoggedIn){new s.Notice("NotebookLM\uC5D0 \uBA3C\uC800 \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694");return}let t=await this.getNotebooks();if(t.length===0){new s.Notice("\uB178\uD2B8\uBD81\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. NotebookLM \uD648\uC5D0\uC11C \uB178\uD2B8\uBD81\uC744 \uC120\uD0DD\uD558\uAC70\uB098 \uC0DD\uC131\uD574\uC8FC\uC138\uC694.");return}new p(this.app,this.plugin,t,async e=>{e&&(await this.navigateToNotebook(e),await this.plugin.delay(2e3),await this.plugin.processQueue(e.id),this.updateQueueList())}).open()}async getNotebooks(){if(!this.webview)return[];try{return await this.webview.executeJavaScript(`
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
      `)||[]}catch{return[]}}async navigateToNotebook(t){this.webview&&(t.url?this.webview.loadURL(t.url):await this.webview.executeJavaScript(`
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
      `))}async addSourceToNotebook(t){if(!this.webview)throw new Error("WebView not ready");let e=t.content;if(t.metadata){let i=[];t.metadata.tags?.length&&i.push(`Tags: ${t.metadata.tags.join(", ")}`),i.length>0&&(e=i.join(`
`)+`

`+e)}e=`# ${t.title}

${e}`;let n=await this.webview.executeJavaScript(`
      (async function() {
        const title = ${JSON.stringify(t.title)};
        const content = ${JSON.stringify(e)};

        // Find Add Source button and click it
        const addBtns = document.querySelectorAll('button');
        for (const btn of addBtns) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('\uC18C\uC2A4 \uCD94\uAC00') || text.includes('add source') || text.includes('\uCD94\uAC00')) {
            btn.click();
            await new Promise(r => setTimeout(r, 1000));
            break;
          }
        }

        // Look for text/paste option
        const textOptions = document.querySelectorAll('[role="button"], button, [class*="option"]');
        for (const opt of textOptions) {
          const text = opt.textContent.toLowerCase();
          if (text.includes('\uD14D\uC2A4\uD2B8') || text.includes('text') || text.includes('\uBD99\uC5EC\uB123\uAE30') || text.includes('paste')) {
            opt.click();
            await new Promise(r => setTimeout(r, 1000));
            break;
          }
        }

        // Find textarea and fill it
        const textareas = document.querySelectorAll('textarea, [contenteditable="true"]');
        for (const ta of textareas) {
          if (ta.offsetParent !== null) {
            if (ta.tagName === 'TEXTAREA') {
              ta.value = content;
              ta.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
              ta.textContent = content;
              ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
            break;
          }
        }

        // Look for title input
        const titleInputs = document.querySelectorAll('input[type="text"]');
        for (const inp of titleInputs) {
          if (inp.offsetParent !== null && !inp.value) {
            inp.value = title;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            break;
          }
        }

        // Click submit/insert button
        await new Promise(r => setTimeout(r, 500));
        const submitBtns = document.querySelectorAll('button');
        for (const btn of submitBtns) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('\uC0BD\uC785') || text.includes('insert') || text.includes('\uCD94\uAC00') || text.includes('add')) {
            if (btn.offsetParent !== null) {
              btn.click();
              return { success: true };
            }
          }
        }

        return { success: false, error: 'Could not find submit button' };
      })();
    `);if(!n?.success)throw new Error(n?.error||"Failed to add source")}},p=class extends s.Modal{constructor(o,t,e,n){super(o),this.plugin=t,this.notebooks=e,this.onSelect=n}onOpen(){let{contentEl:o}=this;o.empty(),o.addClass("nlm-modal"),o.createEl("h2",{text:"\u{1F4DA} \uB178\uD2B8\uBD81 \uC120\uD0DD"}),o.createEl("p",{cls:"nlm-modal-desc",text:"\uB178\uD2B8\uB97C \uCD94\uAC00\uD560 NotebookLM \uB178\uD2B8\uBD81\uC744 \uC120\uD0DD\uD558\uC138\uC694."});let t=Array.from(this.plugin.noteQueue.values()).filter(r=>r.status==="pending").length;t>0&&o.createDiv({cls:"nlm-modal-summary"}).createSpan({text:`\u{1F4CB} ${t}\uAC1C \uB178\uD2B8 \uC804\uC1A1 \uB300\uAE30 \uC911`});let e=o.createDiv({cls:"nlm-notebook-list"});for(let r of this.notebooks){let h=e.createDiv({cls:"nlm-notebook-item"});h.createSpan({cls:"nlm-notebook-icon",text:"\u{1F4D3}"}),h.createDiv({cls:"nlm-notebook-info"}).createDiv({cls:"nlm-notebook-title",text:r.title}),h.addEventListener("click",()=>{this.onSelect(r),this.close()})}let n=e.createDiv({cls:"nlm-notebook-item nlm-notebook-new"});n.createSpan({cls:"nlm-notebook-icon",text:"\u2795"});let i=n.createDiv({cls:"nlm-notebook-info"});i.createDiv({cls:"nlm-notebook-title",text:"\uC0C8 \uB178\uD2B8\uBD81 \uB9CC\uB4E4\uAE30"}),i.createDiv({cls:"nlm-notebook-desc",text:"NotebookLM\uC5D0\uC11C \uC0C8 \uB178\uD2B8\uBD81\uC744 \uC0DD\uC131\uD569\uB2C8\uB2E4"}),n.addEventListener("click",()=>{new s.Notice("NotebookLM\uC5D0\uC11C \uC0C8 \uB178\uD2B8\uBD81\uC744 \uB9CC\uB4E0 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694"),this.close()}),o.createDiv({cls:"nlm-modal-footer"}).createEl("button",{text:"\uCDE8\uC18C"}).addEventListener("click",()=>this.close())}onClose(){this.contentEl.empty()}},w=class extends s.PluginSettingTab{constructor(o,t){super(o,t),this.plugin=t}display(){let{containerEl:o}=this;o.empty(),o.createEl("h2",{text:"NotebookLM Sync \uC124\uC815"}),o.createEl("h3",{text:"\uC77C\uBC18"}),new s.Setting(o).setName("Zettelkasten \uD3F4\uB354").setDesc("\uC601\uAD6C \uB178\uD2B8\uAC00 \uC800\uC7A5\uB41C \uD3F4\uB354 (YYYYMMDDHHMM \uD615\uC2DD)").addText(e=>e.setPlaceholder("04_Zettelkasten").setValue(this.plugin.settings.zettelkastenFolder).onChange(async n=>{this.plugin.settings.zettelkastenFolder=n,await this.plugin.saveSettings()})),new s.Setting(o).setName("\uC2DC\uC791 \uC2DC \uC790\uB3D9 \uC5F4\uAE30").setDesc("Obsidian \uC2DC\uC791 \uC2DC NotebookLM \uBDF0\uB97C \uC790\uB3D9\uC73C\uB85C \uC5FD\uB2C8\uB2E4").addToggle(e=>e.setValue(this.plugin.settings.autoOpenView).onChange(async n=>{this.plugin.settings.autoOpenView=n,await this.plugin.saveSettings()})),o.createEl("h3",{text:"\uCF58\uD150\uCE20"}),new s.Setting(o).setName("\uBA54\uD0C0\uB370\uC774\uD130 \uD3EC\uD568").setDesc("\uB178\uD2B8 \uC804\uC1A1 \uC2DC \uD0DC\uADF8 \uB4F1 \uBA54\uD0C0\uB370\uC774\uD130\uB97C \uD3EC\uD568\uD569\uB2C8\uB2E4").addToggle(e=>e.setValue(this.plugin.settings.includeMetadata).onChange(async n=>{this.plugin.settings.includeMetadata=n,await this.plugin.saveSettings()})),new s.Setting(o).setName("Frontmatter \uD3EC\uD568").setDesc("YAML frontmatter\uB97C \uB178\uD2B8 \uB0B4\uC6A9\uC5D0 \uD3EC\uD568\uD569\uB2C8\uB2E4").addToggle(e=>e.setValue(this.plugin.settings.includeFrontmatter).onChange(async n=>{this.plugin.settings.includeFrontmatter=n,await this.plugin.saveSettings()})),o.createEl("h3",{text:"\uC0AC\uC6A9\uBC95"});let t=o.createDiv({cls:"nlm-settings-info"});t.createEl("p",{text:"1. \uC624\uB978\uCABD \uC0AC\uC774\uB4DC\uBC14\uC5D0\uC11C NotebookLM \uBDF0\uB97C \uC5FD\uB2C8\uB2E4"}),t.createEl("p",{text:"2. Google \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD569\uB2C8\uB2E4"}),t.createEl("p",{text:'3. \uB178\uD2B8\uB97C \uC120\uD0DD\uD558\uACE0 "NotebookLM\uC5D0 \uC804\uC1A1" \uBA85\uB839\uC744 \uC2E4\uD589\uD569\uB2C8\uB2E4'}),t.createEl("p",{text:"4. \uB300\uC0C1 \uB178\uD2B8\uBD81\uC744 \uC120\uD0DD\uD558\uBA74 \uB178\uD2B8\uAC00 \uC18C\uC2A4\uB85C \uCD94\uAC00\uB429\uB2C8\uB2E4"})}};
