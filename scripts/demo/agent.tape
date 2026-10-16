# Records the real Claude Code session behind assets/demo.gif (https://github.com/charmbracelet/vhs).
# Run through record-take.sh (it records the simulator at the same time). Needs the setup from setup.sh.
# The session is real and not deterministic: re-record until the agent snapshots, taps Appearance, taps Dark
# and reports success.

Output "session.mp4"
Set Shell "bash"
Set FontSize 18
Set Width 940
Set Height 720
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 38ms

Hide
Type "cd /private/tmp/demo-agent-mobile-proj && export CLAUDE_CONFIG_DIR=/private/tmp/demo-agent-mobile-cc PATH=/private/tmp/demo-agent-mobile-cli/node_modules/.bin:$HOME/.maestro/bin:$PATH && PS1='$ ' && clear && date +%s.%N > /private/tmp/demo-agent-mobile-vhs-start" Enter
Sleep 800ms
Show
Type "claude" Enter
Wait+Screen@60s /Try|\? for shortcuts|esc to interrupt|❯/
Sleep 4s
Type "On the booted iOS simulator, open Settings, go to Appearance and switch to Dark, then tell me what you did in two lines. End your reply with the word DEMO_DONE."
Sleep 1500ms
Enter
Wait+Screen@420s /[⏺●][^❯]*DEMO_DONE/
Sleep 4s
