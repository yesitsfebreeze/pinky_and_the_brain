# pb-resync — Re-install p&b from Latest Main

## Execute: @resync

RESYNC WORKFLOW:
  1. Inform the user: "Running @resync — re-installing p&b from latest main. Your notes and linked repos will be preserved."
  2. Set RESYNC = TRUE internally.
  3. Fetch and execute: https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/SETUP.md
     (This runs in UPDATE mode, preserving all user content and overwriting infrastructure,
      including re-fetching the MCP source and rebuilding `mcp/dist/` if node/npm are available.)
