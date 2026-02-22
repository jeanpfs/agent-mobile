
# 📘 PRD — Mobile Agent (LLM‑Guided Automation para React Native)

## 1. Visão Geral

### Nome provisório
**mobile-agent**

### Descrição
`mobile-agent` é uma ferramenta **open source** que permite automação de apps **React Native** em **iOS e Android**, guiada por **LLMs**, utilizando **emuladores/simuladores**, **árvore de acessibilidade** e um **CLI próprio**, seguindo o mesmo padrão arquitetural do *agent-browser*.

O LLM **não controla diretamente o emulador**.  
Ele interage exclusivamente via **skills determinísticas**, que chamam um **CLI stateful**.

---

## 2. Objetivos

### Objetivo principal
Permitir que um LLM:
- entenda o estado real da UI de um app React Native
- interaja com ele de forma segura e determinística
- valide comportamentos
- gere feedback para correção de código

### Objetivos secundários
- engine-agnostic (Maestro / Detox / Appium)
- LLM-agnostic (OpenAI, Anthropic, local)
- execução local (sem cloud obrigatório)
- fácil integração com MCP / LangGraph

---

## 3. Não‑Objetivos

- ❌ Test runner tradicional (Jest, etc.)
- ❌ Record & replay visual
- ❌ OCR / visão computacional
- ❌ Automação por coordenadas
- ❌ Apps sem acessibilidade

---

## 4. Público‑Alvo

### Usuários
- Times de engenharia React Native
- Pesquisadores de LLM Agents
- Builders de ferramentas de QA / CI
- Comunidade open source

### Casos de uso
- Automação guiada por LLM
- Validação automática de features
- Smoke tests inteligentes
- Agentes que implementam e testam código RN

---

## 5. Arquitetura Geral

```
LLM
 ↓ (tool call)
Mobile Agent Skill
 ↓
mobile-agent CLI (stateful)
 ↓
Automation Engine (Maestro / Detox)
 ↓
iOS Simulator / Android Emulator
```

---

## 6. Componentes do Sistema

### 6.1 CLI (`mobile-agent`)

#### Responsabilidades
- Gerenciar sessão de automação
- Manter estado do app
- Expor comandos simples
- Normalizar output textual

#### Comandos obrigatórios (MVP)

```bash
mobile-agent run ios|android
mobile-agent snapshot
mobile-agent tap <ref>
mobile-agent type <ref> "<text>"
mobile-agent screenshot
mobile-agent stop
```

#### Comandos opcionais
```bash
mobile-agent scroll up|down
mobile-agent assert text "<value>"
mobile-agent reset
```

---

### 6.2 Skill / Tool Interface (LLM)

#### Interface mínima

```ts
mobile_snapshot(): string
mobile_tap(ref: string): void
mobile_type(ref: string, text: string): void
mobile_screenshot(): Image | string
```

#### Requisitos
- Determinismo
- Erros legíveis (`INVALID_REF`, `TIMEOUT`)
- Timeout explícito

---

### 6.3 Automation Engine (Pluggable)

#### Engines suportadas

| Engine  | Status |
|-------|--------|
| Maestro | Obrigatório (v1) |
| Detox   | Opcional |
| Appium  | Opcional |

#### Interface comum

```ts
interface EngineAdapter {
  launch(): Promise<void>
  snapshot(): Promise<RawUIHierarchy>
  tap(selector): Promise<void>
  type(selector, text: string): Promise<void>
  screenshot(): Promise<Image>
}
```

---

## 7. UI Snapshot (Core Feature)

### Formato do Snapshot

```
Screen: Login

- textbox "E-mail" [ref=m1]
- textbox "Senha" [ref=m2]
- button "Entrar" [ref=m3]
- link "Esqueceu sua senha?" [ref=m4]
```

### Regras
- Baseado em acessibilidade
- Ignorar elementos invisíveis
- Roles normalizados
- Refs únicas por snapshot

### Fontes
- Android: `uiautomator dump`
- iOS: `simctl accessibility dump`
- Maestro: hierarchy interno

---

## 8. Modelo de Ações

```ts
type Action =
  | { type: 'tap'; ref: string }
  | { type: 'type'; ref: string; text: string }
  | { type: 'scroll'; direction: 'up' | 'down' }
```

---

## 9. Loop de Automação Guiada por LLM

```
1. snapshot
2. LLM decide ações
3. CLI executa ações
4. novo snapshot
5. validação
6. feedback
```

---

## 10. Integração com Implementação de Código

### Fluxo
1. LLM implementa feature RN
2. Build + run
3. mobile-agent run
4. Automação valida
5. Feedback retorna ao LLM

Exemplo:

```
FAIL:
Expected text "Bem-vindo"
Found "Senha inválida"
```

---

## 11. Configuração

### `mobile-agent.config.json`

```json
{
  "engine": "maestro",
  "platform": "ios",
  "appId": "com.myapp",
  "simulator": "iPhone 15",
  "snapshot": {
    "maxElements": 30
  }
}
```

---

## 12. Segurança & Determinismo

- Nenhuma execução arbitrária
- Ações whitelistadas
- Validação de refs
- Acesso restrito ao filesystem

---

## 13. Estratégia Open Source

### Licença
- MIT ou Apache 2.0

### Estrutura do repositório

```
packages/
  cli/
  engine-maestro/
  engine-detox/
  snapshot/
  skill/
docs/
examples/
```

---

## 14. Roadmap

### v1.0
- CLI funcional
- Maestro engine
- Snapshot textual
- tap / type / screenshot
- Skill interface

### v1.1
- Assertions
- Scroll
- Detox adapter
- Exemplos CI

### v2.0
- MCP plugin
- Visual diff
- Snapshot caching
- Sessões paralelas

---

## 15. Métricas de Sucesso

- Flows completos sem flakiness
- Snapshot compreensível por LLM
- Setup < 10 minutos
- Contribuições externas simples

---

## 16. Comparação com agent-browser

| Aspecto | agent-browser | mobile-agent |
|------|---------------|--------------|
| UI Source | DOM | Accessibility |
| CLI | ✔️ | ✔️ |
| Skill | ✔️ | ✔️ |
| Engine | Playwright | Maestro / Detox |
| Target | Web | Mobile RN |
| Open Source | Parcial | ✔️ |

---

## 17. Riscos

- Falta de acessibilidade
- Labels dinâmicos
- Animações longas
- Diferenças iOS / Android

Mitigação: boas práticas RN + Detox fallback.

---

## 18. Resultado Esperado

Um projeto open source que:
- leva o paradigma do agent-browser para mobile
- habilita loops completos de LLM‑driven development
- serve como base para tooling, pesquisa e produtos
