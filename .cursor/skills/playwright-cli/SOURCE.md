# Source and installation

Official Microsoft Playwright CLI Agent Skill copied unmodified from https://github.com/microsoft/playwright-cli/tree/main/skills/playwright-cli on 2026-11-18. The upstream repository's license is Apache-2.0 (included here).

The SKILL.md and its references are guidance for a real CLI. To enable browser actions locally, install the actual tool on the development machine:

```bash
npm install -g @playwright/cli@latest
playwright-cli --help
```

The EmpressVR repository doesn't include a browser executable or a configured e2e test suite yet. Browser automation requires the CLI and browser runtime to be available.
