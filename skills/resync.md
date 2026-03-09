# pb-resync — Re-install p&b from Latest Main

## Execute: @resync

RESYNC WORKFLOW:
  1. Inform the user: "Running @resync — re-installing p&b from latest main. Your notes, linked repos, and MCP server will be updated."
  2. Set RESYNC = TRUE internally.
  3. Read and execute: `~/.ptba/@brain/SETUP.md`
     (This runs in UPDATE mode, preserving all user content and overwriting infrastructure — including rebuilding the MCP server and re-registering it for the current IDE environment.)
