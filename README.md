## PromptStruct — Structured Prompt Authoring Studio

Design, organize, and iterate on complex AI prompts with confidence. PromptStruct is a modern, offline-first prompt authoring studio that helps you build reusable prompt structures, preview outputs, manage projects, and share configurations — all with a delightful UX.

[Live site: https://zunaidFarouque.github.io/PromptStruct/](https://zunaidFarouque.github.io/PromptStruct/)

### Why PromptStruct?
- **Structure-first**: Model complex prompts into elements, variants, and templates.
- **Authoring UX**: Powerful editor with panels, inline tips, keyboard shortcuts, and quick search.
- **Project-centric**: Keep prompts, templates, and settings grouped by project.
- **Portable**: Import/export projects for easy collaboration and versioning.
- **Offline-first PWA**: Works without network; install as an app.

### Key Features
- **Visual prompt structuring** with draggable elements and sections
- **Powerful search** (enhanced search bar and advanced filters)
- **Mini structure editor** and **preview panel** for rapid iteration
- **Project templates** and **global settings** for consistency
- **Theming & dark mode** with a11y-conscious UI
- **Keyboard shortcuts** for speed (common actions and navigation)
- **Export options** to share, back up, or integrate elsewhere
- **Optional Google Drive sync** for cloud backup

### Tech Stack
- **Frontend**: React, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui (Radix primitives), Lucide icons
- **State**: Zustand
- **Tooling**: Vitest + Testing Library, ESLint, PostCSS
- **PWA**: `vite-plugin-pwa`

---

## Quick Start

Prerequisites:
- Node (latest LTS or current; use `nvm` to manage)
- Bun runtime & package manager (`bun`)

Clone and run the app locally:

```bash
git clone <this-repo-url>
cd Prompter Project/Project-prompter
bun install
bun run dev
```

Then open the Vite dev server URL shown in your terminal (usually `http://localhost:5173`).

### Build
```bash
bun run build
```

### Preview Production Build
```bash
bun run preview
```

### Test
```bash
bun run test
```

### Lint
```bash
bun run lint
```

---

## Project Structure

The main application lives in `Project-prompter/`.

```text
Project-prompter/
  src/
    components/           # UI components and feature modules
    services/             # Google auth, sync, notifications, shortcuts
    stores/               # Zustand store(s)
    utils/                # parsing, import analysis, preview mapping
    test/                 # Vitest tests and setup
    App.tsx               # App shell and routing
    main.tsx              # Vite entry
  public/                 # PWA assets, manifest, icons
  tailwind.config.js
  vite.config.ts
  vitest.config.ts
  package.json
  bun.lock
```

Notable components to explore:
- `components/PromptEditor.tsx` — core authoring surface
- `components/ProjectBrowser.tsx` — project-level organization
- `components/MiniStructureEditor.tsx` — compact structure manipulation
- `components/ExportOptionsModal.tsx` — export/share workflows
- `components/EnhancedSearchBar.tsx` and `components/AdvancedSearch.tsx` — discovery and navigation

---

## PWA & Offline
- Fully installable PWA via `vite-plugin-pwa`
- Offline support for core flows
- Update flow handled via a lightweight in-app prompt

---

## Deployment

This project is configured to deploy static builds (e.g., GitHub Pages):

```bash
# from Project-prompter/
bun run build
bun run deploy
```

The public build is available here: `https://vfxturjo.github.io/PromptStruct/`.

---

## Contributing

Contributions are welcome! To propose an improvement:
- Open an issue describing the change, or
- Submit a PR with a clear description and screenshots if UI-related.

Please run `bun run lint` and `bun run test` before opening a PR.

---

## License

Unless otherwise stated in the repository, this project is released under the MIT License. See `LICENSE` if present.


