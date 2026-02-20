/*
 * Tag Toggler – Obsidian Plugin
 * Hides/unhides tag nodes from Graph View by:
 *   1. Body text: prepending a configurable prefix (default: —) to #tags.
 *   2. Frontmatter: moving tags between `tags` and `hidden-tags` properties.
 */

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
    for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
            if (!__hasOwnProp.call(to, key) && key !== except)
                __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
    default: () => TagTogglerPlugin
});
module.exports = __toCommonJS(main_exports);

var obsidian = require("obsidian");

// ─── Default Settings ────────────────────────────────────────────────
var DEFAULT_SETTINGS = {
    prefixSymbol: "\u2014" // em dash —
};

// ─── Utility: Escape a string for use inside a RegExp ────────────────
function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Utility: Split content into frontmatter + body ──────────────────
function splitFrontmatter(content) {
    // Match YAML frontmatter delimited by --- at the very start of the file
    var match = content.match(/^---\r?\n([\s\S]*?\r?\n)---\r?\n?/);
    if (match) {
        return {
            frontmatter: match[0],
            body: content.slice(match[0].length)
        };
    }
    return { frontmatter: "", body: content };
}

// ─── Utility: Normalise frontmatter tags to an array ─────────────────
function normaliseTags(value) {
    if (Array.isArray(value)) return value.map(function (v) { return String(v); });
    if (value != null && String(value).trim()) return [String(value).trim()];
    return [];
}

// ─── Core: Toggle tags in document body ──────────────────────────────
async function toggleTagInBody(app, tag, hide, prefix) {
    var escapedTag = escapeRegExp(tag);
    var escapedPrefix = escapeRegExp(prefix);

    var regex;
    if (hide) {
        regex = new RegExp("(^|\\s)#(" + escapedTag + ")(?=\\s|$|[^a-zA-Z0-9_/])", "gm");
    } else {
        regex = new RegExp("(^|\\s)" + escapedPrefix + "#(" + escapedTag + ")(?=\\s|$|[^a-zA-Z0-9_/])", "gm");
    }

    var filesModified = 0;
    var tagsChanged = 0;
    var markdownFiles = app.vault.getMarkdownFiles();

    for (var file of markdownFiles) {
        try {
            await app.vault.process(file, function (content) {
                var parts = splitFrontmatter(content);
                var body = parts.body;
                var count = 0;

                var newBody;
                if (hide) {
                    newBody = body.replace(regex, function (match, preceding, tagName) {
                        count++;
                        return preceding + prefix + "#" + tagName;
                    });
                } else {
                    newBody = body.replace(regex, function (match, preceding, tagName) {
                        count++;
                        return preceding + "#" + tagName;
                    });
                }

                if (count > 0) {
                    filesModified++;
                    tagsChanged += count;
                    return parts.frontmatter + newBody;
                }
                return content; // no change
            });
        } catch (e) {
            console.error("Tag Toggler: Error processing file (body) " + file.path, e);
        }
    }

    return { filesModified: filesModified, tagsChanged: tagsChanged };
}

// ─── Core: Toggle tags in YAML frontmatter ───────────────────────────
// Hide:   move matching tag from `tags`/`tag` → `hidden-tags`
// Unhide: move matching tag from `hidden-tags` → `tags`
async function toggleTagInFrontmatter(app, tag, hide) {
    var filesModified = 0;
    var tagsChanged = 0;
    var markdownFiles = app.vault.getMarkdownFiles();

    for (var file of markdownFiles) {
        try {
            await app.fileManager.processFrontMatter(file, function (fm) {
                if (hide) {
                    // ── Hide: tags/tag → hidden-tags ──
                    var sourceKey = Array.isArray(fm.tags) || typeof fm.tags === "string" || typeof fm.tags === "number" ? "tags" : (fm.tag != null ? "tag" : null);
                    if (!sourceKey) return; // no tags property at all

                    var srcArr = normaliseTags(fm[sourceKey]);
                    var matchIndices = [];
                    for (var i = 0; i < srcArr.length; i++) {
                        // Exact match or hierarchical sub-tag match
                        var t = srcArr[i];
                        var tLower = t.toLowerCase();
                        var tagLower = tag.toLowerCase();
                        if (t === tag || tLower === tagLower || t.startsWith(tag + "/") || tLower.startsWith(tagLower + "/")) {
                            matchIndices.push(i);
                        }
                    }
                    if (matchIndices.length === 0) return; // tag not found

                    // Remove matched tags from source
                    var removed = [];
                    for (var j = matchIndices.length - 1; j >= 0; j--) {
                        removed.unshift(srcArr.splice(matchIndices[j], 1)[0]);
                    }

                    // Update source property
                    if (srcArr.length === 0) {
                        delete fm[sourceKey];
                    } else {
                        fm[sourceKey] = srcArr;
                    }

                    // Add to hidden-tags
                    var hiddenArr = normaliseTags(fm["hidden-tags"]);
                    for (var k = 0; k < removed.length; k++) {
                        if (hiddenArr.indexOf(removed[k]) === -1) {
                            hiddenArr.push(removed[k]);
                        }
                    }
                    fm["hidden-tags"] = hiddenArr;

                    filesModified++;
                    tagsChanged += removed.length;
                } else {
                    // ── Unhide: hidden-tags → tags ──
                    var hiddenArr = normaliseTags(fm["hidden-tags"]);
                    if (hiddenArr.length === 0) return;

                    var matchIndices = [];
                    for (var i = 0; i < hiddenArr.length; i++) {
                        var t = hiddenArr[i];
                        var tLower = t.toLowerCase();
                        var tagLower = tag.toLowerCase();
                        if (t === tag || tLower === tagLower || t.startsWith(tag + "/") || tLower.startsWith(tagLower + "/")) {
                            matchIndices.push(i);
                        }
                    }
                    if (matchIndices.length === 0) return;

                    // Remove matched tags from hidden-tags
                    var removed = [];
                    for (var j = matchIndices.length - 1; j >= 0; j--) {
                        removed.unshift(hiddenArr.splice(matchIndices[j], 1)[0]);
                    }

                    // Clean up hidden-tags
                    if (hiddenArr.length === 0) {
                        delete fm["hidden-tags"];
                    } else {
                        fm["hidden-tags"] = hiddenArr;
                    }

                    // Add back to tags
                    var tagsArr = normaliseTags(fm.tags);
                    for (var k = 0; k < removed.length; k++) {
                        if (tagsArr.indexOf(removed[k]) === -1) {
                            tagsArr.push(removed[k]);
                        }
                    }
                    fm.tags = tagsArr;

                    filesModified++;
                    tagsChanged += removed.length;
                }
            });
        } catch (e) {
            console.error("Tag Toggler: Error processing frontmatter " + file.path, e);
        }
    }

    return { filesModified: filesModified, tagsChanged: tagsChanged };
}

// ─── Core: Combined toggle (body + frontmatter) ─────────────────────
async function toggleTagInVault(app, tag, hide, prefix) {
    // Normalise: strip leading # if user typed it
    tag = tag.replace(/^#/, "");
    if (!tag) return { bodyFiles: 0, bodyTags: 0, fmFiles: 0, fmTags: 0 };

    var bodyResult = await toggleTagInBody(app, tag, hide, prefix);
    var fmResult = await toggleTagInFrontmatter(app, tag, hide);

    return {
        bodyFiles: bodyResult.filesModified,
        bodyTags: bodyResult.tagsChanged,
        fmFiles: fmResult.filesModified,
        fmTags: fmResult.tagsChanged
    };
}

// ─── Auto-suggest: Tag Input Suggest ──────────────────────────────────
var TagInputSuggest = class extends obsidian.AbstractInputSuggest {
    constructor(app, inputEl) {
        super(app, inputEl);
        this.inputEl = inputEl;

        // Show suggestions immediately when input is focused
        var self = this;
        inputEl.addEventListener("focus", function () {
            // Dispatch input event to trigger getSuggestions with current value
            self.inputEl.dispatchEvent(new Event("input"));
        });
    }

    getSuggestions(query) {
        query = query.replace(/^#/, "").toLowerCase();
        var tagCounts = this.app.metadataCache.getTags(); // { "#Tag": count }
        var results = [];

        // Collect active vault tags
        for (var rawTag in tagCounts) {
            var tagName = rawTag.replace(/^#/, "");
            if (!query || tagName.toLowerCase().includes(query)) {
                results.push(tagName);
            }
        }

        // Also collect hidden-tags from frontmatter so user can unhide them
        var files = this.app.vault.getMarkdownFiles();
        for (var i = 0; i < files.length; i++) {
            var cache = this.app.metadataCache.getFileCache(files[i]);
            if (cache && cache.frontmatter && cache.frontmatter["hidden-tags"]) {
                var hidden = cache.frontmatter["hidden-tags"];
                var arr = Array.isArray(hidden) ? hidden : (typeof hidden === "string" ? [hidden] : []);
                for (var j = 0; j < arr.length; j++) {
                    var ht = String(arr[j]);
                    if (results.indexOf(ht) === -1 && (!query || ht.toLowerCase().includes(query))) {
                        results.push(ht);
                    }
                }
            }
        }

        results.sort();
        return results;
    }

    renderSuggestion(tag, el) {
        el.setText("#" + tag);
    }

    selectSuggestion(tag) {
        this.inputEl.value = tag;
        this.inputEl.dispatchEvent(new Event("input"));
        this.close();
    }
};

// ─── Core: Unhide All tags in vault ─────────────────────────────────
async function unhideAllInVault(app, prefix) {
    var escapedPrefix = escapeRegExp(prefix);
    var markdownFiles = app.vault.getMarkdownFiles();
    var bodyFiles = 0;
    var bodyTags = 0;
    var fmFiles = 0;
    var fmTags = 0;

    // Body: remove ALL prefix symbols before # tags
    var bodyRegex = new RegExp("(^|\\s)" + escapedPrefix + "#([a-zA-Z0-9_/]+)", "gm");
    for (var file of markdownFiles) {
        try {
            await app.vault.process(file, function (content) {
                var parts = splitFrontmatter(content);
                var count = 0;
                var newBody = parts.body.replace(bodyRegex, function (match, preceding, tagName) {
                    count++;
                    return preceding + "#" + tagName;
                });
                if (count > 0) {
                    bodyFiles++;
                    bodyTags += count;
                    return parts.frontmatter + newBody;
                }
                return content;
            });
        } catch (e) {
            console.error("Tag Toggler: Error in unhideAll (body) " + file.path, e);
        }
    }

    // Frontmatter: move all hidden-tags back to tags
    for (var file of markdownFiles) {
        try {
            await app.fileManager.processFrontMatter(file, function (fm) {
                var hiddenArr = normaliseTags(fm["hidden-tags"]);
                if (hiddenArr.length === 0) return;

                var tagsArr = normaliseTags(fm.tags);
                for (var k = 0; k < hiddenArr.length; k++) {
                    if (tagsArr.indexOf(hiddenArr[k]) === -1) {
                        tagsArr.push(hiddenArr[k]);
                    }
                }
                fm.tags = tagsArr;
                fmTags += hiddenArr.length;
                fmFiles++;
                delete fm["hidden-tags"];
            });
        } catch (e) {
            console.error("Tag Toggler: Error in unhideAll (frontmatter) " + file.path, e);
        }
    }

    return { bodyFiles: bodyFiles, bodyTags: bodyTags, fmFiles: fmFiles, fmTags: fmTags };
}

// ─── Core: Hide All tags in vault ──────────────────────────────────
async function hideAllInVault(app, prefix) {
    var escapedPrefix = escapeRegExp(prefix);
    var markdownFiles = app.vault.getMarkdownFiles();
    var totalBodyFiles = 0;
    var totalBodyTags = 0;
    var totalFmFiles = 0;
    var totalFmTags = 0;

    // Body: single-pass regex to prefix ALL #tags at once (avoids double-prefixing)
    var bodyRegex = new RegExp("(^|\\s)#([a-zA-Z0-9_][a-zA-Z0-9_/]*)", "gm");
    for (var file of markdownFiles) {
        try {
            await app.vault.process(file, function (content) {
                var parts = splitFrontmatter(content);
                var count = 0;
                var newBody = parts.body.replace(bodyRegex, function (match, preceding, tagName) {
                    count++;
                    return preceding + prefix + "#" + tagName;
                });
                if (count > 0) {
                    totalBodyFiles++;
                    totalBodyTags += count;
                    return parts.frontmatter + newBody;
                }
                return content;
            });
        } catch (e) {
            console.error("Tag Toggler: Error in hideAll (body) " + file.path, e);
        }
    }

    // Frontmatter: move ALL tags to hidden-tags
    for (var file of markdownFiles) {
        try {
            await app.fileManager.processFrontMatter(file, function (fm) {
                var sourceKey = Array.isArray(fm.tags) || typeof fm.tags === "string" || typeof fm.tags === "number" ? "tags" : (fm.tag != null ? "tag" : null);
                if (!sourceKey) return;

                var srcArr = normaliseTags(fm[sourceKey]);
                if (srcArr.length === 0) return;

                var hiddenArr = normaliseTags(fm["hidden-tags"]);
                for (var k = 0; k < srcArr.length; k++) {
                    if (hiddenArr.indexOf(srcArr[k]) === -1) {
                        hiddenArr.push(srcArr[k]);
                    }
                }
                fm["hidden-tags"] = hiddenArr;
                totalFmTags += srcArr.length;
                totalFmFiles++;
                delete fm[sourceKey];
            });
        } catch (e) {
            console.error("Tag Toggler: Error in hideAll (frontmatter) " + file.path, e);
        }
    }

    return { bodyFiles: totalBodyFiles, bodyTags: totalBodyTags, fmFiles: totalFmFiles, fmTags: totalFmTags };
}

// ─── Modal: Tag Toggle Dialog ────────────────────────────────────────
var TagToggleModal = class extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        var self = this;
        var contentEl = this.contentEl;
        contentEl.addClass("tag-toggler-modal");

        // Title
        contentEl.createEl("h2", { text: "Tag Toggler" });

        // Input row:  # [___________]
        var inputRow = contentEl.createDiv({ cls: "tag-toggler-input-row" });
        inputRow.createSpan({ text: "#", cls: "tag-toggler-hash" });
        var tagInput = inputRow.createEl("input", {
            type: "text",
            placeholder: "Tag Name"
        });
        tagInput.id = "tag-toggler-tag-input";

        // Attach auto-suggest to the input (triggers on focus, not on open)
        new TagInputSuggest(this.app, tagInput);


        // Button row: [Hide] [Unhide] [Unhide All]
        var buttonRow = contentEl.createDiv({ cls: "tag-toggler-button-row" });

        var hideBtn = buttonRow.createEl("button", {
            text: "Hide",
            cls: "tag-toggler-hide-btn"
        });

        var unhideBtn = buttonRow.createEl("button", {
            text: "Unhide",
            cls: "tag-toggler-unhide-btn"
        });

        var unhideAllBtn = buttonRow.createEl("button", {
            text: "Unhide All",
            cls: "tag-toggler-unhide-all-btn"
        });

        // Status area
        var statusEl = contentEl.createDiv({ cls: "tag-toggler-status" });
        statusEl.setText("Plugin prefix in file may alter the content.");

        // ── Hide handler ──
        hideBtn.addEventListener("click", async function () {
            var tag = tagInput.value.trim();
            if (!tag) {
                statusEl.setText("Please enter a tag name.");
                return;
            }
            hideBtn.disabled = true;
            unhideBtn.disabled = true;
            unhideAllBtn.disabled = true;
            statusEl.setText("Hiding #" + tag + " across vault...");

            var result = await toggleTagInVault(
                self.app,
                tag,
                true,
                self.plugin.settings.prefixSymbol
            );

            var parts = [];
            if (result.bodyTags > 0) parts.push("Body: " + result.bodyTags + " tag(s) in " + result.bodyFiles + " file(s)");
            if (result.fmTags > 0) parts.push("Frontmatter: " + result.fmTags + " tag(s) moved to hidden-tags in " + result.fmFiles + " file(s)");
            if (parts.length > 0) {
                var msg = "Hidden #" + tag.replace(/^#/, "") + ". " + parts.join(". ") + ".";
                statusEl.setText(msg);
                new obsidian.Notice(msg);
            } else {
                statusEl.setText("No occurrences of #" + tag.replace(/^#/, "") + " found in the vault.");
            }
            hideBtn.disabled = false;
            unhideBtn.disabled = false;
            unhideAllBtn.disabled = false;
        });

        // ── Unhide handler ──
        unhideBtn.addEventListener("click", async function () {
            var tag = tagInput.value.trim();
            if (!tag) {
                statusEl.setText("Please enter a tag name.");
                return;
            }
            hideBtn.disabled = true;
            unhideBtn.disabled = true;
            unhideAllBtn.disabled = true;
            var prefix = self.plugin.settings.prefixSymbol;
            statusEl.setText("Unhiding " + prefix + "#" + tag + " across vault...");

            var result = await toggleTagInVault(
                self.app,
                tag,
                false,
                prefix
            );

            var parts = [];
            if (result.bodyTags > 0) parts.push("Body: " + result.bodyTags + " tag(s) in " + result.bodyFiles + " file(s)");
            if (result.fmTags > 0) parts.push("Frontmatter: " + result.fmTags + " tag(s) restored from hidden-tags in " + result.fmFiles + " file(s)");
            if (parts.length > 0) {
                var msg = "Restored #" + tag.replace(/^#/, "") + ". " + parts.join(". ") + ".";
                statusEl.setText(msg);
                new obsidian.Notice(msg);
            } else {
                statusEl.setText("No hidden occurrences of #" + tag.replace(/^#/, "") + " found in the vault.");
            }
            hideBtn.disabled = false;
            unhideBtn.disabled = false;
            unhideAllBtn.disabled = false;
        });

        // ── Unhide All handler ──
        unhideAllBtn.addEventListener("click", async function () {
            hideBtn.disabled = true;
            unhideBtn.disabled = true;
            unhideAllBtn.disabled = true;
            statusEl.setText("Restoring all hidden tags across vault...");

            var result = await unhideAllInVault(self.app, self.plugin.settings.prefixSymbol);

            var parts = [];
            if (result.bodyTags > 0) parts.push("Body: " + result.bodyTags + " tag(s) in " + result.bodyFiles + " file(s)");
            if (result.fmTags > 0) parts.push("Frontmatter: " + result.fmTags + " tag(s) restored in " + result.fmFiles + " file(s)");
            if (parts.length > 0) {
                var msg = "Unhide All complete. " + parts.join(". ") + ".";
                statusEl.setText(msg);
                new obsidian.Notice(msg);
            } else {
                statusEl.setText("No hidden tags found in the vault.");
            }
            hideBtn.disabled = false;
            unhideBtn.disabled = false;
            unhideAllBtn.disabled = false;
        });
    }

    onClose() {
        this.contentEl.empty();
    }
};

// ─── Settings Tab ────────────────────────────────────────────────────
var TagTogglerSettingTab = class extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        var containerEl = this.containerEl;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Tag Toggler Settings" });

        new obsidian.Setting(containerEl)
            .setName("Prefix symbol")
            .setDesc("Symbol prepended to tags when hiding them (e.g. \u2014 turns #Year into \u2014#Year).")
            .addText(function (text) {
                text
                    .setPlaceholder("\u2014")
                    .setValue(this.plugin.settings.prefixSymbol)
                    .onChange(async function (value) {
                        if (value.trim()) {
                            this.plugin.settings.prefixSymbol = value.trim();
                            await this.plugin.saveSettings();
                        }
                    }.bind(this));
            }.bind(this));

        // Warning notice
        var warningEl = containerEl.createDiv({ cls: "tag-toggler-warning" });
        warningEl.createEl("strong", { text: "\u26A0\uFE0F Warning: " });
        warningEl.createSpan({
            text: "Please ensure the chosen prefix symbol is not already being used for other purposes in your notes to avoid unintended text manipulation. "
                + "If you change the prefix after hiding tags, you will need to unhide them using the old prefix first (or manually find-and-replace)."
        });
    }
};

// ─── Modal: Warning Confirmation ──────────────────────────────────
var WarningModal = class extends obsidian.Modal {
    constructor(app, onConfirm) {
        super(app);
        this.onConfirm = onConfirm;
    }

    onOpen() {
        var self = this;
        var contentEl = this.contentEl;
        contentEl.addClass("tag-toggler-modal");

        contentEl.createEl("h2", { text: "Warning" });

        var msgEl = contentEl.createDiv({ cls: "tag-toggler-warning-message" });
        msgEl.setText("Files with plugin prefixes might be altered. May be slow for large vaults.");

        var buttonRow = contentEl.createDiv({ cls: "tag-toggler-button-row" });

        var confirmBtn = buttonRow.createEl("button", {
            text: "Confirm",
            cls: "tag-toggler-hide-btn"
        });

        var cancelBtn = buttonRow.createEl("button", {
            text: "Cancel",
            cls: "tag-toggler-unhide-btn"
        });

        confirmBtn.addEventListener("click", function () {
            self.close();
            self.onConfirm();
        });

        cancelBtn.addEventListener("click", function () {
            self.close();
        });
    }

    onClose() {
        this.contentEl.empty();
    }
};

// ─── Main Plugin Class ────────────────────────────────────────
var TagTogglerPlugin = class extends obsidian.Plugin {
    async onload() {
        await this.loadSettings();
        var self = this;

        // Command: Toggle Specified Tags (opens modal)
        this.addCommand({
            id: "toggle-specified-tags",
            name: "Toggle Specified Tags",
            callback: function () {
                new TagToggleModal(self.app, self).open();
            }
        });

        // Command: Hide All Tags (Vault-wide)
        this.addCommand({
            id: "hide-all-tags",
            name: "Hide All Tags (Vault-wide)",
            callback: function () {
                new WarningModal(self.app, async function () {
                    var result = await hideAllInVault(self.app, self.settings.prefixSymbol);
                    var parts = [];
                    if (result.bodyTags > 0) parts.push("Body: " + result.bodyTags + " tag(s) in " + result.bodyFiles + " file(s)");
                    if (result.fmTags > 0) parts.push("Frontmatter: " + result.fmTags + " tag(s) moved to hidden-tags in " + result.fmFiles + " file(s)");
                    if (parts.length > 0) {
                        new obsidian.Notice("Hide All complete. " + parts.join(". ") + ".");
                    } else {
                        new obsidian.Notice("No active tags found in the vault.");
                    }
                }).open();
            }
        });

        // Command: Unhide All Tags (Vault-wide)
        this.addCommand({
            id: "unhide-all-tags",
            name: "Unhide All Tags (Vault-wide)",
            callback: function () {
                new WarningModal(self.app, async function () {
                    var result = await unhideAllInVault(self.app, self.settings.prefixSymbol);
                    var parts = [];
                    if (result.bodyTags > 0) parts.push("Body: " + result.bodyTags + " tag(s) in " + result.bodyFiles + " file(s)");
                    if (result.fmTags > 0) parts.push("Frontmatter: " + result.fmTags + " tag(s) restored in " + result.fmFiles + " file(s)");
                    if (parts.length > 0) {
                        new obsidian.Notice("Unhide All complete. " + parts.join(". ") + ".");
                    } else {
                        new obsidian.Notice("No hidden tags found in the vault.");
                    }
                }).open();
            }
        });

        // Register settings tab
        this.addSettingTab(new TagTogglerSettingTab(this.app, this));

        console.log("Tag Toggler plugin loaded.");
    }

    onunload() {
        console.log("Tag Toggler plugin unloaded.");
    }

    async loadSettings() {
        var data = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data || {});
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
};

/* nosourcemap */
