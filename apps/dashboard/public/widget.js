(()=>{var B=`/* ============================================
   Glance Widget \u2014 Single source of truth
   Extracted from glanceit.webflow.css + widget-specific
   ============================================ */

/* ---- Host / Positioning (widget-only) ---- */

:host {
  --vcs-purple: #7C3AED;
  --admin-border: #e5e5e5;
  --black: #111;
  --dark: #111;
  --white: #fff;

  all: initial;
  font-family: Figtree, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  color: #000;
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 2147483647;
  pointer-events: none;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

/* ---- Launcher Button Row (widget-only) ---- */

.glancewrapper {
  z-index: 99999;
  grid-column-gap: 10px;
  grid-row-gap: 10px;
  flex-flow: column;
  justify-content: flex-end;
  align-items: flex-end;
  display: flex;
  position: fixed;
  bottom: 15px;
  right: 15px;
  pointer-events: auto;
  animation: glanceSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.glanceprompts {
  grid-column-gap: 5px;
  grid-row-gap: 5px;
  flex-flow: column;
  justify-content: flex-end;
  align-items: flex-end;
  display: flex;
}

.glanceprompt {
  grid-column-gap: 10px;
  grid-row-gap: 10px;
  color: #09291d;
  background-color: #fff;
  border: 1.5px solid #0000000d;
  border-radius: 70px;
  justify-content: center;
  align-items: center;
  height: 44px;
  padding-left: 14px;
  padding-right: 14px;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  display: flex;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 5px -10px #0003;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.glanceprompt:hover { border-color: var(--vcs-purple); transform: scale(1.03); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }

.glancebutton-row {
  grid-column-gap: 5px;
  grid-row-gap: 5px;
  justify-content: flex-end;
  align-items: center;
  display: flex;
}

.glancebutton {
  grid-column-gap: 10px;
  grid-row-gap: 10px;
  aspect-ratio: 1;
  color: #09291d;
  background-color: #fff;
  border: none;
  border-radius: 10px;
  justify-content: center;
  align-items: center;
  height: 50px;
  padding-left: 20px;
  padding-right: 20px;
  font-weight: 500;
  text-decoration: none;
  display: flex;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  font-family: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.glancebutton:hover { background-color: #066f3a0d; transform: scale(1.05); box-shadow: 0 6px 25px rgba(0,0,0,0.18); }

.glancebutton.wide {
  aspect-ratio: auto;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  color: #fff;
  text-shadow: 0 1px 1px #0000001a;
  background-color: color-mix(in srgb, var(--vcs-purple) 90%, transparent);
  min-width: 60px;
  padding-left: 13px;
  padding-right: 18px;
  font-size: 15px;
  display: flex;
}
.glancebutton.wide:hover { background-color: var(--vcs-purple); opacity: 1; }

.glancebutton-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}

/* ---- Panel (widget-only wrapper for open/close) ---- */

.glance-panel {
  position: fixed;
  bottom: 80px;
  right: 15px;
  pointer-events: auto;
  transform: translateY(20px);
  opacity: 0;
  visibility: hidden;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1),
              visibility 0.28s;
}
.glance-panel.open {
  transform: translateY(0);
  opacity: 1;
  visibility: visible;
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.25);
}

.glance-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255,255,255,0.15);
  color: #fff;
  border-radius: 50%;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  font-family: inherit;
}
.glance-close-btn:hover { background: rgba(255,255,255,0.25); }

/* ---- Widget Container ---- */

.glancewidget {
  grid-column-gap: 5px;
  grid-row-gap: 5px;
  background-color: var(--vcs-purple);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1.5px solid #ffffff1a;
  border-radius: 20px;
  flex-flow: column;
  width: 410px;
  max-width: 100%;
  padding: 7px;
  display: flex;
}

.glancewidget-tabs {
  background-color: var(--vcs-purple);
  border-radius: 14px 14px 5px 5px;
  flex-flow: column;
  flex: none;
  height: 73vh;
  min-height: 500px;
  max-height: 690px;
  display: flex;
  position: relative;
  overflow: clip;
  box-shadow: 0 0 5px 2px #0000002e;
}

/* ---- Mobile Responsive ---- */
@media (max-width: 500px) {
  .glancewrapper { right: 8px; bottom: 8px; gap: 6px; }
  .glance-panel { right: 8px; bottom: 62px; left: 8px; }
  .glancewidget { width: 100%; height: calc(100dvh - 70px); }
  .glancewidget-tabs { flex: 1; height: auto; min-height: 0; max-height: none; }
}
@media (max-height: 700px) {
  .glancewrapper { bottom: 8px; gap: 6px; }
  .glance-panel { bottom: 62px; }
  .glancewidget { height: calc(100dvh - 70px); }
  .glancewidget-tabs { flex: 1; height: auto; min-height: 0; max-height: none; }
}

/* ---- Tab Navigation ---- */

.glancewidget-tab-nav {
  background-color: #0003;
  border-radius: 5px 5px 14px 14px;
  height: 60px;
  padding: 0;
  display: flex;
  overflow: hidden;
}

.glancewidget-tablink {
  grid-column-gap: 8px;
  grid-row-gap: 8px;
  opacity: .48;
  color: #fff9;
  text-align: center;
  letter-spacing: -.1px;
  text-transform: none;
  background: none;
  border: none;
  border-radius: 10px;
  flex-flow: column;
  flex: 1;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 0 4px 0px;
  font-family: Figtree, sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 1em;
  text-decoration: none;
  display: flex;
  cursor: pointer;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}
.glancewidget-tablink:hover { opacity: 1; }
.glancewidget-tablink.last { border-top-right-radius: 5px; }
.glancewidget-tablink.first { border-top-left-radius: 5px; }
.glancewidget-tablink.active {
  opacity: 100;
  color: #fffc;
  background-color: #0003;
}

.tldrwidget-icon { width: 19px; height: 18px; }
.tldrwidget-icon.sm { padding: 1px; }
.tldr-nav-label { opacity: 1; }

/* ---- Widget Content Panels ---- */

.widget-content {
  z-index: 3;
  background-color: #fff;
  transition: opacity .2s;
  position: absolute;
  inset: 0%;
  overflow: scroll;
}

.widget-content.tldr {
  opacity: 1;
  color: #000;
  flex-flow: column;
  padding: 10px 15px;
  gap: 10px;
  display: flex;
  overflow: scroll;
}

.widget-content.forms {
  grid-column-gap: 10px;
  grid-row-gap: 10px;
  opacity: 1;
  color: #000;
  flex-flow: column;
  padding: 10px 15px;
  display: flex;
  overflow: scroll;
}

.widget-content.embed {
  display: flex;
  padding: 0;
  overflow: hidden;
}
.widget-content.embed.spotify {
  border-radius: 10px;
  background: #121212;
}

/* ---- TLDR / Chat Wrapper ---- */

.tldrchat-wrapper {
  z-index: 3;
  background-color: #fff;
  flex-flow: column;
  flex: 1;
  padding: 0px;
  display: flex;
  position: relative;
}
.tldrchat-wrapper.chat {
  opacity: 1;
  transition: opacity .2s;
  display: flex;
}

/* ---- Tab Hero / Heading ---- */

.tabhero {
  z-index: 1;
  border-radius: 10px;
  flex: none;
  height: 100px;
  margin-top: -3px;
  margin-left: -8px;
  margin-right: -8px;
  margin-bottom: -15px;
  position: relative;
  overflow: hidden;
}
.tabhero.no-pull {
  flex: none;
  height: 100px;
  margin-bottom: 0;
}

.full-image {
  object-fit: cover;
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0%;
}

.tabheading-wrap {
  text-align: left;
  padding: 10px 0 10px;
}

.tab-heading {
  margin-bottom: 4px;
  margin-top: 0px;
  font-size: 22px;
  font-weight: 500;
  line-height: 1.3em;
}

.tab-heading.tldr {
  margin-bottom: 4px;
  margin-top: 7px;
  font-size: 22px;
  font-weight: 500;
  line-height: 1.3em;
}

.tab-subheading {
  opacity: .7;
  font-size: 16px;
  line-height: 1.5em;
}

/* ---- TLDR Content ---- */

.course-logo-block {
  flex-flow: column;
  padding-bottom: 5px;
  display: flex;
}

.logo-row {
  z-index: 3;
  grid-column-gap: 12px;
  grid-row-gap: 12px;
  margin-bottom: 5px;
  margin-top: -15px;
  display: flex;
  position: relative;
}

.widget-logo {
  border: 1.5px solid #fff;
  border-radius: 10px;
  flex: none;
  width: 88px;
  height: 88px;
  position: relative;
  overflow: hidden;
}

.widget-name-block {
  flex-flow: column;
  padding: 10px 0px 0px 0px;
  display: flex;
  margin-top: 15px;
}

.widget-name {
  margin-bottom: 2px;
  margin-top: 10px;
  font-size: 20px;
  font-weight: 500;
  line-height: 1.3em;
}

.widget-subname {
  opacity: .7;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.3em;
}

.widget-social-row {
  grid-column-gap: 5px;
  grid-row-gap: 5px;
  display: flex;
}

.widget-social-icons {
  color: #000000bf;
  border: 1.5px solid #066f3a1a;
  border-radius: 10px;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  display: flex;
  text-decoration: none;
  cursor: pointer;
  margin-top: 7px;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.widget-social-icons:hover {
  border-color: var(--vcs-purple);
  color: var(--vcs-purple);
}

.social-ico { width: 18px; height: 18px; }

.content-rows {
  grid-column-gap: 5px;
  grid-row-gap: 5px;
  flex-flow: column;
  display: flex;
}

.content-row-link {
  grid-column-gap: 10px;
  grid-row-gap: 10px;
  color: #000;
  background-color: #107e7f05;
  border: 1.5px solid #066f3a1a;
  border-radius: 10px;
  justify-content: flex-start;
  align-items: center;
  padding: 5px 13px 5px 5px;
  text-decoration: none;
  display: flex;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.content-row-link:hover {
  border-color: var(--vcs-purple);
  background-color: #107e7f0a;
}

.content-row-image {
  border: 1.5px solid #066f3a1a;
  border-radius: 10px;
  flex: none;
  width: 73px;
  height: 73px;
  position: relative;
  overflow: hidden;
}

.content-row-block { padding-top: 4px; }

.content-row-header {
  font-size: 16.4px;
  font-weight: 500;
  line-height: 1.2em;
}

.content-row-subheader {
  opacity: .6;
  margin-top: 3px;
  font-size: 14.6px;
  line-height: 1.33em;
}

/* ---- Form ---- */

.formcontent-wrap {
  flex-flow: column;
  flex: 1;
  padding-bottom: 5px;
  display: flex;
}

.formblocks {
  flex-flow: column;
  flex: 1;
  margin-bottom: 0;
  display: flex;
}

.formwrap {
  grid-column-gap: 15px;
  grid-row-gap: 15px;
  flex-flow: column;
  flex: 1;
  display: flex;
}

.formfield-block {
  grid-column-gap: 7px;
  grid-row-gap: 7px;
  flex-flow: column;
  display: flex;
}
.formfield-block.upload { flex: 1; }

.labelrow {
  grid-column-gap: 7px;
  grid-row-gap: 7px;
  justify-content: flex-start;
  align-items: center;
  display: flex;
}

.formlabel {
  font-size: 15.55px;
  font-weight: 500;
}

.labeldivider {
  background-color: var(--admin-border);
  flex: 1;
  width: 10px;
  height: 1.5px;
}

.formfields {
  border: 1.5px solid var(--admin-border);
  color: var(--black);
  background: #fff;
  border-radius: 10px;
  width: 100%;
  height: 50px;
  margin-bottom: 0;
  padding: 10px 12px 9px;
  font-size: 15.55px;
  font-weight: 500;
  font-family: inherit;
  transition: all .24s;
  outline: none;
}
.formfields:focus { border-color: var(--vcs-purple); }
.formfields::placeholder { color: #00000054; }

.formfields.message {
  height: 100px;
  padding: 14px 15px;
  font-size: 15.55px;
  line-height: 1.8em;
  resize: vertical;
}

.formupload {
  grid-column-gap: 10px;
  grid-row-gap: 10px;
  border: 1.5px solid var(--admin-border);
  color: #000000b3;
  cursor: pointer;
  border-radius: 10px;
  flex-flow: row;
  flex: 1;
  justify-content: center;
  align-items: center;
  min-height: 80px;
  padding: 10px;
  font-weight: 500;
  transition: all .2s;
  display: flex;
  position: relative;
}
.formupload > div:first-child {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.formupload:hover { color: #000; background-color: #e9e9e954; }
.formupload.uploaded {
  border-color: var(--vcs-purple);
  background-color: rgba(124,58,237,0.05);
  justify-content: center;
  padding: 12px;
  animation: fileCardSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.file-card {
  grid-column-gap: 12px;
  grid-row-gap: 4px;
  flex-flow: row;
  align-items: center;
  width: 100%;
  display: flex;
  position: relative;
}

.file-icon-wrapper {
  flex: none;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  position: relative;
}

.file-icon-wrapper.image { background-color: rgba(59, 130, 246, 0.1); }
.file-icon-wrapper.pdf { background-color: rgba(239, 68, 68, 0.1); }
.file-icon-wrapper.document { background-color: rgba(34, 197, 94, 0.1); }
.file-icon-wrapper.other { background-color: rgba(107, 114, 128, 0.1); }

.file-icon {
  width: 24px;
  height: 24px;
  color: currentColor;
}

.file-info {
  flex: 1;
  min-width: 0;
  flex-flow: column;
  display: flex;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #000;
}

.file-size {
  opacity: 0.6;
  font-size: 12px;
  margin-top: 2px;
}

.file-checkmark {
  flex: none;
  width: 20px;
  height: 20px;
  color: var(--vcs-purple);
  animation: checkmarkBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.2s both;
}

.file-delete-btn {
  flex: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
}

.formupload.has-file:hover .file-delete-btn {
  opacity: 1;
}

.file-delete-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

@keyframes fileCardSlideIn {
  from {
    opacity: 0;
    transform: translateX(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes checkmarkBounce {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.uploadlabel { opacity: .5; font-size: 13px; }
.upload-icon { width: 24px; height: 24px; opacity: 0.5; transition: transform 0.3s ease; flex-shrink: 0; }
.upload-icon.flip { animation: iconFlip 0.4s ease forwards; }
@keyframes iconFlip {
  0% { transform: rotateY(0deg); }
  50% { transform: rotateY(90deg); }
  100% { transform: rotateY(0deg); }
}
.formupload.has-file { display: flex; flex-direction: row; align-items: center; }
.formupload.has-file > div:first-child { display: flex; flex-direction: row; align-items: center; }

.stylefield-block.full { display: flex; align-items: center; gap: 12px; }
.uploadedicon { width: 30px; height: 30px; flex-shrink: 0; }
.uploadedcontent { display: flex; flex-direction: column; }
.uploadtitle { font-size: 16px; font-weight: 500; color: #000; }
.uploadsubtitle { font-size: 13px; color: #666; opacity: 0.7; }
.uploadsubtitle.delete { color: #dc2626; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; }
.uploadsubtitle.delete:hover { opacity: 1; }
.upload-delete-text { margin-top: 8px; font-size: 13px; color: #dc2626; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; }
.upload-delete-text:hover { opacity: 1; }

/* Auth gate styles */
.widget-content.account { display: flex; flex-direction: column; padding: 10px 10px 0; }
.widget-content.account .tabheading-wrap.center { text-align: center; padding: 0 20px; }
.widget-content.account .tab-heading { font-size: 21px; margin-top: 7px; margin-bottom: 5px; }
.widget-content.account .tab-subheading { margin-bottom: 7px; }
.widget-content.account .formcontent-wrap { padding: 0 10px 10px; flex: none; }
.formwrap.loginwrap { display: flex; flex-direction: column; gap: 10px; border: 1.5px solid var(--admin-border, #e5e5e5); background-color: #f8f8f8; border-radius: 10px; padding: 15px; flex: none; }
.formwrap.loginwrap[account-flow="magic-create"],
.formwrap.loginwrap[account-flow="magic-login"] { display: none; }
.formwrap.loginwrap.active-flow { display: flex !important; }
.google-auth-button { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border: 1.5px solid var(--admin-border, #e5e5e5); border-radius: 10px; cursor: pointer; font-size: 15px; font-weight: 500; transition: background 0.2s; text-decoration: none; color: inherit; height: 50px; background-color: #fff; }
.google-auth-button:hover { background: #f5f5f5; }
.google-auth-button .google-icon { width: 20px; height: 20px; border-radius: 4px; }
.formlabel.smalldim { font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.05em; }
.formwrap.loginwrap > .formfield-block > .labelrow > .formlabel.smalldim { margin: 5px 0; }
.auth-gate-error { color: #dc2626; font-size: 13px; text-align: center; padding: 4px 0; }
.auth-gate-resend { font-size: 13px; text-align: center; color: #666; }
.auth-gate-resend a { color: var(--vcs-purple, #7C3AED); cursor: pointer; text-decoration: underline; }

.formbutton {
  background-color: var(--vcs-purple);
  color: #fff;
  opacity: .9;
  filter: brightness(95%);
  border: none;
  border-radius: 10px;
  height: 50px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
  font-family: inherit;
}
.formbutton:hover { opacity: 100; filter: brightness(110%); }

/* ---- Success Message ---- */

.successmessage {
  background-color: var(--vcs-purple);
  color: #fff;
  border-radius: 0;
  flex: 1;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: glanceFadeIn 0.3s ease;
  z-index: 10;
}

.success-message-content {
  grid-column-gap: 20px;
  grid-row-gap: 20px;
  flex-flow: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 100%;
  padding: 0 23px;
  font-size: 19px;
  line-height: 1.5em;
  display: flex;
}
.success-back-btn {
  margin-top: 12px;
  font-size: 15.55px;
  font-weight: 500;
  padding: 10px 28px;
  border-radius: 10px;
  height: 50px;
  cursor: pointer;
  background: transparent;
  color: #fff;
  border: 1.5px solid rgba(255,255,255,0.35);
  opacity: 0.85;
  transition: all 0.2s ease;
  font-family: inherit;
  filter: none;
}
.success-back-btn:hover {
  opacity: 1;
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.6);
}

.success-icon {
  width: 50px;
  margin-left: auto;
  margin-right: auto;
}

/* ---- Chat ---- */

.tldrchats {
  grid-column-gap: 20px;
  grid-row-gap: 20px;
  flex-flow: column;
  flex: 1;
  padding: 10px;
  display: flex;
  overflow-y: auto;
}

.glancechat-block {
  grid-column-gap: 6px;
  grid-row-gap: 6px;
  flex-flow: column;
  justify-content: flex-start;
  align-items: flex-start;
  display: flex;
}
.glancechat-block.userchat-block {
  justify-content: flex-start;
  align-items: flex-end;
}

.tldrchat-bubble {
  background-color: color-mix(in srgb, var(--vcs-purple) 85%, black);
  color: #fff;
  border: 1px solid #90b8001a;
  border-radius: 10px;
  flex-flow: column;
  margin-right: 20px;
  padding: 14px 15px;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.5em;
  display: flex;
  animation: glanceFadeIn 0.2s ease;
}
.tldrchat-bubble.userchat {
  color: var(--dark);
  background-color: #f7f7f7;
  margin-left: 20px;
  margin-right: 0;
}

.glancechat-label {
  opacity: .3;
  color: #000;
  padding-left: 4px;
  padding-right: 4px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1em;
}

.glancechat-messaging {
  grid-column-gap: 10px;
  grid-row-gap: 10px;
  background-color: #fff;
  border-top: 1.5px solid #066f3a1a;
  flex-flow: column;
  padding: 10px;
  display: flex;
}

.suggested-prompts-wrapper {
  grid-column-gap: 5px;
  grid-row-gap: 5px;
  flex-flow: wrap;
  justify-content: flex-end;
  align-items: flex-start;
  display: flex;
}

.suggested-prompt-pill {
  color: #000;
  background-color: #066f3a05;
  border: 1.5px solid #066f3a0d;
  border-radius: 60px;
  justify-content: center;
  align-items: center;
  height: 33px;
  padding-left: 10px;
  padding-right: 10px;
  font-size: 13.7px;
  font-weight: 500;
  text-decoration: none;
  display: flex;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s ease;
}
.suggested-prompt-pill:hover { border-color: var(--vcs-purple); }

.glancechat-field {
  border: 1.5px solid #066f3a1a;
  border-radius: 10px;
  justify-content: flex-start;
  align-items: center;
  min-height: 50px;
  padding: 0 12px;
  display: flex;
  position: relative;
}

.glancechat-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  font-family: inherit;
  color: var(--black);
  background: transparent;
  padding: 12px 40px 12px 0;
  resize: none;
  min-height: 40px;
  max-height: 100px;
}
.glancechat-input::placeholder { opacity: 0.4; }

.glancechat-placeholder { opacity: .4; }

.tldrchat-send-button {
  grid-column-gap: 0px;
  grid-row-gap: 0px;
  background: none;
  border: none;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  display: flex;
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.tldrchat-send-button:hover:not(:disabled) { background-color: rgba(0,0,0,0.06); }
.tldrchat-send-button:hover:not(:disabled) .sendwaves { opacity: 1; }
.tldrchat-send-button:hover:not(:disabled) .sendicon { transform: translateX(2px); }
.tldrchat-send-button:active:not(:disabled) { transform: translateY(-50%) scale(0.92); background-color: rgba(0,0,0,0.1); }
.tldrchat-send-button:disabled { opacity: 0.3; cursor: default; }

.sendwaves { opacity: 0; transition: opacity 0.15s ease; }
.sendicon { width: 20px; transition: transform 0.15s ease; }

/* ---- Typing Indicator ---- */

.glance-typing {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 14px 15px;
  background-color: color-mix(in srgb, var(--vcs-purple) 85%, black);
  border: 1px solid #90b8001a;
  border-radius: 10px;
  margin-right: 20px;
  align-self: flex-start;
  animation: glanceFadeIn 0.2s ease;
}
.glance-typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.6);
  animation: glanceBounce 1.2s infinite;
}
.glance-typing-dot:nth-child(2) { animation-delay: 0.15s; }
.glance-typing-dot:nth-child(3) { animation-delay: 0.3s; }

/* ---- Chat Markdown ---- */

.chat-markdown {
  font-size: 15px;
  line-height: inherit;
}
.chat-markdown p {
  margin: 0 0 10px 0;
  font-size: 15px;
  line-height: inherit;
}
.chat-markdown br {
  display: block;
  content: "";
  margin-bottom: 10px;
}
.chat-markdown p:last-child {
  margin-bottom: 0;
}
.chat-markdown strong {
  font-weight: 600;
}
.chat-markdown em {
  font-style: italic;
}
.chat-markdown ul, .chat-markdown ol {
  margin: 0.25em 0;
  padding-left: 1.4em;
  font-size: inherit;
  line-height: inherit;
}
.chat-markdown li {
  margin-bottom: 0;
  font-size: inherit;
  line-height: inherit;
}
.chat-markdown a {
  color: inherit !important;
  text-decoration: underline;
}
.tldrchat-bubble .chat-markdown a {
  color: #fff !important;
  text-decoration: underline;
}
.tldrchat-bubble.userchat .chat-markdown a {
  color: var(--dark) !important;
}
.chat-markdown h1, .chat-markdown h2, .chat-markdown h3 {
  font-size: 1em;
  font-weight: 600;
  margin: 0.6em 0 0.3em 0;
}
.chat-markdown h1:first-child,
.chat-markdown h2:first-child,
.chat-markdown h3:first-child {
  margin-top: 0;
}
.chat-markdown code {
  background: rgba(255,255,255,0.15);
  padding: 0.15em 0.3em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}
.chat-markdown pre {
  background: rgba(0,0,0,0.15);
  padding: 0.6em;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.4em 0;
}
.chat-markdown pre code {
  background: none;
  padding: 0;
  font-size: 0.85em;
}
.chat-markdown hr {
  border: none;
  border-top: 1px solid rgba(255,255,255,0.2);
  margin: 0.6em 0;
}

/* User chat markdown overrides (dark text on light background) */
.tldrchat-bubble.userchat .chat-markdown code {
  background: rgba(0,0,0,0.06);
}
.tldrchat-bubble.userchat .chat-markdown pre {
  background: rgba(0,0,0,0.06);
}
.tldrchat-bubble.userchat .chat-markdown hr {
  border-top-color: rgba(0,0,0,0.1);
}

/* ---- TLDR Content Types ---- */

.contenttype-block {
  grid-column-gap: 5px;
  grid-row-gap: 5px;
  flex-flow: column;
  display: flex;
}

.galleryimage {
  aspect-ratio: 3 / 2;
  border: 1.5px solid var(--admin-border);
  object-fit: fill;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}

.text-block {
  position: static;
}

.imageoverlay {
  opacity: 0;
  color: #fff;
  background-image: linear-gradient(#0000 30%, #000c 90%);
  flex-flow: column;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 12px 20px 12px 12px;
  line-height: 1.4em;
  transition: all .23s;
  display: flex;
  position: absolute;
  inset: 0%;
}

.imageoverlay:hover {
  opacity: 100;
}

.videowrapper {
  aspect-ratio: 16 / 9;
  border: 1.5px solid var(--admin-border);
  object-fit: fill;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}

.content-stack-link {
  grid-column-gap: 10px;
  grid-row-gap: 10px;
  color: #000;
  background-color: #107e7f05;
  border: 1.5px solid #066f3a1a;
  border-radius: 10px;
  flex-flow: column;
  justify-content: flex-start;
  align-items: center;
  padding: 5px;
  text-decoration: none;
  display: flex;
}

.content-stack-link:hover {
  border-color: var(--vcs-purple);
  background-color: #107e7f0a;
}

.content-stack-image {
  aspect-ratio: 16 / 9;
  border: 1.5px solid #066f3a1a;
  border-radius: 10px;
  flex: none;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.content-stack-block {
  padding: 5px 10px 10px;
}

.content-stack-header {
  font-size: 17px;
  font-weight: 500;
  line-height: 1.2em;
}

.content-stack-subheader {
  opacity: .6;
  margin-top: 3px;
  font-size: 15px;
  line-height: 1.4em;
}

.contentquote-row {
  grid-column-gap: 7px;
  grid-row-gap: 7px;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  padding: 0;
  display: flex;
}

.content-quote-name {
  margin-top: 5px;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.2em;
}

.content-quote-title {
  opacity: .6;
  margin-top: 1px;
  font-size: 14px;
  line-height: 1.4em;
}

.content-quote-image {
  border: 1.5px solid var(--admin-border);
  border-radius: 10px;
  width: 50px;
  height: 50px;
  position: relative;
  overflow: hidden;
}

.content-quote-wrapper {
  width: 100%;
  font-size: 16px;
  line-height: 1.4em;
}

.content-quote {
  grid-column-gap: 15px;
  grid-row-gap: 15px;
  color: #000;
  background-color: #107e7f05;
  border: 1.5px solid #066f3a1a;
  border-radius: 10px;
  flex-flow: column;
  justify-content: flex-start;
  align-items: center;
  padding: 13px;
  text-decoration: none;
  display: flex;
}

.text-block-2 {
  font-size: 16px;
  font-weight: 400;
  line-height: 26px;
}

/* ---- Placeholder ---- */

.glance-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #666;
  font-size: 14px;
}

/* ---- Animations ---- */

@keyframes glanceFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes glanceSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes glancePromptSlideIn {
  from { opacity: 0; transform: translateX(5px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes glanceBounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}
`;/* Auth gate renderer for premium content */
function G(l,e,s,p,c,widgetEl){
  let auth=widgetEl&&widgetEl.config&&widgetEl.config.auth||{};
  let w=document.createElement("div");
  w.className="widget-content account";
  /* Banner */
  let bannerUrl=auth.banner_url||l.tldr_banner_url;
  if(bannerUrl){let bh=document.createElement("div");bh.className="tabhero no-pull";let bi=document.createElement("img");bi.src=bannerUrl;bi.loading="lazy";bi.className="full-image";bh.appendChild(bi);w.appendChild(bh)}
  /* Heading */
  let hw=document.createElement("div");hw.className="tabheading-wrap center";
  let hd=document.createElement("div");hd.className="tab-heading";hd.textContent=auth.title||"Premium Content";hw.appendChild(hd);
  let hs=document.createElement("div");hs.className="tab-subheading";hs.textContent=auth.subtitle||"Login or create your FREE account to access this content.";hw.appendChild(hs);
  w.appendChild(hw);
  /* Form wrapper */
  let showGoogle=auth.google_enabled!==false;
  let showMagic=auth.magic_link_enabled!==false;
  let fw=document.createElement("div");fw.className="formcontent-wrap";
  let mc=null,ml=null;
  /* ---- Default flow ---- */
  let df=document.createElement("form");df.className="formwrap loginwrap active-flow";df.setAttribute("account-flow","default");
  /* Google auth button */
  if(showGoogle){
  let gb=document.createElement("div");
  let ga=document.createElement("a");ga.href="#";ga.className="google-auth-button w-inline-block";
  let gi=document.createElement("img");gi.src=c+"/images/adTFhODz_400x400.jpg";gi.loading="lazy";gi.className="google-icon";ga.appendChild(gi);
  let gt=document.createElement("div");gt.textContent="Continue with Google";ga.appendChild(gt);
  ga.addEventListener("click",ev=>{ev.preventDefault();
    let popup=window.open(c+"/api/widget-auth/google?widget_id="+s,"glance_google_auth","width=500,height=600,scrollbars=yes");
    window.addEventListener("message",function handler(msg){
      if(msg.data&&msg.data.glance_auth_token){
        window.removeEventListener("message",handler);
        localStorage.setItem("glance_session_"+p,msg.data.glance_auth_token);
        if(widgetEl)widgetEl.renderActiveTab()
      }
    })
  });
  gb.appendChild(ga);df.appendChild(gb);
  }
  /* Divider */
  if(showGoogle&&showMagic){
  let dv=document.createElement("div");dv.className="formfield-block";
  let dr=document.createElement("div");dr.className="labelrow";
  let dd1=document.createElement("div");dd1.className="labeldivider";dr.appendChild(dd1);
  let dl=document.createElement("div");dl.className="formlabel smalldim";dl.textContent="Or Use Login Code";dr.appendChild(dl);
  let dd2=document.createElement("div");dd2.className="labeldivider";dr.appendChild(dd2);
  dv.appendChild(dr);df.appendChild(dv);
  }
  /* Email input */
  if(showMagic){
  let ef=document.createElement("div");ef.className="formfield-block";
  let er=document.createElement("div");er.className="labelrow";
  let el=document.createElement("div");el.className="formlabel";el.textContent="Email Address";er.appendChild(el);
  let ed=document.createElement("div");ed.className="labeldivider";er.appendChild(ed);
  ef.appendChild(er);
  let ei=document.createElement("input");ei.className="formfields w-input";ei.type="email";ei.placeholder="";ei.maxLength=256;
  ef.appendChild(ei);df.appendChild(ef);
  /* Error display */
  let errDiv=document.createElement("div");errDiv.className="auth-gate-error";errDiv.style.display="none";df.appendChild(errDiv);
  /* Send Login Code button */
  let sb=document.createElement("input");sb.type="button";sb.className="formbutton w-button";sb.value="Send Login Code";
  sb.addEventListener("click",async()=>{
    let email=ei.value.trim();
    if(!email){errDiv.textContent="Please enter your email address.";errDiv.style.display="block";return}
    sb.disabled=!0;sb.value="Sending...";errDiv.style.display="none";
    try{
      let res=await fetch(c+"/api/widget-auth/send-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,widget_id:s})});
      let data=await res.json();
      if(!res.ok){errDiv.textContent=data.error||"Failed to send code";errDiv.style.display="block";sb.disabled=!1;sb.value="Send Login Code";return}
      /* Switch to magic-create or magic-login */
      df.classList.remove("active-flow");df.style.display="none";
      if(data.exists){ml.classList.add("active-flow");ml._email=email}
      else{mc.classList.add("active-flow");mc._email=email}
    }catch(err){errDiv.textContent="Something went wrong. Please try again.";errDiv.style.display="block"}
    finally{sb.disabled=!1;sb.value="Send Login Code"}
  });
  df.appendChild(sb);
  }
  fw.appendChild(df);
  if(showMagic){
  /* ---- Magic Create flow (new user) ---- */
  mc=document.createElement("form");mc.className="formwrap loginwrap";mc.setAttribute("account-flow","magic-create");
  let mch=document.createElement("div");mch.className="tabheading-wrap center";
  let mchd=document.createElement("div");mchd.className="tab-heading";mchd.textContent="A 6-digit code has been sent to your email";mch.appendChild(mchd);
  let mchs=document.createElement("div");mchs.className="tab-subheading auth-gate-resend";mchs.innerHTML='Didn\'t get it? <a href="#">Resend now.</a>';
  mchs.querySelector("a").addEventListener("click",ev=>{ev.preventDefault();
    fetch(c+"/api/widget-auth/send-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:mc._email,widget_id:s})}).then(()=>{mchs.innerHTML='Code resent! <a href="#">Resend again.</a>';mchs.querySelector("a").addEventListener("click",ev=>{ev.preventDefault();fetch(c+"/api/widget-auth/send-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:mc._email,widget_id:s})})})})
  });
  mch.appendChild(mchs);mc.appendChild(mch);
  /* Code input */
  let mcf1=document.createElement("div");mcf1.className="formfield-block";
  let mcr1=document.createElement("div");mcr1.className="labelrow";
  let mcl1=document.createElement("div");mcl1.className="formlabel";mcl1.textContent="Login Code";mcr1.appendChild(mcl1);
  let mcd1=document.createElement("div");mcd1.className="labeldivider";mcr1.appendChild(mcd1);
  mcf1.appendChild(mcr1);
  let mci1=document.createElement("input");mci1.className="formfields w-input";mci1.type="text";mci1.maxLength=6;mci1.placeholder="";
  mcf1.appendChild(mci1);mc.appendChild(mcf1);
  /* Divider */
  let mcdv=document.createElement("div");mcdv.className="labelrow";
  let mcdv1=document.createElement("div");mcdv1.className="labeldivider";mcdv.appendChild(mcdv1);
  let mcdvl=document.createElement("div");mcdvl.className="formlabel smalldim";mcdvl.textContent="Additional Details Needed";mcdv.appendChild(mcdvl);
  let mcdv2=document.createElement("div");mcdv2.className="labeldivider";mcdv.appendChild(mcdv2);
  mc.appendChild(mcdv);
  /* First Name */
  let mcf2=document.createElement("div");mcf2.className="formfield-block";
  let mcr2=document.createElement("div");mcr2.className="labelrow";
  let mcl2=document.createElement("div");mcl2.className="formlabel";mcl2.textContent="First Name";mcr2.appendChild(mcl2);
  let mcd2=document.createElement("div");mcd2.className="labeldivider";mcr2.appendChild(mcd2);
  mcf2.appendChild(mcr2);
  let mci2=document.createElement("input");mci2.className="formfields w-input";mci2.type="text";mci2.maxLength=256;mci2.placeholder="";
  mcf2.appendChild(mci2);mc.appendChild(mcf2);
  /* Last Name */
  let mcf3=document.createElement("div");mcf3.className="formfield-block";
  let mcr3=document.createElement("div");mcr3.className="labelrow";
  let mcl3=document.createElement("div");mcl3.className="formlabel";mcl3.textContent="Last Name";mcr3.appendChild(mcl3);
  let mcd3=document.createElement("div");mcd3.className="labeldivider";mcr3.appendChild(mcd3);
  mcf3.appendChild(mcr3);
  let mci3=document.createElement("input");mci3.className="formfields w-input";mci3.type="text";mci3.maxLength=256;mci3.placeholder="";
  mcf3.appendChild(mci3);mc.appendChild(mcf3);
  /* Error */
  let mcErr=document.createElement("div");mcErr.className="auth-gate-error";mcErr.style.display="none";mc.appendChild(mcErr);
  /* Login button */
  let mcBtn=document.createElement("input");mcBtn.type="button";mcBtn.className="formbutton w-button";mcBtn.value="Login";
  mcBtn.addEventListener("click",async()=>{
    let code=mci1.value.trim(),fn=mci2.value.trim(),ln=mci3.value.trim();
    if(!code||!fn||!ln){mcErr.textContent="Please fill in all fields.";mcErr.style.display="block";return}
    mcBtn.disabled=!0;mcBtn.value="Creating...";mcErr.style.display="none";
    try{
      let res=await fetch(c+"/api/widget-auth/verify-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:mc._email,code,widget_id:s,first_name:fn,last_name:ln})});
      let data=await res.json();
      if(!res.ok){mcErr.textContent=data.error||"Verification failed";mcErr.style.display="block";mcBtn.disabled=!1;mcBtn.value="Login";return}
      if(!data||!data.token){mcErr.textContent="Invalid response from server. Please try again.";mcErr.style.display="block";mcBtn.disabled=!1;mcBtn.value="Login";return}
      localStorage.setItem("glance_session_"+p,data.token);if(data.user&&data.user.id){_glanceUserId=data.user.id;_glanceUser=data.user}
      try{if(widgetEl)widgetEl.renderActiveTab()}catch(renderErr){console.error("[Glance] renderActiveTab error:",renderErr);mcErr.textContent="Something went wrong. Please try again.";mcErr.style.display="block"}
      mcBtn.disabled=!1;mcBtn.value="Login"
    }catch(err){mcErr.textContent="Something went wrong. Please try again.";mcErr.style.display="block";mcBtn.disabled=!1;mcBtn.value="Login"}
  });
  mc.appendChild(mcBtn);fw.appendChild(mc);
  /* ---- Magic Login flow (existing user) ---- */
  ml=document.createElement("form");ml.className="formwrap loginwrap";ml.setAttribute("account-flow","magic-login");
  let mlh=document.createElement("div");mlh.className="tabheading-wrap center";
  let mlhd=document.createElement("div");mlhd.className="tab-heading";mlhd.textContent="A 6-digit code has been sent to your email";mlh.appendChild(mlhd);
  let mlhs=document.createElement("div");mlhs.className="tab-subheading auth-gate-resend";mlhs.innerHTML='Didn\'t get it? <a href="#">Resend now.</a>';
  mlhs.querySelector("a").addEventListener("click",ev=>{ev.preventDefault();
    fetch(c+"/api/widget-auth/send-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:ml._email,widget_id:s})}).then(()=>{mlhs.innerHTML='Code resent! <a href="#">Resend again.</a>';mlhs.querySelector("a").addEventListener("click",ev=>{ev.preventDefault();fetch(c+"/api/widget-auth/send-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:ml._email,widget_id:s})})})})
  });
  mlh.appendChild(mlhs);ml.appendChild(mlh);
  /* Code input */
  let mlf1=document.createElement("div");mlf1.className="formfield-block";
  let mlr1=document.createElement("div");mlr1.className="labelrow";
  let mll1=document.createElement("div");mll1.className="formlabel";mll1.textContent="Login Code";mlr1.appendChild(mll1);
  let mld1=document.createElement("div");mld1.className="labeldivider";mlr1.appendChild(mld1);
  mlf1.appendChild(mlr1);
  let mli1=document.createElement("input");mli1.className="formfields w-input";mli1.type="text";mli1.maxLength=6;mli1.placeholder="";
  mlf1.appendChild(mli1);ml.appendChild(mlf1);
  /* Error */
  let mlErr=document.createElement("div");mlErr.className="auth-gate-error";mlErr.style.display="none";ml.appendChild(mlErr);
  /* Login button */
  let mlBtn=document.createElement("input");mlBtn.type="button";mlBtn.className="formbutton w-button";mlBtn.value="Login";
  mlBtn.addEventListener("click",async()=>{
    let code=mli1.value.trim();
    if(!code){mlErr.textContent="Please enter the code.";mlErr.style.display="block";return}
    mlBtn.disabled=!0;mlBtn.value="Logging in...";mlErr.style.display="none";
    try{
      let res=await fetch(c+"/api/widget-auth/verify-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:ml._email,code,widget_id:s})});
      let data=await res.json();
      if(!res.ok){mlErr.textContent=data.error||"Verification failed";mlErr.style.display="block";mlBtn.disabled=!1;mlBtn.value="Login";return}
      if(!data||!data.token){mlErr.textContent="Invalid response from server. Please try again.";mlErr.style.display="block";mlBtn.disabled=!1;mlBtn.value="Login";return}
      localStorage.setItem("glance_session_"+p,data.token);if(data.user&&data.user.id){_glanceUserId=data.user.id;_glanceUser=data.user}
      try{if(widgetEl)widgetEl.renderActiveTab()}catch(renderErr){console.error("[Glance] renderActiveTab error:",renderErr);mlErr.textContent="Something went wrong. Please try again.";mlErr.style.display="block"}
      mlBtn.disabled=!1;mlBtn.value="Login"
    }catch(err){mlErr.textContent="Something went wrong. Please try again.";mlErr.style.display="block";mlBtn.disabled=!1;mlBtn.value="Login"}
  });
  ml.appendChild(mlBtn);fw.appendChild(ml);
  }
  w.appendChild(fw);e.appendChild(w);
  return null
}

function R(l,e,s,p,q){let c=l.form_fields||[],r={},f={},_uploading=0,_st=null,_lu=null;{let _wsId=q?.config?.workspace_id||s;let _tk=localStorage.getItem("glance_session_"+_wsId);if(_tk)_st=_tk}let h=document.createElement("div");if(h.className="widget-content forms",h.style.display="flex",l.tldr_banner_url){let t=document.createElement("div");t.className="tabhero no-pull";let i=document.createElement("img");i.className="full-image",i.src=l.tldr_banner_url,i.alt="",i.loading="lazy",t.appendChild(i),h.appendChild(t)}if(l.tldr_title||l.tldr_subtitle){let t=document.createElement("div");if(t.className="tabheading-wrap",l.tldr_title){let i=document.createElement("div");i.className="tab-heading",i.textContent=l.tldr_title,t.appendChild(i)}if(l.tldr_subtitle){let i=document.createElement("div");i.className="tab-subheading",i.textContent=l.tldr_subtitle,t.appendChild(i)}h.appendChild(t)}let u=document.createElement("div");u.className="formcontent-wrap";let w=document.createElement("div");w.className="formblocks";let o=document.createElement("form");o.className="formwrap",o.addEventListener("submit",t=>t.preventDefault()),c.forEach(t=>{if(t.type==="File Upload"){let i=document.createElement("div");i.className="formfield-block upload";let a=document.createElement("div");a.className="labelrow";let g=document.createElement("div");g.className="formlabel",g.textContent=t.label||"Upload",a.appendChild(g);let x=document.createElement("div");x.className="labeldivider",a.appendChild(x),i.appendChild(a);let d=document.createElement("input");d.type="file",d.style.display="none",d.accept="*/*",r[t.label]=d,i.appendChild(d);let b=document.createElement("div");b.className="formupload",b.innerHTML=`
<div class="stylefield-block full"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" app="ikonik" class="uploadedicon"><path d="M8 16L12 12M12 12L16 16M12 12V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" app="ikonik" class="path-rp16ki"></path><path d="M6.3414 6.15897C7.16507 3.73597 9.38755 2 12 2C15.3137 2 18 4.79305 18 8.23846C20.2091 8.23846 22 10.1005 22 12.3974C22 13.9368 21.1956 15.2809 20 16M6.32069 6.20644C3.8806 6.55106 2 8.72597 2 11.3576C2 13.0582 2.7854 14.5682 3.99965 15.5167" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" app="ikonik" class="path-v8sxp"></path></svg><div class="uploadedcontent"><div class="uploadtitle">Upload</div><div class="uploadsubtitle">Max of 20MB</div></div></div>
      `,b.addEventListener("click",(ev)=>{if(!ev.target.closest(".delete")){d.click()}}),d.addEventListener("change",async()=>{let m=d.files?.[0];if(!m)return;let _fe=o.querySelector(".form-error");if(_fe)_fe.style.display="none";if(m.size>20*1024*1024){d.value="";f[t.label]=null;if(_fe){_fe.textContent="File too large. Maximum size is 20MB.";_fe.style.display="block"}return}b.classList.add("uploaded");b.innerHTML='<div class="stylefield-block full"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" app="ikonik" class="uploadedicon"><path d="M8 16L12 12M12 12L16 16M12 12V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" app="ikonik" class="path-rp16ki"></path><path d="M6.3414 6.15897C7.16507 3.73597 9.38755 2 12 2C15.3137 2 18 4.79305 18 8.23846C20.2091 8.23846 22 10.1005 22 12.3974C22 13.9368 21.1956 15.2809 20 16M6.32069 6.20644C3.8806 6.55106 2 8.72597 2 11.3576C2 13.0582 2.7854 14.5682 3.99965 15.5167" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" app="ikonik" class="path-v8sxp"></path></svg><div class="uploadedcontent"><div class="uploadtitle">Uploading\u2026</div><div class="uploadsubtitle">Please wait</div></div></div>';_uploading++;try{let ur=await fetch(p+"/api/forms/upload-url",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({widget_id:s,file_name:m.name,content_type:m.type,file_size:m.size})});if(!ur.ok)throw new Error("url");let ud=await ur.json();let up=await fetch(ud.signed_url,{method:"PUT",headers:{"Content-Type":m.type||"application/octet-stream"},body:m});if(!up.ok)throw new Error("upload");f[t.label]={publicUrl:ud.public_url,fileName:m.name};let fileSize=m.size<1024?m.size+"B":m.size<1048576?(m.size/1024).toFixed(1)+"KB":(m.size/1048576).toFixed(1)+"MB",fileName=m.name.length>30?m.name.substring(0,27)+"...":m.name;b.innerHTML='<div class="stylefield-block full"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" app="ikonik" class="uploadedicon"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" app="ikonik" class="circle-6dywig"></circle><path d="M8 12.5L11 15.5L16 9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" app="ikonik" class="path-6x0yoi"></path></svg><div class="uploadedcontent"><div class="uploadtitle">'+fileName+'</div><div class="uploadsubtitle">'+fileSize+'</div><div class="uploadsubtitle delete">Delete</div></div></div>';let deleteText=b.querySelector(".delete");if(deleteText){deleteText.addEventListener("click",(ev)=>{ev.stopPropagation();d.value="";f[t.label]=null;b.classList.remove("uploaded");b.innerHTML='<div class="stylefield-block full"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" app="ikonik" class="uploadedicon"><path d="M8 16L12 12M12 12L16 16M12 12V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" app="ikonik" class="path-rp16ki"></path><path d="M6.3414 6.15897C7.16507 3.73597 9.38755 2 12 2C15.3137 2 18 4.79305 18 8.23846C20.2091 8.23846 22 10.1005 22 12.3974C22 13.9368 21.1956 15.2809 20 16M6.32069 6.20644C3.8806 6.55106 2 8.72597 2 11.3576C2 13.0582 2.7854 14.5682 3.99965 15.5167" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" app="ikonik" class="path-v8sxp"></path></svg><div class="uploadedcontent"><div class="uploadtitle">Upload</div><div class="uploadsubtitle">Max of 20MB</div></div></div>'})}}catch(err){console.error("[Glance] File upload error:",err);f[t.label]=null;d.value="";b.classList.remove("uploaded");b.innerHTML='<div class="stylefield-block full"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" app="ikonik" class="uploadedicon"><path d="M8 16L12 12M12 12L16 16M12 12V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" app="ikonik" class="path-rp16ki"></path><path d="M6.3414 6.15897C7.16507 3.73597 9.38755 2 12 2C15.3137 2 18 4.79305 18 8.23846C20.2091 8.23846 22 10.1005 22 12.3974C22 13.9368 21.1956 15.2809 20 16M6.32069 6.20644C3.8806 6.55106 2 8.72597 2 11.3576C2 13.0582 2.7854 14.5682 3.99965 15.5167" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" app="ikonik" class="path-v8sxp"></path></svg><div class="uploadedcontent"><div class="uploadtitle">Upload</div><div class="uploadsubtitle">Max of 20MB</div></div></div>';if(_fe){_fe.textContent="File upload failed. Please try again.";_fe.style.display="block"}}finally{_uploading--}}),i.appendChild(b),o.appendChild(i)}else if(t.type==="Text Area"){let i=document.createElement("div");i.className="formfield-block";let a=document.createElement("div");a.className="labelrow";let g=document.createElement("div");g.className="formlabel",g.textContent=t.label||t.type,a.appendChild(g);let x=document.createElement("div");x.className="labeldivider",a.appendChild(x),i.appendChild(a);let d=document.createElement("textarea");d.className="formfields message",d.name=t.label,d.placeholder="",i.appendChild(d),o.appendChild(i)}else if(t.type==="Checkbox(es)"){let i=document.createElement("div");i.className="formfield-block";let a=document.createElement("div");a.className="labelrow";let g=document.createElement("div");g.className="formlabel",g.textContent=t.label||t.type,a.appendChild(g);let x=document.createElement("div");x.className="labeldivider",a.appendChild(x),i.appendChild(a);let d=document.createElement("label");d.style.cssText="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;";let b=document.createElement("input");b.type="checkbox",b.name=t.label,b.value="Yes",d.appendChild(b);let m=document.createElement("span");m.textContent=t.label,d.appendChild(m),i.appendChild(d),o.appendChild(i)}else{let i=document.createElement("div");i.className="formfield-block";let a=document.createElement("div");a.className="labelrow";let g=document.createElement("div");g.className="formlabel",g.textContent=t.label||t.type,a.appendChild(g);let x=document.createElement("div");x.className="labeldivider",a.appendChild(x),i.appendChild(a);let d=document.createElement("input");d.className="formfields",d.name=t.label,d.placeholder="",d.type=t.type==="Email"?"email":t.type==="Phone Number"?"tel":t.type==="Link / URL"?"url":"text",i.appendChild(d),o.appendChild(i)}});let _ferr=document.createElement("div");_ferr.className="form-error auth-gate-error";_ferr.style.display="none";o.appendChild(_ferr);let n=document.createElement("input");n.type="button",n.className="formbutton",n.value="Submit",o.appendChild(n),w.appendChild(o),u.appendChild(w),h.appendChild(u),e.appendChild(h);if(_st){fetch(p+"/api/widget-auth/verify-session?widget_id="+s,{headers:{Authorization:"Bearer "+_st}}).then(v=>v.json()).then(v=>{if(v.valid&&v.user){_lu=v.user;["first name","last name","email"].forEach(hl=>{o.querySelectorAll(".formfield-block").forEach(fb=>{let fl=fb.querySelector(".formlabel");if(fl&&fl.textContent.toLowerCase().trim()===hl)fb.style.display="none"})})}}).catch(()=>{})}n.addEventListener("click",async()=>{let _fe=o.querySelector(".form-error");if(_fe)_fe.style.display="none";if(_uploading>0){if(_fe){_fe.textContent="Please wait for file upload to finish.";_fe.style.display="block"}return}n.disabled=!0,n.value="Submitting...";try{let t=new FormData;t.append("widget_id",s),t.append("form_name",l.name);if(_st)t.append("_glance_session_token",_st);c.forEach(a=>{if(a.type==="File Upload"){let g=f[a.label];if(g&&g.publicUrl){t.append(a.label,g.fileName);t.append(a.label+'__url',g.publicUrl)}}else if(a.type==="Checkbox(es)"){let g=o.querySelector(`input[name="${CSS.escape(a.label)}"]`);t.append(a.label,g?.checked?"Yes":"No")}else{let g=o.querySelector(`[name="${CSS.escape(a.label)}"]`);t.append(a.label,g?.value||"")}});let i=await fetch(`${p}/api/forms/submit`,{method:"POST",body:t});if(i.ok){let a=await i.json();_glanceTrack('form_submitted',{form_name:l.name||'',tab_type:'Form'});var _sm=a.success_message||l.form_success_message||"Thank you! Your submission has been received.";var _su=_glanceUser||_lu;if(_su){_sm=_sm.replace(/\{\{first_name\}\}/g,_su.first_name||'').replace(/\{\{last_name\}\}/g,_su.last_name||'').replace(/\{\{email\}\}/g,_su.email||'')}W(h,_sm)}else{n.disabled=!1,n.value="Submit";let _msg="Something went wrong. Please try again.";if(_fe){_fe.textContent=_msg;_fe.style.display="block"}console.error("[Glance] Form submission failed:",i.status)}}catch(t){n.disabled=!1,n.value="Submit";if(_fe){_fe.textContent="Something went wrong. Please try again.";_fe.style.display="block"}console.error("[Glance] Form submission error:",t)}});return null}function W(l,e){let s=document.createElement("div");s.className="successmessage",s.innerHTML=`
    <div class="success-message-content">
      <svg class="success-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <div>${A(e)}</div>
      <button class="formbutton success-back-btn">Go back to form</button>
    </div>
`);E=$.pop()||"";for(let Z of $){let S=Z.trim();if(!S||!S.startsWith("data: "))continue;let j=S.slice(6);if(j!=="[DONE]")try{let I=JSON.parse(j);if(I.content){T+=I.content;if(!H._renderTimer){H._renderTimer=setTimeout(()=>{H.innerHTML=V(T);o.scrollTop=o.scrollHeight;H._renderTimer=null},80)}}}catch{}}}if(H._renderTimer){clearTimeout(H._renderTimer);H._renderTimer=null}H.innerHTML=V(T);if(W){H.querySelectorAll("[data-glance-tab]").forEach(lnk=>{lnk.addEventListener("click",ev=>{ev.preventDefault();let tn=lnk.getAttribute("data-glance-tab").toLowerCase().trim(),ti=W.config.tabs.findIndex(t=>{let g=t.name.toLowerCase().replace(/\s+/g,"-");return t.name.toLowerCase().trim()===tn||g===tn||(t.hash_trigger||"").toLowerCase()===tn});if(ti>=0)W.switchTab(ti)})})}o.scrollTop=o.scrollHeight;f.push({role:"assistant",content:T});(async function(){try{if(!_chatSessionId&&!_chatPending){_chatPending=!0;let cr=await fetch(c+'/api/widget-chats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create_session',widget_id:s,session_id:_glanceSessionId,widget_user_id:_glanceUserId,tab_name:l.name||''})});if(cr.ok){let cd=await cr.json();_chatSessionId=cd.chat_session_id}_chatPending=!1}if(_chatSessionId){fetch(c+'/api/widget-chats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'add_messages',chat_session_id:_chatSessionId,messages:[{role:'user',content:m},{role:'assistant',content:T}]})}).catch(function(){})}}catch(e){}})()}catch(C){if(y.remove(),C.name!=="AbortError"){let v=_sv(l.failure_message||"Sorry, something went wrong.");x("assistant",v),console.error("[Glance] Chat error:",C)}}finally{h=!1,g.disabled=!1,u=null,a.focus()}}return r&&(a.value=r,b()),()=>{u&&u.abort()}}function V(l){if(!l)return"";let e=O(l);return e=e.replace(/```(\w*)\n([\s\S]*?)```/g,(p,c,r)=>`<pre><code>${r.trim()}</code></pre>`),e=e.replace(/`([^`]+)`/g,"<code>$1</code>"),e=e.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),e=e.replace(/__(.+?)__/g,"<strong>$1</strong>"),e=e.replace(/\*([^*]+)\*/g,"<em>$1</em>"),e=e.replace(/(?<!\w)_([^_]+)_(?!\w)/g,"<em>$1</em>"),e=e.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(p,c,r)=>{if(r.startsWith("#")&&r.length>1){let tabName=r.slice(1);return`<a href="#" data-glance-tab="${tabName}" class="glance-tab-link">${c}</a>`}try{let u=new URL(r,window.location.origin);return u.origin===window.location.origin?`<a href="${r}" target="_top">${c}</a>`:`<a href="${r}" target="_blank" rel="noopener noreferrer">${c}</a>`}catch{return`<a href="${r}" target="_blank" rel="noopener noreferrer">${c}</a>`}}),e=e.replace(/^### (.+)$/gm,"<h3>$1</h3>"),e=e.replace(/^## (.+)$/gm,"<h2>$1</h2>"),e=e.replace(/^# (.+)$/gm,"<h1>$1</h1>"),e=e.replace(/^---$/gm,"<hr>"),e=e.replace(/\n\n+(?=\d+\. )/g,"\n"),e=e.replace(/\n\n+(?=[-*] )/g,"\n"),e=e.replace(/^(?:[-*]) (.+)$/gm,"<li>$1</li>"),e=e.replace(/((?:<li>.*<\/li>\n?)+)/g,"<ul>$1</ul>"),e=e.replace(/^\d+\. (.+)$/gm,"<li>$1</li>"),e=e.replace(/(<li>.*<\/li>\n?)+/g,p=>p.includes("<ul>")?p:`<ol>${p}</ol>`),e=e.replace(/<\/ol>((?:(?!<h[1-6])[\s\S])*?)<ol>/g,'$1'),e=e.split(/\n\n+/).map(p=>{let c=p.trim();return c?/^<(h[1-6]|ul|ol|li|pre|hr|blockquote)/.test(c)?c:`<p>${c.replace(/\n/g,"<br>")}</p>`:""}).join(""),e}function O(l){return l.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}/* ---- Embed (Tally) Tab Renderer ---- */function J(l,e,W){var url=l.embed_url;if(!url){e.innerHTML='<div class=glance-placeholder\u003eNo embed URL configured for this tab.</div>';return null}var base=W&&W.apiBase?W.apiBase:"";var proxy=base+"/tally-proxy?url="+encodeURIComponent(url);var w=document.createElement("div");w.className="widget-content embed";var f=document.createElement("iframe");f.src=proxy;f.width="100%";f.height="100%";f.setAttribute("frameborder","0");f.setAttribute("loading","lazy");f.setAttribute("title",l.name||"Tally Form");f.allow="payment; fullscreen; clipboard-write";f.style.cssText="border:0;display:block;position:absolute;inset:0;";w.appendChild(f);e.appendChild(w);return null}
function K(l,e,W){var url=l.embed_url;if(!url){e.innerHTML='<div class=glance-placeholder\u003eNo embed URL configured for this tab.</div>';return null}var base=W&&W.apiBase?W.apiBase:"";var proxy=base+"/spotify-proxy?url="+encodeURIComponent(url);var w=document.createElement("div");w.className="widget-content embed spotify";var f=document.createElement("iframe");f.src=proxy;f.width="100%";f.height="100%";f.setAttribute("frameborder","0");f.setAttribute("loading","lazy");f.setAttribute("title",l.name||"Spotify");f.allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";f.style.cssText="border:0;display:block;position:absolute;inset:0;border-radius:10px;";w.appendChild(f);e.appendChild(w);return null}
/* ---- Glance Analytics ---- */
var _glanceSessionId=(function(){var key='glance_sess';var timeout=30*60*1000;var stored=sessionStorage.getItem(key);if(stored){try{var d=JSON.parse(stored);if(Date.now()-d.ts<timeout)return d.id}catch(e){}}var id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'g-'+Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem(key,JSON.stringify({id:id,ts:Date.now()}));return id})();
var _glanceEvents=[];var _glanceWidgetId=null;var _glanceApiBase='';var _glanceUserId=null;var _glanceUser=null;
function _glanceTrack(type,data){_glanceEvents.push({event_type:type,event_data:data||{},timestamp:new Date().toISOString()});sessionStorage.setItem('glance_sess',JSON.stringify({id:_glanceSessionId,ts:Date.now()}))}
function _glanceFlush(){if(!_glanceEvents.length||!_glanceWidgetId)return;var payload=JSON.stringify({widget_id:_glanceWidgetId,session_id:_glanceSessionId,widget_user_id:_glanceUserId,page_url:window.location.href,events:_glanceEvents.splice(0)});if(navigator.sendBeacon){navigator.sendBeacon(_glanceApiBase+'/api/widget-events',new Blob([payload],{type:'application/json'}))}else{fetch(_glanceApiBase+'/api/widget-events',{method:'POST',body:payload,headers:{'Content-Type':'application/json'},keepalive:true}).catch(function(){})}}
setInterval(_glanceFlush,30000);window.addEventListener('beforeunload',_glanceFlush);
/* ---- End Glance Analytics ---- */
var L=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.config=null,this.apiBase="",this.activeTabIndex=0,this.isOpen=!1,this._tabCleanup=null}connectedCallback(){if(this.config=this.widgetConfig,this.apiBase=this.apiBase||"",!this.config||!this.config.tabs?.length)return;let e=document.createElement("style");e.textContent=B,this.shadowRoot.appendChild(e);let s=this.config.theme_color||"#7C3AED";this.shadowRoot.host.style.setProperty("--vcs-purple",s),this.render();_glanceTrack('tab_viewed',{tab_name:this.config.tabs[0]?.name||'',tab_index:0,tab_type:this.config.tabs[0]?.type||''});this._handleHash=()=>{let h=window.location.hash.replace("#","").toLowerCase().trim();if(!h)return;let n=this.config.tabs.findIndex(t=>{let g=t.name.toLowerCase().replace(/\s+/g,"-");return(t.hash_trigger||"").toLowerCase()===h||g===h});if(n>=0){this.open();if(n!==this.activeTabIndex)this.switchTab(n)}};window.addEventListener("hashchange",this._handleHash);this._handleHash()}render(){this.shadowRoot.querySelectorAll(":not(style)").forEach(s=>s.remove()),this.renderButtonRow(),this.renderPanel()}renderButtonRow(){let e=document.createElement("div");e.className="glancewrapper";let s=this.config.prompts||[];if(s.length>0){let r=document.createElement("div");r.className="glanceprompts",s.forEach((f,h)=>{if(!f.text?.trim())return;let u=document.createElement("button");u.className="glanceprompt",u.textContent=f.text;let w=1200+(s.length-1-h)*200;u.style.opacity="0",u.style.animation=`glancePromptSlideIn 0.4s ease-out ${w}ms forwards`,u.addEventListener("click",()=>{if(f.link?.startsWith("#")){let o=f.link.replace("#",""),q=o.replace(/^glance-/,""),n=this.config.tabs.findIndex(t=>{let g=t.name.toLowerCase().replace(/\s+/g,"-");return t.hash_trigger===o||t.hash_trigger===q||g===o||g===q});if(n>=0){let tt=this.config.tabs[n];if(tt&&tt.type==="AI Chat")this._pendingPrompt=f.text;this.open();if(n===this.activeTabIndex){this.renderActiveTab()}else{this.switchTab(n)}}else{this._pendingPrompt=f.text;this.open();this.renderActiveTab()}}else{this._pendingPrompt=f.text;this.open();this.renderActiveTab()}}),r.appendChild(u)}),e.appendChild(r),this._promptsContainer=r}let p=document.createElement("div");if(p.className="glancebutton-row",this.config.callout_text){let r=document.createElement("button");r.className="glancebutton wide",r.textContent=this.config.callout_text,r.style.opacity="0",r.style.animation="glanceSlideUp 0.4s ease-out 800ms forwards",r.addEventListener("click",()=>{if(this.config.callout_url?.startsWith("#")){let f=this.config.callout_url.replace("#",""),fq=f.replace(/^glance-/,""),h=this.config.tabs.findIndex(u=>{let g=u.name.toLowerCase().replace(/\s+/g,"-");return u.hash_trigger===f||u.hash_trigger===fq||g===f||g===fq});if(h>=0){let tt=this.config.tabs[h];if(tt&&tt.type==="AI Chat")this._pendingPrompt=this.config.callout_text;this.open();if(h===this.activeTabIndex){this.renderActiveTab()}else{this.switchTab(h)}}else{this.open()}}else{this.open()}}),p.appendChild(r)}let c=document.createElement("button");if(c.className="glancebutton",c.style.padding="0",c.style.opacity="0",c.style.animation="glanceFadeIn 0.4s ease-out 400ms forwards",this.config.logo_url){let r=document.createElement("img");r.src=this.config.logo_url,r.alt=this.config.name||"Glance",r.className="glancebutton-logo",c.appendChild(r)}else c.textContent="G";c.addEventListener("click",()=>this.toggle()),p.appendChild(c),e.appendChild(p),this.shadowRoot.appendChild(e)}renderPanel(){let e=document.createElement("div");e.className="glance-panel",e.setAttribute("aria-hidden","true");let s=document.createElement("div");s.className="glancewidget";let p=document.createElement("div");p.className="glancewidget-tabs";let c=document.createElement("div");if(c.className="glance-content-area",c.style.cssText="position:relative;flex:1;min-height:0;display:flex;",p.appendChild(c),s.appendChild(p),this.config.tabs.length>1){let r=document.createElement("div");r.className="glancewidget-tab-nav",this.config.tabs.forEach((f,h)=>{let u=document.createElement("button"),w="glancewidget-tablink";if(h===0&&(w+=" first"),h===this.config.tabs.length-1&&(w+=" last"),h===this.activeTabIndex&&(w+=" active"),u.className=w,f.icon){let n=document.createElement("img");n.src=f.icon.startsWith("http")?f.icon:this.apiBase+f.icon,n.alt="",n.className="tldrwidget-icon sm",n.loading="lazy",u.appendChild(n)}let o=document.createElement("div");o.className="tldr-nav-label",o.textContent=f.name,u.appendChild(o),u.addEventListener("click",()=>this.switchTab(h)),r.appendChild(u)}),s.appendChild(r)}e.appendChild(s),this.shadowRoot.appendChild(e),this._panel=e,this._content=c,this._tabsWrapper=p,e.addEventListener("click",(r)=>{let f=r.target.closest("[data-glance-tab]");if(f){r.preventDefault();let h=f.getAttribute("data-glance-tab").toLowerCase().trim(),n=this.config.tabs.findIndex(t=>{let g=t.name.toLowerCase().replace(/\s+/g,"-");return t.name.toLowerCase().trim()===h||g===h||(t.hash_trigger||"").toLowerCase()===h});if(n>=0)this.switchTab(n)}}),this.renderActiveTab()}renderActiveTab(){let e=this._content;if(!e)return;if(!this._tabCache)this._tabCache={};let idx=this.activeTabIndex;/* Detach current tab's nodes into cache */if(this._prevTabIdx!==undefined&&this._prevTabIdx!==idx&&!this._tabCache[this._prevTabIdx]?.detached){let prev=this._tabCache[this._prevTabIdx];if(prev){prev.nodes=Array.from(e.childNodes);prev.detached=!0}}/* Clear content area */while(e.firstChild)e.removeChild(e.firstChild);/* If tab already cached, reattach its nodes */if(this._tabCache[idx]&&this._tabCache[idx].nodes){let cached=this._tabCache[idx];cached.nodes.forEach(n=>e.appendChild(n));cached.detached=!1;this._prevTabIdx=idx;if(this._pendingPrompt&&this.config.tabs[idx]?.type==="AI Chat"){let pp=this._pendingPrompt;this._pendingPrompt=null;let ta=e.querySelector(".glancechat-input");if(ta){ta.value=pp;ta.dispatchEvent(new Event("input"));let sb=e.querySelector(".tldrchat-send-button");if(sb)sb.click()}}return}/* Create new tab — render directly into _content like before */let s=this.config.tabs[idx];if(!s){e.innerHTML='<div class="glance-placeholder">Tab not found.</div>';this._tabCache[idx]={nodes:null,cleanup:null,detached:!1};this._prevTabIdx=idx;return}let p=this.config.id,c=this.apiBase,cleanup=null;/* Premium content gate check */if(s.is_premium){let wsId=this.config.workspace_id||p;let token=localStorage.getItem("glance_session_"+wsId);if(!token){cleanup=G(s,e,p,wsId,c,this);this._tabCache[idx]={nodes:null,cleanup:cleanup,detached:!1};this._prevTabIdx=idx;return}}switch(s.type){case"Form":cleanup=R(s,e,p,c,this);break;case"TLDR":case"Content":case"Static Content":cleanup=F(s,e,this);break;case"AI Chat":{let r=this._pendingPrompt||null;this._pendingPrompt=null;cleanup=P(s,e,p,idx,c,r,this);break}case"Tally":cleanup=J(s,e,this);break;case"Spotify":cleanup=K(s,e,this);break;default:e.innerHTML='<div class="glance-placeholder">This tab type is not yet supported.</div>'}this._tabCache[idx]={nodes:null,cleanup:cleanup,detached:!1};this._prevTabIdx=idx}disconnectedCallback(){this._handleHash&&window.removeEventListener("hashchange",this._handleHash);if(this._tabCache){for(let k in this._tabCache){if(this._tabCache[k]?.cleanup)this._tabCache[k].cleanup()}}}switchTab(e){if(e===this.activeTabIndex)return;this.activeTabIndex=e,this.shadowRoot.querySelectorAll(".glancewidget-tablink").forEach((p,c)=>p.classList.toggle("active",c===e));var _tn=this.config.tabs[e];_glanceTrack('tab_viewed',{tab_name:_tn?.name||'',tab_index:e,tab_type:_tn?.type||''});this.renderActiveTab()}open(){this.isOpen||(this.isOpen=!0,this._panel?.classList.add("open"),this._panel?.setAttribute("aria-hidden","false"),this._promptsContainer&&(this._promptsContainer.style.display="none"),_glanceTrack('widget_opened'))}close(){this.isOpen&&(this.isOpen=!1,this._panel?.classList.remove("open"),this._panel?.setAttribute("aria-hidden","true"),this._promptsContainer&&(this._promptsContainer.style.display=""))}toggle(){this.isOpen?this.close():this.open()}};customElements.get("glance-widget")||customElements.define("glance-widget",L);(async function(){let e=document.currentScript||document.querySelector("script[data-widget-id]");if(!e)return;let s=e.getAttribute("data-widget-id");if(!s){console.warn("[Glance] Missing data-widget-id on script tag");return}let p="",c=e.getAttribute("src");if(c)try{p=new URL(c,window.location.href).origin}catch{}try{let r=await fetch(`${p}/api/widget/${s}/config`);if(!r.ok){console.warn("[Glance] Failed to load widget config:",r.status);return}let f=await r.json(),h=document.createElement("glance-widget");h.setAttribute("data-widget-id",s),h.widgetConfig=f,h.apiBase=p,_glanceWidgetId=s,_glanceApiBase=p,document.body.appendChild(h);var _wsId=f.workspace_id||s;var _tk=localStorage.getItem("glance_session_"+_wsId);if(_tk){fetch(p+"/api/widget-auth/verify-session?widget_id="+s,{headers:{Authorization:"Bearer "+_tk}}).then(function(r){return r.json()}).then(function(r){if(r.valid&&r.user&&r.user.id){_glanceUserId=r.user.id;_glanceUser=r.user}}).catch(function(){})}}catch(r){console.warn("[Glance] Error initializing widget:",r)}})();})();
