# Agent guide

The canonical instructions for generating mockups are in [the nofi skill](../skills/nofi/SKILL.md). One skill covers creating Pug layouts, rendering comparison boards, and using the selected layout for implementation. It includes a temporary-directory workflow with multiple heredocs in one shell invocation.

Invoke the installed `nofi` skill using your agent’s skill picker or mention syntax; the exact prefix depends on the host. There are no separate creation and rendering skills.

## Install the skill

Install into your target project:

```sh
npx skills add lukeda/nofi --skill nofi
```

Add `-g` for installation across projects. For skill development, replace `lukeda/nofi` with the path to your local checkout.

The installer is `skills` (plural). It installs instructions; the agent runs the renderer separately through `npx --yes @lukeda/nofi`. PNG export requires `npx --yes @lukeda/nofi setup` to install Chromium. See the [development guide](development.md) for working from a checkout.

The skill is self-contained so installation does not depend on files outside its folder. See the [upstream skill format](https://github.com/vercel-labs/skills/blob/main/docs/creating-skills.md).

## Codex permissions for PNG rendering

HTML generation needs no browser. PNG export launches Chromium, which some agent sandboxes block even when the browser is already installed. Installing the skill or using `npx` does not change those permissions.

For the standalone Codex CLI, start a session that allows command-specific approval requests:

```sh
codex --sandbox workspace-write --ask-for-approval on-request
```

Ask Codex to render the board and request approval for the exact render command outside the sandbox if Chromium is blocked. Approve that command when prompted. This preserves the workspace sandbox for ordinary work; broad full access is not required just to authorize a render. In supported CLI sessions, `/permissions` opens the permission selector.

A host application or managed policy can disable sandbox approval requests. In that case, change the host's permission settings or start a new session with approvals enabled. Instructions in a skill, `AGENTS.md`, or a chat message cannot override that policy. An outer container may still prevent browser execution even after Codex approval; run the prepared render command locally if necessary.

Treat browser installation (`nofi setup`) separately from permission to launch it. Before a large PNG batch, render one small mockup to check that both work. If blocked, report the exact error and preserve the HTML/source instead of claiming that images were generated.

See [OpenAI's sandbox and approval documentation](https://learn.chatgpt.com/docs/sandboxing).
