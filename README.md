# PrinterMonit — Sistema Web de Monitoramento de Impressoras

Sistema web profissional para gerenciamento, monitoramento e controle de impressoras em rede, construído com:

- **Backend**: FastAPI (Python), PostgreSQL, SQLAlchemy (async), Pydantic, pysnmp, JWT + passlib
- **Frontend**: React 18 + TypeScript + Vite
- **Container**: Docker Compose (PostgreSQL + Backend)

## Manual de Instalação

Este manual cobre todas as etapas para colocar o PrinterMonit em produção ou ambiente de desenvolvimento.

### 1. Prerequisitos

- **Docker** e **Docker Compose** (versão 2+)
- **Git** para clonar o repositório
- (Opcional) Python 3.10+ para desenvolvimento backend sem Docker
- (Opcional) Node.js 20+ e npm para desenvolvimento frontend sem Docker

### 2. Instalação com Docker Compose (Recomendado)

O método mais simples para rodar o sistema completo (backend + banco de dados) é usando Docker Compose.

#### 2.1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd printermonit
```

#### 2.2. Configurar variáveis de ambiente

Copie o arquivo de exemplo e ajuste as configurações:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com seu editor preferido:

```bash
nano .env
```

As variáveis mais importantes:

| Variável | Descrição | Padrão |
|---|---|---|
| `SECRET_KEY` | Chave para assinatura do JWT | Gere um valor seguro |
| `ALGORITHM` | Algoritmo de JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Tempo de expiração do token | `30` |
| `POSTGRES_DB` | Nome do banco de dados | `printermonit` |
| `POSTGRES_USER` | Usuário do PostgreSQL | `printermonit` |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL | Gere um valor seguro |
| `SNMP_COMMUNITY_DEFAULT` | comunidade SNMP padrão | `public` |

#### 2.3. Levantar os containers

```bash
docker compose up --build -d
```

Isso iniciará:
- **PostgreSQL** banco de dados
- **Backend** FastAPI na porta 8000
- **Frontend** React na porta 5173 (através do backend proxy)

Aguardar alguns segundos para que os containers inicializem e o banco de dados seja criado.

#### 2.4. Acessar o sistema

- **Frontend**: http://localhost:5173 (ou http://localhost:80 se configurado via proxy reverso)
- **API Documentation**: http://localhost:8000/docs
- **API Alternativa**: http://localhost:8000/redoc

### 3. Instalação Desenvolvimento (Sem Docker)

#### 3.1. Backend (Python)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edite o .env com as configurações desejadas
pip install -e ".[dev]"
```

Roda as migrações do banco:

```bash
cd alembic
alembic upgrade head
```

Inicie o servidor:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 3.2. Frontend (Node.js)

```bash
cd frontend
npm ci
cp .env.example .env  # (se houver configurações de API)
npm run dev
```

O frontend ficará disponível em http://localhost:5173 por padrão.

### 4. Configuração SNMP para Impressoras Reais

Para que o monitoramento de impressoras funcione, é necessário configurar o SNMP nas impressoras da rede.

#### 4.1. Requisitos de rede

- **Porta UDP 161** deve estar aberta entre o servidor PrinterMonit e cada impressora
- A comunidade SNMP deve ser configurada nas impressoras (padrão: `public`)
- O serviço SNMP deve estar ativo nas impressoras
- O contador de páginas deve estar disponível via MIB

#### 4.2. Testar conexão com uma impressora

Após iniciar o sistema, pode testar a conexão através da API:

```bash
# 1. Fazer login para obter token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exemplo.com","password":"admin"}' | jq -r .access_token)

# 2. Testar conexão SNMP (substitua ID pela impressora cadastrada)
curl -X POST http://localhost:8000/api/printers/1/test \
  -H "Authorization: Bearer $TOKEN"
```

#### 4.3. OIDs suportadas

O backend tenta os seguintes OIDs padrão:

- MIB genérico `sysUpTime`
- IEEE `prtMarkerSupplies`
- Xerox `xeroxSupply`

### 5. Primeira utilização

Após a instalação:

1. Acesse o frontend em http://localhost:5173
2. Use as credenciais padrão (primeiro acesso):
   - **Usuário**: `admin`
   - **Senha**: `admin`
3. **Altere a senha imediatamente** após o primeiro login
4. Configure as impressoras via interface ou API:
   - IP da impressora
   - Comunidade SNMP
   - Setor/departamento
5. Teste a conexão SNMP para cada impressora

### 6. Produção

Para deploy em produção:

1. Use um domínio real com HTTPS (Let's Encrypt ou certificado próprio)
2. Configure um proxy reverso (nginx/Caddy) encaminhando:
   - `https://sua-impressora.com/api` → backend:8000
   - `https://sua-impressora.com` → frontend:5173
3. Defina `SECRET_KEY` e `ALLOWED_HOSTS` no `.env`
4. Use um banco de dados PostgreSQL externo ou volume persistente Docker
5. Configure firewall para permitir apenas as portas necessárias:
   - **8000/TCP** (backend API)
   - **5173/TCP** (frontend) ou porta http/https externa
   - **UDP 161** (para cada impressora monitorada)
6. Configure backups do banco de dados PostgreSQL

## Estrutura do Projeto

```
printermonit/
├── backend/
│   ├── app/                    # Código fonte backend FastAPI
│   ├── alembic/                # Migrações de banco de dados
│   ├── requirements.txt        # Dependências Python
│   ├── .env                    # Variáveis de ambiente (não commited)
│   ├── .env.example            # Exemplo de variáveis de ambiente
│   ├── Dockerfile              # Dockerfile do backend
│   └── docker-compose.yml      # Orquestração Docker
└── frontend/
    ├── package.json            # Dependências Node.js
    ├── vite.config.ts          # Configuração Vite
    ├── tsconfig.json           # TypeScript config
    └── src/                    # Código fonte React + TypeScript
```

## Endpoints Principais

### Autenticação
- `POST /api/auth/register` — cadastro de usuário
- `POST /api/auth/login` — login, retorna JWT
- `GET /api/auth/me` — usuário autenticado

### Impressoras
- `GET /api/printers` — listar (filtros: `sector`, `status`, `page`, `size`)
- `POST /api/printers` — cadastrar impressora
- `GET /api/printers/{id}` — detalhes
- `PUT /api/printers/{id}` — atualizar
- `DELETE /api/printers/{id}` — excluir
- `POST /api/printers/{id}/test` — testar conectividade SNMP
- `GET /api/printers/{id}/readings` — histórico de leituras
- `GET /api/printers/dashboard/summary` — resumo do dashboard

### Relatórios
- `POST /api/reports/consumption` — consumo por período/impressora/setor
- `GET /api/reports/export/csv` — exportar leituras em CSV

## Licença

Uso interno / corporativo.
