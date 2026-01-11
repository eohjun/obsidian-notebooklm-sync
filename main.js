"use strict";var b=Object.defineProperty;var f=Object.getOwnPropertyDescriptor;var g=Object.getOwnPropertyNames;var v=Object.prototype.hasOwnProperty;var k=(c,i)=>{for(var e in i)b(c,e,{get:i[e],enumerable:!0})},x=(c,i,e,t)=>{if(i&&typeof i=="object"||typeof i=="function")for(let o of g(i))!v.call(c,o)&&o!==e&&b(c,o,{get:()=>i[o],enumerable:!(t=f(i,o))||t.enumerable});return c};var y=c=>x(b({},"__esModule",{value:!0}),c);var E={};k(E,{default:()=>h});module.exports=y(E);var n=require("obsidian"),u="notebooklm-sync-view",S={zettelkastenFolder:"04_Zettelkasten",includeMetadata:!0,includeFrontmatter:!1,autoOpenView:!1},h=class extends n.Plugin{constructor(){super(...arguments);this.noteQueue=new Map;this.isProcessing=!1;this.shouldStop=!1}async onload(){await this.loadSettings(),this.registerView(u,e=>new p(e,this)),this.statusBarItem=this.addStatusBarItem(),this.updateStatusBar(),this.addRibbonIcon("send","Send current note to NotebookLM",async()=>{await this.sendCurrentNote()}),this.addRibbonIcon("book-open","Open NotebookLM",async()=>{await this.activateView()}),this.addCommand({id:"send-current-note",name:"Send current note to NotebookLM",editorCallback:async()=>{await this.sendCurrentNote()}}),this.addCommand({id:"send-selection",name:"Send selected text to NotebookLM",editorCallback:async(e,t)=>{let o=e.getSelection();o?await this.sendText(o,t.file?.basename||"Selection"):new n.Notice("Please select some text")}}),this.addCommand({id:"send-all-notes",name:"Send all permanent notes to NotebookLM",callback:async()=>{await this.sendAllPermanentNotes()}}),this.addCommand({id:"open-notebooklm",name:"Open NotebookLM",callback:async()=>{await this.activateView()}}),this.registerEvent(this.app.workspace.on("file-menu",(e,t)=>{t instanceof n.TFile&&t.extension==="md"&&e.addItem(o=>{o.setTitle("Send to NotebookLM").setIcon("send").onClick(async()=>{await this.sendFile(t)})})})),this.registerEvent(this.app.workspace.on("editor-menu",(e,t,o)=>{e.addItem(r=>{r.setTitle("Send to NotebookLM").setIcon("send").onClick(async()=>{await this.sendCurrentNote()})});let s=t.getSelection();s&&e.addItem(r=>{r.setTitle("Send selection to NotebookLM").setIcon("text-select").onClick(async()=>{await this.sendText(s,o.file?.basename||"Selection")})})})),this.addSettingTab(new w(this.app,this)),this.settings.autoOpenView&&this.app.workspace.onLayoutReady(()=>{this.activateView()})}async onunload(){this.app.workspace.detachLeavesOfType(u)}async loadSettings(){this.settings=Object.assign({},S,await this.loadData())}async saveSettings(){await this.saveData(this.settings)}updateStatusBar(){let e=this.noteQueue.size,t=Array.from(this.noteQueue.values()).filter(o=>o.status==="pending"||o.status==="sending").length;t>0?(this.statusBarItem.setText(`\u{1F4E4} NLM: ${t}`),this.statusBarItem.setAttribute("title",`NotebookLM sync pending: ${t}`)):e>0?(this.statusBarItem.setText(`\u{1F4D8} NLM: ${e}`),this.statusBarItem.setAttribute("title",`NotebookLM sent: ${e}`)):(this.statusBarItem.setText("\u{1F4D8} NLM"),this.statusBarItem.setAttribute("title","NotebookLM Sync ready"))}async activateView(){let e=this.app.workspace.getLeavesOfType(u);if(e.length>0)this.app.workspace.revealLeaf(e[0]);else{let t=this.app.workspace.getRightLeaf(!1);t&&(await t.setViewState({type:u,active:!0}),this.app.workspace.revealLeaf(t))}}getView(){let e=this.app.workspace.getLeavesOfType(u);return e.length>0?e[0].view:null}isPermanentNote(e){let t=this.settings.zettelkastenFolder;return e.path.startsWith(t)&&e.extension==="md"&&/^\d{12}/.test(e.basename)}async getNoteData(e){let t=await this.app.vault.cachedRead(e),o=this.app.metadataCache.getFileCache(e),s=t;this.settings.includeFrontmatter||(s=s.replace(/^---[\s\S]*?---\n?/,""));let r={title:e.basename,content:s,path:e.path};return this.settings.includeMetadata&&(r.metadata={created:e.stat.ctime,modified:e.stat.mtime,tags:o?.tags?.map(a=>a.tag)||[]}),r}async sendCurrentNote(){let e=this.app.workspace.getActiveFile();if(!e){new n.Notice("No note is currently open");return}await this.sendFile(e)}async sendFile(e){let t=await this.getNoteData(e);await this.queueNote(t)}async sendText(e,t){let o={title:t,content:e,path:""};await this.queueNote(o)}async sendAllPermanentNotes(){let e=this.app.vault.getMarkdownFiles().filter(o=>this.isPermanentNote(o));if(e.length===0){new n.Notice(`No permanent notes found in ${this.settings.zettelkastenFolder}`);return}new n.Notice(`Preparing to send ${e.length} permanent notes...`);for(let o of e){let s=await this.getNoteData(o);await this.queueNote(s,!1)}new n.Notice(`${e.length} notes added to queue`),this.updateStatusBar(),await this.activateView();let t=this.getView();t&&t.showQueuePanel()}async queueNote(e,t=!0){let o=e.path||`text-${Date.now()}`;if(this.noteQueue.set(o,{id:o,note:e,status:"pending"}),this.updateStatusBar(),t){await this.activateView();let s=this.getView();s&&s.showQueuePanel()}}async processQueue(e){let t=this.getView();if(!t||!t.webview){new n.Notice("NotebookLM view is not open");return}let o=Array.from(this.noteQueue.values()).filter(a=>a.status==="pending");if(o.length===0){new n.Notice("No notes to send");return}this.isProcessing=!0,this.shouldStop=!1,new n.Notice(`Starting to send ${o.length} notes...`),t.updateQueueList();for(let a of o){if(this.shouldStop){new n.Notice("Sending stopped");break}a.status="sending",this.updateStatusBar(),t.updateQueueList();try{await t.addSourceToNotebook(a.note),a.status="sent",new n.Notice(`Sent: ${a.note.title}`)}catch(l){a.status="failed",a.error=l instanceof Error?l.message:String(l),new n.Notice(`Failed: ${a.note.title} - ${a.error}`)}this.updateStatusBar(),t.updateQueueList(),this.shouldStop||await this.delay(2e3)}this.isProcessing=!1,this.shouldStop=!1,t.updateQueueList();let s=Array.from(this.noteQueue.values()).filter(a=>a.status==="sent").length,r=Array.from(this.noteQueue.values()).filter(a=>a.status==="failed").length;new n.Notice(`Complete: ${s} sent, ${r} failed`)}stopProcessing(){this.isProcessing&&(this.shouldStop=!0,new n.Notice("Stop requested..."))}clearQueue(){this.noteQueue.clear(),this.updateStatusBar()}delay(e){return new Promise(t=>setTimeout(t,e))}},p=class extends n.ItemView{constructor(e,t){super(e);this.webview=null;this.isLoggedIn=!1;this.plugin=t}getViewType(){return u}getDisplayText(){return"NotebookLM"}getIcon(){return"book-open"}async onOpen(){let e=this.containerEl.children[1];e.empty(),e.addClass("notebooklm-view-container"),this.buildToolbar(e),this.buildQueuePanel(e),this.buildWebviewContainer(e),this.initWebview()}async onClose(){this.webview&&(this.webview.remove(),this.webview=null)}buildToolbar(e){this.toolbarEl=e.createDiv({cls:"nlm-toolbar"});let t=this.toolbarEl.createDiv({cls:"nlm-status"});t.createSpan({cls:"nlm-status-dot"}),t.createSpan({cls:"nlm-status-text",text:"Connecting..."});let o=this.toolbarEl.createDiv({cls:"nlm-toolbar-buttons"}),s=o.createEl("button",{cls:"nlm-btn"});s.createSpan({text:"\u21BB Refresh"}),s.addEventListener("click",()=>this.refresh());let r=o.createEl("button",{cls:"nlm-btn"});r.createSpan({text:"\u{1F3E0} Home"}),r.addEventListener("click",()=>this.goHome());let a=o.createEl("button",{cls:"nlm-btn nlm-btn-primary"});a.createSpan({text:"\u{1F4CB} Queue"}),a.addEventListener("click",()=>this.toggleQueuePanel())}buildQueuePanel(e){this.queuePanelEl=e.createDiv({cls:"nlm-queue-panel hidden"});let t=this.queuePanelEl.createDiv({cls:"nlm-queue-header"});t.createEl("h3",{text:"\u{1F4CB} Send Queue"}),t.createEl("button",{cls:"nlm-btn-icon",text:"\u2715"}).addEventListener("click",()=>this.hideQueuePanel()),this.queuePanelEl.createDiv({cls:"nlm-queue-content"}).createDiv({cls:"nlm-queue-list"});let r=this.queuePanelEl.createDiv({cls:"nlm-queue-actions"})}updateQueueActions(){let e=this.queuePanelEl.querySelector(".nlm-queue-actions");if(e)if(e.empty(),this.plugin.isProcessing){let t=e.createEl("button",{cls:"nlm-btn nlm-btn-danger"});t.createSpan({text:"\u23F9\uFE0F Stop"}),t.addEventListener("click",()=>{this.plugin.stopProcessing()})}else{let t=e.createEl("button",{cls:"nlm-btn nlm-btn-primary"});t.createSpan({text:"\u{1F4E4} Send All"}),t.addEventListener("click",()=>this.sendAllQueued());let o=e.createEl("button",{cls:"nlm-btn"});o.createSpan({text:"\u{1F5D1}\uFE0F Clear Queue"}),o.addEventListener("click",()=>{this.plugin.clearQueue(),this.updateQueueList()})}}buildWebviewContainer(e){this.webviewContainerEl=e.createDiv({cls:"nlm-webview-container"})}initWebview(){this.webview=document.createElement("webview"),this.webview.setAttribute("src","https://notebooklm.google.com"),this.webview.setAttribute("partition","persist:notebooklm"),this.webview.setAttribute("httpreferrer","https://google.com"),this.webview.setAttribute("allowpopups","true"),this.webview.addClass("nlm-webview"),this.webviewContainerEl.appendChild(this.webview),this.webview.addEventListener("did-start-loading",()=>{this.updateStatus("loading","Loading...")}),this.webview.addEventListener("did-finish-load",()=>{this.checkLoginStatus()}),this.webview.addEventListener("did-fail-load",()=>{this.updateStatus("error","Load failed")})}async checkLoginStatus(){if(this.webview)try{let e=await this.webview.executeJavaScript(`
        (function() {
          // Check if logged in by looking for user avatar or logout button
          const avatar = document.querySelector('[aria-label*="Google"], img[src*="googleusercontent"]');
          const logoutBtn = document.querySelector('[aria-label*="\uB85C\uADF8\uC544\uC6C3"], [aria-label*="Sign out"]');
          const projectList = document.querySelector('project-button, .project-table, [class*="notebook"]');
          return !!(avatar || logoutBtn || projectList);
        })();
      `);this.isLoggedIn=e,e?this.updateStatus("connected","Connected"):this.updateStatus("disconnected","Login required")}catch{this.updateStatus("error","Status check failed")}}updateStatus(e,t){let o=this.toolbarEl.querySelector(".nlm-status-dot"),s=this.toolbarEl.querySelector(".nlm-status-text");o&&(o.className=`nlm-status-dot nlm-status-${e}`),s&&(s.textContent=t)}refresh(){this.webview?.reload()}goHome(){this.webview?.loadURL("https://notebooklm.google.com")}async isOnHomePage(){if(!this.webview)return!1;try{return await this.webview.executeJavaScript(`
        (function() {
          const url = window.location.href;
          // Home page: notebooklm.google.com or notebooklm.google.com/ (no notebook ID)
          // Notebook page: notebooklm.google.com/notebook/XXXX
          return !url.includes('/notebook/');
        })();
      `)}catch{return!1}}async ensureHomePage(){if(!this.webview)return!1;if(await this.isOnHomePage())return!0;new n.Notice("Navigating to NotebookLM home..."),this.webview.loadURL("https://notebooklm.google.com");let t=20;for(let o=0;o<t;o++)if(await this.plugin.delay(500),await this.webview.executeJavaScript(`
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
      `))return new n.Notice("Home page loaded"),await this.plugin.delay(500),!0;return new n.Notice("Home page load timeout"),!1}showQueuePanel(){this.queuePanelEl.removeClass("hidden"),this.updateQueueList()}hideQueuePanel(){this.queuePanelEl.addClass("hidden")}toggleQueuePanel(){this.queuePanelEl.hasClass("hidden")?this.showQueuePanel():this.hideQueuePanel()}updateQueueList(){let e=this.queuePanelEl.querySelector(".nlm-queue-list");if(!e)return;e.empty();let t=Array.from(this.plugin.noteQueue.values());if(t.length===0){e.createDiv({cls:"nlm-queue-empty",text:"Queue is empty"}),this.updateQueueActions();return}for(let o of t){let s=e.createDiv({cls:`nlm-queue-item nlm-queue-${o.status}`}),r=s.createSpan({cls:"nlm-queue-icon"});switch(o.status){case"pending":r.textContent="\u23F3";break;case"sending":r.textContent="\u{1F4E4}";break;case"sent":r.textContent="\u2705";break;case"failed":r.textContent="\u274C";break}let a=s.createDiv({cls:"nlm-queue-info"});a.createDiv({cls:"nlm-queue-title",text:o.note.title}),o.error&&a.createDiv({cls:"nlm-queue-error",text:o.error}),o.status!=="sending"&&s.createEl("button",{cls:"nlm-btn-icon",text:"\u2715"}).addEventListener("click",()=>{this.plugin.noteQueue.delete(o.id),this.updateQueueList(),this.plugin.updateStatusBar()})}this.updateQueueActions()}async sendAllQueued(){if(!this.isLoggedIn){new n.Notice("Please log in to NotebookLM first");return}if(!await this.ensureHomePage()){new n.Notice("Cannot navigate to NotebookLM home. Please click the Home button manually.");return}let t=[];for(let o=0;o<10&&(t=await this.getNotebooks(),!(t.length>0));o++)o===0&&new n.Notice("Loading notebook list..."),await this.plugin.delay(1e3);if(t.length===0){new n.Notice("No notebooks found. Please create a notebook in NotebookLM.");return}new m(this.app,this.plugin,t,async o=>{o&&(await this.navigateToNotebook(o),await this.plugin.delay(2e3),await this.plugin.processQueue(o.id),this.updateQueueList())}).open()}async getNotebooks(){if(!this.webview)return[];try{return await this.webview.executeJavaScript(`
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
      `)||[]}catch{return[]}}async navigateToNotebook(e){if(this.webview){if(new n.Notice(`Navigating to "${e.title}"...`),e.url)this.webview.loadURL(e.url);else if(!await this.webview.executeJavaScript(`
        (function() {
          const title = ${JSON.stringify(e.title)};

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
      `))throw new Error(`Notebook "${e.title}" not found`);await this.waitForNotebookPage()}}async waitForNotebookPage(){if(!this.webview)return;let e=10;for(let t=0;t<e;t++)if(await this.plugin.delay(500),await this.webview.executeJavaScript(`
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
      `))return;throw new Error("Notebook page load timeout")}async addSourceToNotebook(e){if(!this.webview)throw new Error("WebView not ready");let t=e.content;if(e.metadata){let s=[];e.metadata.tags?.length&&s.push(`Tags: ${e.metadata.tags.join(", ")}`),s.length>0&&(t=s.join(`
`)+`

`+t)}t=`# ${e.title}

${t}`,!await this.addSourceViaAPI(e.title,t)&&(new n.Notice("API failed. Retrying via DOM..."),await this.addSourceViaDOM(e.title,t))}async addSourceViaAPI(e,t){if(!this.webview)return!1;try{new n.Notice(`Adding "${e}" via API...`);let o=await this.webview.executeJavaScript(`
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
      `);if(console.log("[NotebookLM Sync] Page info:",o),!o.notebookId)return console.log("[NotebookLM Sync] No notebook ID found"),!1;if(!o.atToken)return console.log("[NotebookLM Sync] No auth token found"),!1;let s=Buffer.from(e,"utf-8").toString("base64"),r=Buffer.from(t,"utf-8").toString("base64"),a="obsidian_"+Date.now();await this.webview.executeJavaScript(`
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
        `),!l);d++);return console.log("[NotebookLM Sync] API result:",l),l?.success?(new n.Notice(`Source "${e}" added successfully!`),!0):!1}catch(o){return console.error("[NotebookLM Sync] API failed:",o),!1}}async addSourceViaDOM(e,t){if(!this.webview)throw new Error("WebView not ready");new n.Notice(`Adding "${e}" via DOM...`);let o=await this.webview.executeJavaScript(`
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
    `);if(!o?.success)throw new Error(o?.error||"Source add button not found");await this.plugin.delay(1500);let s=await this.webview.executeJavaScript(`
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
    `);if(!s?.success){let l=s?.availableOptions?.join(", ")||"none";throw console.log("NotebookLM Sync - Available options:",l),new Error(`${s?.error||"Paste text option not found"} [options: ${l}]`)}await this.plugin.delay(1500);let r=await this.webview.executeJavaScript(`
      (function() {
        const content = ${JSON.stringify(t)};

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
    `);if(console.log("[NotebookLM Sync] Step 3 result:",r),!r?.success){try{await navigator.clipboard.writeText(t),new n.Notice(`Auto-input failed. Copied to clipboard.

Paste with Cmd/Ctrl+V then click Insert`,8e3)}catch{throw new Error(`Text input field not found (textarea count: ${r?.textareaCount||0})`)}return}await this.plugin.delay(800);let a=await this.webview.executeJavaScript(`
      (function() {
        const buttons = document.querySelectorAll('button');
        // Try exact text match first
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim();
          if ((text === '\uC0BD\uC785' || text === 'Insert') && !btn.disabled) {
            btn.click();
            console.log('[NotebookLM Sync] Clicked Insert button');
            return { success: true, text: text };
          }
        }

        // Check if button is disabled
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim();
          if (text === '\uC0BD\uC785' || text === 'Insert') {
            return { success: false, error: 'Insert button is disabled', disabled: true };
          }
        }

        return { success: false, error: 'Insert button not found' };
      })();
    `);console.log("[NotebookLM Sync] Step 4 result:",a),a?.success?new n.Notice(`Source "${e}" added!`):a?.disabled?new n.Notice(`Text input complete!
Please click the "Insert" button.`,5e3):new n.Notice(`Text input complete!
Please click the "Insert" button.`,5e3),await this.plugin.delay(1500)}},m=class extends n.Modal{constructor(i,e,t,o){super(i),this.plugin=e,this.notebooks=t,this.onSelect=o}onOpen(){let{contentEl:i}=this;i.empty(),i.addClass("nlm-modal"),i.createEl("h2",{text:"Select Notebook"}),i.createEl("p",{cls:"nlm-modal-desc",text:"Select the NotebookLM notebook to add notes to."});let e=Array.from(this.plugin.noteQueue.values()).filter(l=>l.status==="pending").length;e>0&&i.createDiv({cls:"nlm-modal-summary"}).createSpan({text:`${e} notes pending`});let t=i.createDiv({cls:"nlm-notebook-list"});for(let l of this.notebooks){let d=t.createDiv({cls:"nlm-notebook-item"});d.createDiv({cls:"nlm-notebook-info"}).createDiv({cls:"nlm-notebook-title",text:l.title}),d.addEventListener("click",()=>{this.onSelect(l),this.close()})}let o=t.createDiv({cls:"nlm-notebook-item nlm-notebook-new"});o.createSpan({cls:"nlm-notebook-icon",text:"\u2795"});let s=o.createDiv({cls:"nlm-notebook-info"});s.createDiv({cls:"nlm-notebook-title",text:"Create new notebook"}),s.createDiv({cls:"nlm-notebook-desc",text:"Create a new notebook in NotebookLM"}),o.addEventListener("click",()=>{new n.Notice("Please create a new notebook in NotebookLM and try again"),this.close()}),i.createDiv({cls:"nlm-modal-footer"}).createEl("button",{text:"Cancel"}).addEventListener("click",()=>this.close())}onClose(){this.contentEl.empty()}},w=class extends n.PluginSettingTab{constructor(i,e){super(i,e),this.plugin=e}display(){let{containerEl:i}=this;i.empty(),i.createEl("h2",{text:"NotebookLM Sync Settings"}),i.createEl("h3",{text:"General"}),new n.Setting(i).setName("Zettelkasten folder").setDesc("Folder containing permanent notes (YYYYMMDDHHMM format)").addText(t=>t.setPlaceholder("04_Zettelkasten").setValue(this.plugin.settings.zettelkastenFolder).onChange(async o=>{this.plugin.settings.zettelkastenFolder=o,await this.plugin.saveSettings()})),new n.Setting(i).setName("Auto-open on startup").setDesc("Automatically open NotebookLM view when Obsidian starts").addToggle(t=>t.setValue(this.plugin.settings.autoOpenView).onChange(async o=>{this.plugin.settings.autoOpenView=o,await this.plugin.saveSettings()})),i.createEl("h3",{text:"Content"}),new n.Setting(i).setName("Include metadata").setDesc("Include tags and other metadata when sending notes").addToggle(t=>t.setValue(this.plugin.settings.includeMetadata).onChange(async o=>{this.plugin.settings.includeMetadata=o,await this.plugin.saveSettings()})),new n.Setting(i).setName("Include frontmatter").setDesc("Include YAML frontmatter in note content").addToggle(t=>t.setValue(this.plugin.settings.includeFrontmatter).onChange(async o=>{this.plugin.settings.includeFrontmatter=o,await this.plugin.saveSettings()})),i.createEl("h3",{text:"Usage"});let e=i.createDiv({cls:"nlm-settings-info"});e.createEl("p",{text:"1. Open the NotebookLM view from the right sidebar"}),e.createEl("p",{text:"2. Log in with your Google account"}),e.createEl("p",{text:'3. Select a note and run the "Send to NotebookLM" command'}),e.createEl("p",{text:"4. Select the target notebook to add the note as a source"})}};
