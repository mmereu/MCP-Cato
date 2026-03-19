# 🤖 Agent Swarm - Sistema Multi-Agente Universale

Un sistema completo di agenti specializzati che collaborano per risolvere task complessi in modo efficiente e strutturato.

## 📁 Struttura

```
agents/swarm/
├── agent.yaml              # 🔧 Configurazione principale
├── README.md               # 📖 Questo file
├── prompts/
│   ├── master.md           # 🎯 System prompt orchestratore
│   ├── coder.md            # 👨‍💻 Sviluppo codice
│   ├── researcher.md       # 🔍 Ricerca web/documentazione
│   ├── reviewer.md         # 👁️ Code review
│   ├── debugger.md         # 🐛 Debugging
│   ├── architect.md        # 🏗️ Architettura
│   ├── tester.md           # 🧪 Testing
│   ├── docs.md             # 📝 Documentazione
│   └── security.md         # 🔒 Sicurezza
└── subagents/
    ├── coder.yaml
    ├── researcher.yaml
    ├── reviewer.yaml
    ├── debugger.yaml
    ├── architect.yaml
    ├── tester.yaml
    ├── docs.yaml
    └── security.yaml
```

## 🚀 Uso Rapido

### Avvia lo Swarm

```bash
# Dalla directory del progetto
kimi --agent-file agents/swarm/agent.yaml

# O usa il path assoluto
kimi --agent-file /path/to/agents/swarm/agent.yaml
```

## 🐝 Subagenti Disponibili

### 🔧 Generali (Tutti i Progetti)

| Subagente | Emoji | Ruolo | Quando Usarlo |
|-----------|-------|-------|---------------|
| **coder** | 👨‍💻 | Sviluppo | Scrivere/modificare codice, refactoring |
| **researcher** | 🔍 | Ricerca | Trovare documentazione, API, librerie |
| **reviewer** | 👁️ | Code Review | Review qualità, best practices |
| **debugger** | 🐛 | Debugging | Analizzare e fixare bug |
| **architect** | 🏗️ | Architettura | Design pattern, struttura progetto |
| **tester** | 🧪 | Testing | Scrivere test, coverage |
| **docs** | 📝 | Documentazione | README, guide, docstring |
| **security** | 🔒 | Sicurezza | Audit vulnerabilità, hardening |

### ⚛️ Frontend Specialists

| Subagente | Emoji | Specializzazione | Quando Usarlo |
|-----------|-------|------------------|---------------|
| **react-specialist** | ⚛️ | React 18+, Next.js, RSC | Componenti React moderni |
| **vue-specialist** | 🟢 | Vue 3, Composition API, Nuxt | App Vue progressive |
| **angular-specialist** | 🅰️ | Angular 17+, RxJS, Signals | Enterprise Angular |
| **css-stylist** | 🎨 | CSS, Tailwind, Design Tokens | Styling e temi |
| **ui-component-designer** | 🧩 | Design System, Headless UI | Componenti riutilizzabili |
| **accessibility-specialist** | ♿ | WCAG, ARIA, Screen Readers | Audit accessibilità |
| **performance-optimizer** | ⚡ | Web Vitals, Bundle, Caching | Ottimizzazione performance |
| **form-wizard** | 📋 | Form complessi, Validazione | Form multi-step, validazione |
| **animation-specialist** | ✨ | Framer Motion, GSAP | Animazioni web |
| **responsive-layout-expert** | 📐 | Responsive, CSS Grid, Mobile | Layout adattivi |

## 💡 Esempi di Workflow

### 1. Implementare una Nuova Feature

```
Utente: "Aggiungi autenticazione JWT al progetto"

Swarm Master:
├── 📋 SetTodoList
│   ├── [ ] Analizzare requisiti e stack tecnologico
│   ├── [ ] Progettare architettura auth
│   ├── [ ] Implementare codice
│   ├── [ ] Scrivere test
│   └── [ ] Review finale
│
├── 🏗️ architect → Progetta struttura auth (Task)
├── 🔍 researcher → Cerca librerie JWT consigliate (Task parallelo)
│
├── 👨‍💻 coder → Implementa autenticazione (Task, attende architect)
├── 🧪 tester → Scrive test per auth (Task parallelo a coder)
│
├── 👁️ reviewer → Review del codice (Task finale)
└── ✅ Presenta risultato all'utente
```

### 2. Fixare un Bug

```
Utente: "Gli utenti non riescono a fare login dopo l'ultimo deploy"

Swarm Master:
├── 🐛 debugger → Analizza logs e identifica problema (Task)
├── 👨‍💻 coder → Implementa fix (Task, attende debugger)
├── 🧪 tester → Verifica il fix con test (Task)
└── ✅ Report all'utente
```

### 3. Refactoring Completo

```
Utente: "Refactor del modulo orders, è diventato troppo complesso"

Swarm Master:
├── 🏗️ architect → Analizza e propone nuova struttura
├── 👁️ reviewer → Review del codice esistente (parallelo)
├── 👨‍💻 coder → Esegue refactoring
├── 🧪 tester → Aggiorna test esistenti
└── ✅ Summary dei cambiamenti
```

### 4. Creare un Componente UI (Frontend)

```
Utente: "Crea un componente DatePicker accessibile per React"

Swarm Master:
├── ⚛️ react-specialist → Struttura componente React
├── 🧩 ui-component-designer → Design API e patterns
├── ♿ accessibility-specialist → ARIA, keyboard nav (parallelo)
├── 🎨 css-stylist → Styling e animazioni
├── 🧪 tester → Unit tests
└── ✅ Componente completo documentato
```

### 5. Ottimizzare Performance Web

```
Utente: "Il sito è lento, migliora le performance"

Swarm Master:
├── ⚡ performance-optimizer → Audit Web Vitals
├── 👨‍💻 coder → Implementa ottimizzazioni
├── ⚛️ react-specialist → Ottimizzazioni React-specific
├── 🎨 css-stylist → Ottimizzazioni CSS
└── ✅ Report miglioramenti
```

### 6. Form Complesso Multi-step

```
Utente: "Crea wizard di registrazione a 3 step con validazione"

Swarm Master:
├── 📋 form-wizard → Architettura form
├── ⚛️ react-specialist → Implementazione React Hook Form
├── 🧩 ui-component-designer → Componenti form riutilizzabili
├── ♿ accessibility-specialist → A11y form
├── 🎨 css-stylist → Styling stati form
└── ✅ Form completo funzionante
```

### 7. Landing Page Responsive

```
Utente: "Crea landing page con animazioni e responsive"

Swarm Master:
├── 📐 responsive-layout-expert → Struttura responsive
├── ✨ animation-specialist → Animazioni entrance
├── 🎨 css-stylist → Design system, tema
├── ♿ accessibility-specialist → A11y checks
├── ⚡ performance-optimizer → Ottimizzazione immagini
└── ✅ Landing page deployabile
```

## 🔧 Personalizzazione

### Aggiungere un Nuovo Subagente

1. Crea `subagents/nome.yaml`:

```yaml
version: 1
agent:
  extend: ../agent.yaml
  name: nome-subagente
  system_prompt_path: ../prompts/nome.md
  exclude_tools:
    - "kimi_cli.tools.multiagent:Task"
    - "kimi_cli.tools.multiagent:CreateSubagent"
```

2. Crea `prompts/nome.md` con le istruzioni

3. Registra in `agent.yaml`:

```yaml
subagents:
  nome:
    path: ./subagents/nome.yaml
    description: "Descrizione del ruolo"
```

### Modificare un Prompt

Modifica i file in `prompts/` per adattare il comportamento degli agenti al tuo progetto specifico.

### Ereditare Configurazione

Puoi creare varianti specializzate:

```yaml
# agents/swarm-frontend/agent.yaml
version: 1
agent:
  extend: ../swarm/agent.yaml  # Eredita tutto
  system_prompt_args:
    PROJECT_TYPE: "Frontend React"
    ADDITIONAL_CONTEXT: "Usiamo Tailwind CSS e Vite"
```

## 📋 Comandi Utili

### Avviare con Contesto Aggiuntivo

```bash
# Aggiungi altre directory al contesto
kimi --agent-file agents/swarm/agent.yaml --add-dir ../shared-libs
```

### Avviare in Modalità Specifica

```bash
# Modalità non-interattiva (per scripting)
kimi --agent-file agents/swarm/agent.yaml --non-interactive "Implementa feature X"
```

## 🎯 Best Practices

1. **Inizia chiaro** - Descrivi bene cosa vuoi ottenere
2. **Lascia orchestrare** - Il Master sa quando usare i subagenti
3. **Fornisci contesto** - Più informazioni dai, migliore il risultato
4. **Revisiona** - Usa il subagente reviewer per codice importante
5. **Itera** - È normale fare più cicli per task complessi

## 🐛 Troubleshooting

### Subagente non trovato
Verifica che il path in `agent.yaml` sia corretto e relativo al file YAML.

### Errore nel caricamento
Controlla la sintassi YAML con:
```bash
python -c "import yaml; yaml.safe_load(open('agents/swarm/agent.yaml'))"
```

### Subagente non usa il prompt corretto
Verifica che `system_prompt_path` sia relativo al file subagent YAML.

## 📚 Riferimenti

- [Documentazione Kimi CLI - Agents](https://moonshotai.github.io/kimi-cli/en/customization/agents.html)
- [Documentazione Kimi CLI - Subagents](https://moonshotai.github.io/kimi-cli/en/customization/agents.html#defining-subagents-in-agent-files)

---

**Prodotto con ❤️ per aumentare la produttività degli sviluppatori**
