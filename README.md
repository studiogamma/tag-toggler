# Tag Toggler for Obsidian

**Tag Toggler** allows you to dynamically control the tag nodes in your Obsidian Graph View. Unlike search filters, this plugin enables you to hide or unhide tag nodes while keeping the tagged files visible on the graph.

## ✨ Key Features

* **Toggle Specific Tags**: Target and toggle visibility for individual tags.
* **Global Controls**: Quickly 'Hide All' or 'Unhide All' tag nodes across your entire vault.
* **Graph View Optimization**: Clean up your graph by removing distracting tag nodes while keeping the underlying file structure intact.

## ⚙️ How It Works

This plugin modifies the tag syntax within your files (e.g., changing `#tag` to a prefixed version like `—#tag`) so that Obsidian's graph engine no longer recognizes them as active tags. 

* **Customizable Prefix**: You can define the prefix used to "hide" tags in the plugin settings.
* **File Integrity**: Only the tags are altered; your content and file links remain untouched.

## ⚠️ Warning

> **Important:** This plugin performs bulk edits on your markdown files. * **Prefix Collisions**: Ensure your chosen prefix does not conflict with existing content in your notes. 
* **Backup Your Vault**: It is recommended to back up your vault before running bulk toggle commands.
* **Performance**: Processing may be slow for exceptionally large vaults.

## ☕ Support

If you find this plugin helpful, consider [supporting the developer](https://ko-fi.com/studiogamma).