# Tag Toggler for Obsidian

**Tag Toggler** allows you to dynamically control the tag nodes in Obsidian Graph View. Unlike search filters, this plugin enables you to toggle tag nodes while keeping the tagged files on the graph.

## ✨ Key Features

* **Toggle Specific Tags**: Target and toggle visibility for individual tags.
* **Global Controls**: 'Hide All' or 'Unhide All' tag nodes across your entire vault.
* **Data Visualization**: Toggle tag nodes in tag-heavy vaults to customize your graph view exactly the way you want.



https://github.com/user-attachments/assets/4920d63c-e0fa-46e8-830a-7fa90bc96cdf



## Update (v 1.0 -> v 1.1)
The backend logic has been optimized for better performance. In testing, performance is now 3x faster for vaults with 1,000+ files.

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
