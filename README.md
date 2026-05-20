# Tag Toggler for Obsidian

**Tag Toggler** allows you to dynamically control the tag nodes in your Obsidian Graph View. Unlike search filters, this plugin enables you to hide or unhide tag nodes while keeping the tagged files visible on the graph.

## ✨ Key Features

* **Toggle Specific Tags**: Target and toggle visibility for individual tags.
* **Global Controls**: Quickly 'Hide All' or 'Unhide All' tag nodes across your entire vault.
* **Graph View Optimization**: Clean up your graph by removing distracting tag nodes while keeping the underlying file structure intact.

https://github.com/user-attachments/assets/b62eca70-257d-4197-b38a-1664b9a5c3b3

https://github.com/user-attachments/assets/87d1d6da-a2b4-40a6-b0a1-12ea459d10f9

## Update (v 1.0 -> v 1.1)
The backend logic has been optimized to handle large-scale vaults. The performance increased 3x faster (for vault with 1000 files).

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
