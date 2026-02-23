# mobile-agent CLI Refactor Design

**Goal:** Transformar o mobile-agent de scripts avulsos (`npx tsx scripts/...`) em um CLI publicável no npm (`mobile-agent <command>`).

**Arquitetura:** Entry point único em `src/cli.ts` com switch de subcomandos. tsup faz bundle para `dist/cli.js`. Publicado no npm com `"bin": { "mobile-agent": "./dist/cli.js" }`.

**Tech Stack:** TypeScript, tsup (bundler), zero dependências de runtime.

---

## Estrutura

```
mobile-agent/
├── src/
│   ├── cli.ts              # Entry point — parse subcomando e delega
│   ├── commands/
│   │   ├── setup.ts
│   │   ├── snapshot.ts
│   │   ├── tap.ts
│   │   ├── type.ts
│   │   ├── scroll.ts
│   │   ├── screenshot.ts
│   │   └── assert.ts
│   └── utils.ts            # Shared utilities (fail, runFlow, parseHierarchy, etc.)
├── dist/
│   └── cli.js              # Bundle gerado pelo tsup (single file com shebang)
├── package.json            # bin, files, scripts
├── tsup.config.ts          # Bundle config
├── SKILL.md                # Atualizado para usar "mobile-agent <cmd>"
├── references/REFERENCE.md
└── README.md
```

## CLI Entry Point

`src/cli.ts` — switch simples no `process.argv[2]`, sem framework de CLI:

```ts
const command = process.argv[2]
switch (command) {
  case "setup": ...
  case "snapshot": ...
  case "tap": ...
  case "type": ...
  case "scroll": ...
  case "screenshot": ...
  case "assert": ...
  default: // help
}
```

## Cada comando

Cada arquivo em `src/commands/` exporta `run(args: string[])`. O cli.ts chama com `process.argv.slice(3)`.

## Build e Publicação

- tsup gera `dist/cli.js` com `#!/usr/bin/env node`
- Zero dependências de runtime (só Node.js built-ins)
- `npm install -g mobile-agent`
- `"files": ["dist", "SKILL.md", "references"]`

## Uso final

```bash
mobile-agent setup
mobile-agent snapshot
mobile-agent tap m3
mobile-agent type m10 "1234"
mobile-agent scroll down
mobile-agent screenshot --output tela.png
mobile-agent assert "Bem-vindo"
```

## Atualizações no SKILL.md

Todos os exemplos mudam de `npx tsx scripts/X.ts` para `mobile-agent X`.
