# 🔴 Comandos do Redis CLI

## 📋 Como Acessar o Redis CLI

### **Opção 1: Via Plataforma (Railway/Render/etc)**

1. Acesse o painel da plataforma
2. Clique no recurso **Redis** que você criou
3. Procure por **"Terminal"**, **"CLI"** ou **"Connect"**
4. Clique para abrir o terminal integrado

### **Opção 2: Via Linha de Comando Local**

Se você tem Redis instalado localmente:

```bash
redis-cli
```

### **Opção 3: Conectar ao Redis Remoto**

```bash
redis-cli -h SEU_HOST -p 6379 -a SUA_SENHA
```

**Exemplo:**
```bash
redis-cli -h redis-database-hw4swocswo04g8ks8w840sgk.upstash.io -p 6379 -a abc123xyz
```

---

## 🎯 Comandos Úteis do Redis

### **📊 Ver Informações Gerais**

```bash
# Ver todas as chaves
KEYS *

# Ver chaves que começam com "pedido:"
KEYS pedido:*

# Ver chaves de pedidos do dia
KEYS pedidos:2025-12-05

# Ver informações do servidor
INFO

# Ver quantidade de chaves
DBSIZE
```

### **🔍 Buscar Pedidos**

```bash
# Ver um pedido específico
GET pedido:69332fd97c312adcc969984f

# Ver todos os IDs de pedidos do dia
SMEMBERS pedidos:2025-12-05

# Ver pedidos por status
SMEMBERS pedidos:status:0    # Análise
SMEMBERS pedidos:status:-2   # Agendados
SMEMBERS pedidos:status:1    # Em Preparo
SMEMBERS pedidos:status:2     # Pronto
```

### **📝 Contar Pedidos**

```bash
# Contar pedidos do dia
SCARD pedidos:2025-12-05

# Contar pedidos por status
SCARD pedidos:status:0
SCARD pedidos:status:-2
SCARD pedidos:status:1
SCARD pedidos:status:2
```

### **🗑️ Limpar Dados**

```bash
# Deletar um pedido específico
DEL pedido:69332fd97c312adcc969984f

# Remover de uma lista
SREM pedidos:2025-12-05 69332fd97c312adcc969984f

# Limpar TODOS os dados (CUIDADO!)
FLUSHALL

# Limpar apenas o banco atual
FLUSHDB
```

### **📅 Ver Pedidos de Outros Dias**

```bash
# Ver todas as datas com pedidos
KEYS pedidos:*

# Ver pedidos de uma data específica
SMEMBERS pedidos:2025-12-04
```

### **🔧 Comandos de Debug**

```bash
# Ver tipo de uma chave
TYPE pedido:69332fd97c312adcc969984f

# Ver tempo de expiração (TTL)
TTL pedido:69332fd97c312adcc969984f

# Ver tamanho de uma string
STRLEN pedido:69332fd97c312adcc969984f
```

---

## 💡 Exemplos Práticos

### **Ver todos os pedidos do dia de hoje:**

```bash
# 1. Pegar a data de hoje (exemplo: 2025-12-05)
SMEMBERS pedidos:2025-12-05

# 2. Para cada ID, buscar o pedido completo
GET pedido:ID_DO_PEDIDO
```

### **Ver quantos pedidos estão em cada status:**

```bash
SCARD pedidos:status:-2   # Agendados
SCARD pedidos:status:0    # Análise
SCARD pedidos:status:1    # Em Preparo
SCARD pedidos:status:2    # Pronto
```

### **Limpar todos os pedidos de um dia específico:**

```bash
# 1. Ver todos os IDs
SMEMBERS pedidos:2025-12-05

# 2. Para cada ID, deletar:
DEL pedido:ID1
DEL pedido:ID2
# etc...

# 3. Deletar a lista do dia
DEL pedidos:2025-12-05
```

---

## 🚨 Comandos Perigosos (Use com Cuidado!)

```bash
# ⚠️ DELETA TUDO - Não pode desfazer!
FLUSHALL

# ⚠️ DELETA TODAS AS CHAVES DO BANCO ATUAL
FLUSHDB

# ⚠️ DELETA TODAS AS CHAVES QUE COMEÇAM COM "pedido"
redis-cli --scan --pattern "pedido:*" | xargs redis-cli DEL
```

---

## 📖 Estrutura dos Dados no Seu Redis

```
pedido:{id}                    → JSON completo do pedido
pedidos:YYYY-MM-DD            → Set com IDs dos pedidos do dia
pedidos:status:{status}       → Set com IDs por status
```

**Exemplo:**
```
pedido:69332fd97c312adcc969984f  → {"_id": "...", "check": 0, ...}
pedidos:2025-12-05              → Set: ["id1", "id2", "id3"]
pedidos:status:0                → Set: ["id1", "id2"]
pedidos:status:-2               → Set: ["id3"]
```

---

## 🎓 Dicas

1. **Use `KEYS *` com cuidado** - pode ser lento em bancos grandes
2. **Prefira `SCAN`** em vez de `KEYS` para bancos grandes
3. **Sempre faça backup** antes de usar `FLUSHALL` ou `FLUSHDB`
4. **Use `EXISTS`** para verificar se uma chave existe antes de buscar

---

## 🔗 Recursos

- [Documentação oficial do Redis](https://redis.io/commands)
- [Redis CLI Guide](https://redis.io/docs/ui/cli/)

---

**Pronto!** Agora você sabe como usar o terminal do Redis! 🚀
