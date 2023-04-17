# EVE UI Sync

Copy your EVE Online window arrangement between multiple characters.

## Installation

Download the latest installer release from the [releases page](https://github.com/dunkyl/eve-ui-sync/releases).

## What does it do

This just blindly copies the char_data files from the TQ cache folder. Window arrangements are stored in these files, so copying them will copy the window arrangement, but it will also copy other things, like the market quickbar and drone groups.

## Usage

When you first run the application, or after you log into new accounts or characters, data will be fetched from the ESI. This may take a few seconds.

Select the character you want to copy the window arrangement from as 'Source', and the character you want to receive the window arrangement as a 'Target'. Then click 'Sync'.
You can select multiple characters as targets.

The 'Export...' button will export the chardata of the source character to a file. This file can be imported into the application on another computer.

The 'Backup' button will immediately create a backup of the current state of all the characters listed. Clicking 'Restore Backups' will immediately load the backups for all the characters listed.

## Screenshot

![Screenshot](https://raw.githubusercontent.com/dunkyl/eve-ui-sync/master/screenshot.png)