# Guía: Ralph Loop con Git Bash en Windows

## ¿Qué es Ralph Loop?

Ralph Loop es una técnica de desarrollo iterativo con IA creada por Geoffrey Huntley. Consiste en ejecutar Claude en un loop donde cada iteración:
1. Lee un archivo `prd.json` con user stories
2. Implementa UNA story
3. Verifica que el build pase
4. Marca la story como `passes: true`
5. Hace commit
6. Repite hasta completar todas las stories

**Ventaja principal:** Cada iteración es una instancia fresca de Claude con contexto limpio, evitando problemas de contexto lleno.

---

## Requisitos Previos

### 1. Instalar jq (para parsear JSON en bash)
```powershell
# En PowerShell (como admin)
winget install jqlang.jq
```

Después de instalar, agregar al PATH en Git Bash:
```bash
export PATH="$PATH:/c/Users/TU_USUARIO/AppData/Local/Microsoft/WinGet/Packages/jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe"
```

### 2. Git Bash
El script `ralph.sh` es un script Bash. **NO funciona en PowerShell** porque usa sintaxis Bash:
- `#!/bin/bash`
- `export`, `while`, `[[`, `case`
- Pipes y redirecciones Unix

---

## Estructura de Archivos

```
proyecto/
├── prd.json                    # User stories en formato JSON
├── progress.txt                # Log de progreso (se crea automático)
└── scripts/ralph/
    ├── ralph.sh                # Script principal
    └── prompt.md               # Prompt para Claude
```

---

## Configuración del prd.json

```json
{
  "projectName": "Mi Proyecto",
  "branchName": "feature/mi-feature",
  "userStories": [
    {
      "id": "US-001",
      "title": "Crear componente X",
      "description": "Descripción detallada",
      "priority": 1,
      "acceptanceCriteria": [
        "Crear archivo en src/components/X.tsx",
        "TypeScript compila sin errores"
      ],
      "passes": false
    }
  ]
}
```

**Importante:**
- `priority` determina el orden (1 es primero)
- `passes: false` → pendiente, `passes: true` → completada

---

## El Script ralph.sh

### Versión que funciona:

```bash
#!/bin/bash

set -e

MAX_ITERATIONS=${1:-10}
ITERATION=0
PRD_FILE="prd.json"
PROGRESS_FILE="progress.txt"
PROMPT_FILE="scripts/ralph/prompt.md"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Ralph Loop Starting - Max iterations: ${MAX_ITERATIONS}${NC}"

# Get branch from prd.json
BRANCH_NAME=$(cat "$PRD_FILE" | jq -r '.branchName // "feature/ralph-work"')
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]; then
    git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
fi

# Main loop
while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))

    INCOMPLETE=$(cat "$PRD_FILE" | jq '[.userStories[] | select(.passes != true)] | length')

    if [ "$INCOMPLETE" -eq 0 ]; then
        echo -e "${GREEN}All stories complete!${NC}"
        exit 0
    fi

    echo -e "${YELLOW}Iteration $ITERATION - Remaining: $INCOMPLETE${NC}"

    # IMPORTANTE: Usar claude -p con estos flags
    claude -p "$(cat $PROMPT_FILE)" \
        --dangerously-skip-permissions \
        --allowedTools "Bash,Read,Write,Edit,Glob,Grep" \
        --verbose \
        --output-format stream-json

    echo "Iteration $ITERATION completed at $(date)" >> "$PROGRESS_FILE"
    sleep 2
done
```

---

## Errores Comunes y Soluciones

### Error 1: `jq: command not found`
**Causa:** jq no está instalado o no está en el PATH.
**Solución:**
```bash
# Instalar jq
winget install jqlang.jq

# Agregar al PATH temporalmente
export PATH="$PATH:/c/Users/TU_USUARIO/AppData/Local/Microsoft/WinGet/Packages/jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe"
```

### Error 2: `Raw mode is not supported`
**Causa:** Usar `claude --continue` con pipes no funciona.
**Solución:** Usar `claude -p` (print mode) en lugar de `claude --continue`:
```bash
# MAL
cat "$PROMPT_FILE" | claude --continue

# BIEN
claude -p "$(cat $PROMPT_FILE)" --dangerously-skip-permissions --allowedTools "..."
```

### Error 3: Claude no ejecuta herramientas
**Causa:** El modo `-p` (print) no ejecuta herramientas por defecto.
**Solución:** Agregar flags de permisos:
```bash
claude -p "..." \
    --dangerously-skip-permissions \
    --allowedTools "Bash,Read,Write,Edit,Glob,Grep"
```

### Error 4: No veo progreso (parece congelado)
**Causa:** Claude está trabajando pero no muestra output.
**Solución:** Agregar `--verbose --output-format stream-json`:
```bash
claude -p "..." \
    --verbose \
    --output-format stream-json
```

### Error 5: Se pausa al seleccionar texto en terminal
**Causa:** "Quick Edit Mode" de Windows pausa procesos cuando seleccionas texto.
**Solución:**
1. Click derecho en barra de título de Git Bash
2. Properties → Options
3. Desmarcar "Quick Edit Mode"

### Error 6: `integer expression expected`
**Causa:** Escribiste algo como `10~` en lugar de `10`.
**Solución:** Asegúrate de escribir solo números: `./ralph.sh 10`

### Error 7: Stories creadas pero no marcadas como `passes: true`
**Causa:** El build falla por algún error (ej: falta un archivo de dependencia).
**Solución:**
1. Verificar el build manualmente: `cd apps/web && pnpm build`
2. Arreglar el error
3. Ejecutar Ralph de nuevo

---

## Flujo de Trabajo Recomendado

### 1. Preparar el PRD
```bash
# Crear prd.json con todas las user stories
# Asegurarse de que cada story tenga:
# - id único
# - priority en orden
# - passes: false
# - acceptanceCriteria claros
```

### 2. Preparar el prompt
```bash
# Editar scripts/ralph/prompt.md con instrucciones claras
# Incluir:
# - Qué hacer (leer prd.json, implementar UNA story)
# - Cómo verificar (pnpm build, tsc --noEmit)
# - Qué hacer si pasa (marcar passes: true, commit)
# - Qué hacer si falla (no marcar, documentar en progress.txt)
```

### 3. Ejecutar Ralph
```bash
# En Git Bash (NO PowerShell)
./scripts/ralph/ralph.sh 10
```

### 4. Monitorear
```bash
# En otra terminal, verificar progreso
grep -c '"passes": true' prd.json

# Ver últimos commits
git log --oneline -5
```

### 5. Si hay problemas
```bash
# Verificar build manualmente
cd apps/web && pnpm build

# Si falla, arreglar el error y volver a ejecutar Ralph
```

---

## Comandos de Claude CLI

| Comando | Descripción |
|---------|-------------|
| `claude -p "prompt"` | Modo print (no interactivo) |
| `--dangerously-skip-permissions` | Ejecutar herramientas sin pedir permiso |
| `--allowedTools "..."` | Lista de herramientas permitidas |
| `--verbose` | Mostrar más información |
| `--output-format stream-json` | Mostrar JSON en tiempo real |

---

## Lecciones Aprendidas

1. **Git Bash es obligatorio** - PowerShell no entiende sintaxis Bash

2. **`claude -p` necesita permisos explícitos** - Sin `--dangerously-skip-permissions` y `--allowedTools`, Claude solo lee pero no escribe

3. **El build debe pasar** - Si hay errores de TypeScript u otros, Ralph no marca stories como completadas

4. **Dependencias importan** - Si una story depende de otra (ej: Badge necesita utils.ts), y la dependencia no existe, el build falla

5. **No interrumpir** - Cada iteración puede tardar 2-5 minutos. No hacer Ctrl+C ni seleccionar texto

6. **Verificar progreso sin interrumpir** - Usar otra terminal para monitorear con `grep -c '"passes": true' prd.json`

---

## Ejemplo de Sesión Exitosa

```bash
$ ./scripts/ralph/ralph.sh 10
========================================
  Ralph Loop Starting
  Max iterations: 10
========================================

========================================
  Iteration 1 of 10
========================================
Remaining stories: 45
Spawning Claude instance...
{"type":"assistant",...}  # JSON moviéndose = está trabajando

# ... después de unos minutos ...

========================================
  Iteration 2 of 10
========================================
Remaining stories: 44  # ← Bajó! Story completada
Spawning Claude instance...
```

---

## Referencias

- [Ralph Loop por Geoffrey Huntley](https://ghuntley.com/ralph/)
- [Claude Code CLI](https://docs.anthropic.com/claude-code)
