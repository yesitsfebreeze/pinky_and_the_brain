# pb-resync — Re-install p&b from Latest Main

## Main Repo Sync

Before executing this command, ensure main p&b repo is current:
`git -C ~/.patb/@brain pull --rebase`
If `~/.patb/@brain/.git` is missing, clone first:
`git clone https://github.com/yesitsfebreeze/pinky-and-the-brain ~/.patb/@brain`
If sync fails, stop and report the error.

## Execute: @resync

RESYNC WORKFLOW:
  1. Inform the user: "Running @resync — re-installing p&b from latest main. Your notes, linked repos, and MCP server will be updated."
  2. Set RESYNC = TRUE internally.
  3. Read and execute: `~/.patb/@brain/SETUP.md`
     (This runs in UPDATE mode, preserving all user content and overwriting infrastructure — including rebuilding the MCP server and re-registering it for the current IDE environment.)
