# lg-control-mcp

Servidor [MCP (Model Context Protocol)](https://modelcontextprotocol.io) para controlar TVs **LG webOS** a partir de clientes de IA como **Claude Code**, **Codex CLI** e **GitHub Copilot CLI**.

A função principal é ajustar o **backlight** (brilho do painel, 0–100), mas o servidor expõe praticamente todas as funções controláveis da TV: volume, mudo, entradas (HDMI), apps, canais, mídia, energia, tela, botões do controle remoto e um modo "raw" para qualquer comando SSAP.

A comunicação usa o protocolo **SSAP** (WebSocket) da webOS — o mesmo usado pelo app LG ThinQ / Magic Remote e por projetos como ColorControl. O ajuste de imagem usa o mecanismo *luna* via `setSystemSettings`, com fallback automático.

## Recursos

- `set_backlight` — backlight 0–100 (controle principal de brilho)
- `set_picture_setting` / `set_picture_mode` / `get_picture_settings` — contraste, brilho, cor e modo de imagem
- `set_volume` / `volume_up` / `volume_down` / `get_volume` / `set_mute`
- `list_inputs` / `set_input` — alternar HDMI e demais entradas
- `list_apps` / `launch_app` / `close_app` / `get_foreground_app`
- `channel_up` / `channel_down` / `set_channel` / `list_channels` / `get_current_channel`
- `media_play` / `media_pause` / `media_stop` / `media_rewind` / `media_fast_forward`
- `power_off` / `screen_off` / `screen_on` / `get_power_state`
- `show_toast` — exibe uma notificação na TV
- `send_button` — pressiona qualquer botão do controle (UP, DOWN, ENTER, BACK, HOME, etc.)
- `get_system_info` / `get_software_info` / `get_service_list`
- `ssap_request` — envia qualquer comando SSAP cru (escape hatch)

## Pré-requisitos

- **Node.js 18+**
- A TV LG (webOS) ligada e na mesma rede local
- O **endereço IP** da TV (Configurações → Rede)
- Em **Configurações → Conexão → Gerenciamento de dispositivos móveis TV On**, mantenha o controle por rede habilitado

## Instalação

### Opção A — local (recomendada durante o desenvolvimento)

```bash
git clone https://github.com/SEU_USUARIO/lg-control-mcp.git
cd lg-control-mcp
npm install
```

O `npm install` já compila o projeto (gera `dist/`). O executável fica em `dist/index.js`.

### Opção B — direto do GitHub (sem clonar)

Depois de publicar o repositório, qualquer cliente MCP pode rodar o servidor com:

```bash
npx -y github:SEU_USUARIO/lg-control-mcp
```

> Troque `SEU_USUARIO` pelo seu usuário do GitHub.

## Pareamento (primeira execução)

Na primeira conexão a TV mostra um aviso **"Solicitação de conexão"** na tela — aceite com o controle.
A *client-key* gerada é salva automaticamente em `~/.lg-control-mcp/keys.json` e reutilizada nas próximas vezes, sem novo aviso.

Você não precisa configurar a chave manualmente. Se quiser fixá-la, copie o valor do arquivo acima para a variável `LGTV_CLIENT_KEY`.

## Configuração nos clientes

Em todos os casos, informe o IP da TV pela variável de ambiente `LGTV_HOST`.

Use **um** dos formatos de `command`:

- Local: `command: "node"`, `args: ["C:\\Users\\bruno\\Projetos\\lg-control-mcp\\dist\\index.js"]`
- GitHub: `command: "npx"`, `args: ["-y", "github:SEU_USUARIO/lg-control-mcp"]`

### Claude Code

Via CLI:

```bash
claude mcp add lg-control --env LGTV_HOST=192.168.1.50 -- node C:\Users\bruno\Projetos\lg-control-mcp\dist\index.js
```

Ou no `.mcp.json` (do projeto) / configuração de usuário:

```json
{
  "mcpServers": {
    "lg-control": {
      "command": "node",
      "args": ["C:\\Users\\bruno\\Projetos\\lg-control-mcp\\dist\\index.js"],
      "env": { "LGTV_HOST": "192.168.1.50" }
    }
  }
}
```

### Codex CLI

No arquivo `~/.codex/config.toml`:

```toml
[mcp_servers.lg-control]
command = "node"
args = ["C:\\Users\\bruno\\Projetos\\lg-control-mcp\\dist\\index.js"]
env = { LGTV_HOST = "192.168.1.50" }
```

### GitHub Copilot CLI

No arquivo de configuração MCP do Copilot CLI (`~/.copilot/mcp-config.json`) ou via o comando `/mcp add`:

```json
{
  "mcpServers": {
    "lg-control": {
      "type": "local",
      "command": "node",
      "args": ["C:\\Users\\bruno\\Projetos\\lg-control-mcp\\dist\\index.js"],
      "env": { "LGTV_HOST": "192.168.1.50" },
      "tools": ["*"]
    }
  }
}
```

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `LGTV_HOST` | sim | — | IP da TV na rede local |
| `LGTV_PORT` | não | `3001` | `3001` = wss (TLS auto-assinado); use `3000` para ws sem TLS |
| `LGTV_CLIENT_KEY` | não | — | Chave de pareamento; obtida e salva automaticamente no primeiro uso |

## Como pedir à IA

Exemplos de comandos em linguagem natural depois de configurar:

- "Coloque o backlight da TV em 30"
- "Aumenta o volume" / "Muda para o HDMI 2"
- "Abre a Netflix" / "Desliga a tela da TV"
- "Mostra um aviso 'Jantar pronto' na TV"

## Publicação no GitHub

> O CLI `gh` não está instalado nesta máquina. Use **uma** das opções abaixo.

**Com GitHub CLI** (instale com `winget install --id GitHub.cli`, depois `gh auth login`):

```bash
cd C:\Users\bruno\Projetos\lg-control-mcp
gh repo create lg-control-mcp --public --source=. --remote=origin --push
```

**Manualmente** (crie o repositório vazio em github.com/new, sem README):

```bash
cd C:\Users\bruno\Projetos\lg-control-mcp
git remote add origin https://github.com/SEU_USUARIO/lg-control-mcp.git
git push -u origin main
```

Depois de publicar, atualize a URL em `package.json` (`repository.url`) e substitua `SEU_USUARIO` neste README.

## Solução de problemas

- **"pairing timed out"**: aceite o aviso de conexão na tela da TV e repita a ação.
- **"could not connect"**: confira o IP, se a TV está ligada e na mesma rede. Tente `LGTV_PORT=3000`.
- **Backlight não muda**: alguns firmwares exigem o caminho *luna* — o servidor já tenta SSAP e cai para luna automaticamente. Verifique se o modo de imagem atual permite ajuste manual de backlight.
- **Repareamento**: apague a entrada da TV em `~/.lg-control-mcp/keys.json` para forçar um novo pareamento.

## Como funciona

O servidor abre um WebSocket SSAP com a TV, faz o *handshake* de registro (com `pairingType: PROMPT`) e envia requisições `ssap://...`. Botões do controle usam um socket de ponteiro separado (`getPointerInputSocket`). Ajustes de imagem usam `setSystemSettings`; quando o caminho SSAP direto é recusado pelo firmware, o servidor usa o truque *luna* (criar e fechar um alerta cujo `onclose` aponta para `luna://com.webos.settingsservice/setSystemSettings`).

## Licença

[MIT](LICENSE)
