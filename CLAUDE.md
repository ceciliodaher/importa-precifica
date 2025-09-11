# CLAUDE.md

Este arquivo fornece orientações ao Claude Code para trabalho com código neste repositório.

## Visão Geral do Projeto

Sistema brasileiro de tributação e precificação de importação (Sistema de Importação e Precificação Expertzy) para processar arquivos XML de Declarações de Importação (DI), calcular impostos de importação e otimizar estratégias de precificação com incentivos fiscais em diferentes estados brasileiros.

## Atualizações Recentes (11/09/2025)

### **✅ Sistema de Importação XML Totalmente Funcional**
- **Dashboard visual** de importação em `sistema-expertzy-local/xml-import/`
- **Gate de continuação** que bloqueia sistema se banco estiver vazio
- **Detecção automática** de status do banco via API REST
- **Interface KISS** com drag & drop e progresso em tempo real
- **Sistema de logs estruturado** com exportação JSON/HTML

### **✅ Correção Crítica: Erro ICMS Resolvido**
- **Problema**: Erro SQL `uf_icms cannot be null` ao processar XMLs DI
- **Causa identificada**: ICMS não vem da DI - vem do arquivo `aliquotas.json`
- **Solução**: Desabilitado processamento ICMS do XML (é calculado no frontend)
- **Status**: ✅ Importação XML funcionando sem erros

### **🔄 REFATORAÇÃO ARQUITETURAL MODULE 2 (NOVA)**
- **Descoberta**: Dados da API já vêm processados (`valor_reais: "4819.22"`)
- **Problema**: Module 2 ainda tinha lógica de processamento XML desnecessária
- **Solução**: Module 2 vira **SELETOR DE DI + CALCULADOR ICMS**
- **Princípio**: KISS - uma função por módulo, sem duplicação
- **Status**: 🔄 Implementação em andamento

### **✅ Sistema de Log Implementado**
- **Classe ImportLogger** para logs detalhados em JSON
- **Captura completa** de sucessos, erros, duplicatas com contexto
- **Endpoint export-log.php** para download de logs (JSON/HTML)
- **Botão "Exportar Log"** integrado no dashboard de importação
- **Localização**: Logs salvos em `xml-import/logs/import-log-YYYY-MM-DD.json`

### **✅ Conformidade com Nomenclatura Atingida**
- **Análise com Serena MCP** identificou inconsistências XML vs Banco
- **100% de conformidade** após correções aplicadas
- **Campos adicionados**: `frete_valor_moeda_negociada`, `seguro_valor_moeda_negociada`
- **Funcionalidades implementadas**: Cálculo automático de `valor_unitario_brl`, extração de `codigo_produto`
- **Scripts de migração** criados para dados existentes

## Sistema de Produção Atual

### **Arquitetura Híbrida** (JavaScript + MySQL)

**Localização**: `sistema-expertzy-local/`

**Módulo 1: Importador XML** (`/xml-import/`) ✅ **TOTALMENTE FUNCIONAL**
- ✅ Dashboard visual com drag & drop
- ✅ Processamento completo de XMLs DI brasileiros
- ✅ Conversão automática (centavos → reais, pesos, etc.)
- ✅ Validação e persistência em MySQL
- ✅ Sistema de logs estruturado com exportação
- ✅ **RESPONSABILIDADE**: Única fonte de entrada de dados XML

**Módulo 2: Calculador de Impostos** (`/di-processing/`) 🔄 **REFATORADO**
- 🔄 **NOVA FUNÇÃO**: Seletor de DI + Calculador ICMS
- ✅ Lista DIs do banco com filtros e busca
- ✅ Carregamento de dados processados via API
- ✅ Cálculo ICMS por estado (único imposto não na DI)
- ✅ Configuração de despesas manuais
- ✅ Exportações de compliance (Excel, PDF, JSON)
- ❌ **REMOVIDO**: Upload XML, processamento, conversões

**Fase 2: Sistema de Estratégia de Precificação** (`/pricing-strategy/`)
- Análise de precificação multi-cenário
- Otimização de incentivos fiscais por estado
- Interface focada em negócios (tema verde)
- **NOVO**: Histórico completo de análises

**Fase 3: Sistema de Banco de Dados** (`/api/` + MySQL) ✅ **IMPLEMENTADO**
- 🗄️ Banco MySQL com estrutura completa DI
- 📡 API REST PHP para integração
- 🔄 Sincronização automática localStorage ↔ MySQL
- 📊 Suporte a upload múltiplo de XMLs
- 🔍 Sistema de busca e filtros avançados

### **Protótipo Python Legado**
- Interface GUI usando Tkinter
- Motor de cálculo de impostos (ICMS, IPI, PIS, COFINS, II)
- Análise de incentivos fiscais para estados (GO, SC, ES, MG)

## Estrutura de Diretórios

```
/
├── api/                          # Backend PHP
├── sistema-expertzy-local/       # Frontend JavaScript
│   ├── xml-import/               # NOVO: Módulo de Importação XML
│   │   ├── import-dashboard.html # Dashboard visual de importação
│   │   ├── processor.php         # Processador XML + Sistema de Log
│   │   ├── js/ImportDashboard.js # Controller do dashboard
│   │   ├── css/import-dashboard.css # Estilos específicos
│   │   ├── logs/                 # NOVO: Logs estruturados
│   │   │   └── import-log-*.json # Logs diários de importação
│   │   └── api/                  # APIs REST do módulo
│   │       ├── import.php        # Upload e processamento
│   │       ├── stats.php         # Estatísticas do banco
│   │       ├── validate.php      # Validação de conexão
│   │       ├── clear.php         # Limpeza do banco
│   │       └── export-log.php    # NOVO: Exportação de logs
├── api/                          # FASE 3: Backend PHP
│   ├── config/
│   │   ├── database.php          # Configuração MySQL
│   │   └── .env                  # Variáveis ambiente
│   ├── services/
│   │   ├── database-service.php  # Serviços base de dados
│   │   └── xml-parser.php        # Parser universal XML DI
│   └── endpoints/
│       ├── upload-xml.php        # Upload e processamento
│       ├── listar-dis.php        # Listar DIs com paginação
│       ├── buscar-di.php         # Buscar DI específica
│       └── salvar-calculo.php    # Persistir cálculos
├── sql/
│   └── create_database_importa_precifica.sql  # Schema completo
├── povoar_importa_precifica.php  # Interface de importação XML
├── sistema-expertzy-local/       # Frontend JavaScript
│   ├── index.html                # Página inicial com navegação
│   ├── di-processing/            # FASE 1: Sistema de Conformidade
│   │   ├── di-processor.html     # Interface de processamento DI
│   │   └── js/
│   │       ├── DIProcessor.js    # Parser XML + integração banco
│   │       ├── ComplianceCalculator.js  # Cálculos de impostos
│   │       └── di-interface.js   # Lógica da UI + sync
│   ├── pricing-strategy/         # FASE 2: Sistema de Negócios  
│   │   └── pricing-system.html  # Interface de precificação
│   ├── shared/                   # Recursos compartilhados
│   │   ├── css/                  # Temas e estilos
│   │   ├── js/                   # Módulos compartilhados
│   │   │   └── DatabaseConnector.js  # Connector API REST
│   │   └── data/                 # Configurações JSON
│   └── samples/                  # Arquivos XML de teste
├── sql/                          # Scripts SQL
│   ├── create_database_importa_precifica.sql  # Schema completo
│   ├── fix_nomenclatura_compliance.sql  # NOVO: Correções de conformidade
│   └── migrate_existing_data.sql        # NOVO: Migração de dados
├── docs/                         # Documentação
│   ├── PLANO-IMPLEMENTACAO-BANCO-MYSQL.md
│   ├── registro_da_criacao_e_carga_db.md
│   ├── nomenclatura.md           # Mapeamento XML → Sistema
│   └── nomenclatura-conformidade-relatorio.md  # NOVO: Relatório de conformidade
└── orientacoes/                  # XMLs exemplo e documentos
    ├── 2300120746.xml
    ├── 2518173187.xml
    └── ...
```

## Regras de Processamento de Dados

### **Princípio de Separação de Responsabilidades (ATUALIZADO)**
- **Módulo 1** é a ÚNICA FONTE DE VERDADE para processamento XML → Banco
- **Módulo 2** trabalha EXCLUSIVAMENTE com dados processados da API
- **NUNCA** processar XML em mais de um local
- **NUNCA** converter dados já processados

### **Política Zero Fallbacks (OBRIGATÓRIA)**
```javascript
// ❌ NUNCA faça isso em módulos fiscais:
const aliquota = adicao.tributos?.ii_aliquota || 0;

// ✅ SEMPRE faça isso:
const aliquota = adicao.tributos?.ii_aliquota;
if (aliquota === undefined) {
    throw new Error(`Alíquota II ausente na adição ${adicao.numero}`);
}
```

### **Configuração ICMS (CRÍTICO)**
- ComplianceCalculator DEVE configurar ItemCalculator com alíquota ICMS do estado
- ItemCalculator usa `window.icmsConfig?.ncmConfigs` para NCMs específicos
- Alíquota padrão vem de `obterAliquotaICMS(estado)` no ComplianceCalculator
- ICMS pode ser zero (isenção) mas NUNCA null/undefined
- **IMPORTANTE**: ICMS NÃO VEM DA DI - usar apenas `aliquotas.json`

### **Sistema de Log Estruturado**
- **ImportLogger** captura todas as operações de importação
- **Localização**: `xml-import/logs/import-log-YYYY-MM-DD.json`
- **Níveis**: info, success, warning, error
- **Contexto**: Timestamp, arquivo, DI, erros detalhados
- **Exportação**: JSON para download, HTML para visualização
- **Acesso**: Botão "Exportar Log" no dashboard de importação

## Estruturas de Dados Principais

### **DIProcessor.js (Saída)**
```javascript
diData = {
    numero_di: string,
    importador: {
        nome: string,
        cnpj: string,
        endereco_uf: string  // CRÍTICO para cálculo ICMS
    },
    adicoes: [{
        numero_adicao: string,
        descricao_ncm: string,     // Para descrição da adição
        ncm: string,
        valor_reais: number,
        tributos: {
            ii_aliquota_ad_valorem: number,
            ii_valor_devido: number,
            // ... outros impostos
        },
        produtos: [{
            descricao_mercadoria: string,  // Para descrição do produto
            codigo: string,
            valor_unitario_brl: number,
            quantidade: number
        }]
    }],
    taxa_cambio: number
}
```

### **ComplianceCalculator.js (Saída)**
```javascript
calculationData = {
    impostos: {
        ii: { valor_devido: number },
        icms: { valor_devido: number, aliquota: number },
        // ... outros impostos
    },
    produtos_individuais: [{        // CRÍTICO para ExcelExporter
        adicao_numero: string,
        descricao: string,
        codigo: string,
        ii_item: number,
        icms_item: number
    }],
    totais: {
        total_impostos: number,
        custo_total: number
    }
}
```

## Lógica de Cálculo de Impostos

### **Impostos Base**
- **II**: Taxa variável sobre valor CIF
- **IPI**: Calculado sobre (CIF + II)  
- **PIS/COFINS**: 11,75% combinado sobre valor CIF
- **ICMS**: Taxas específicas por estado com substituição tributária

### **Incentivos Fiscais por Estado**
- **Goiás (GO)**: 67% crédito ICMS para NCMs específicos
- **Santa Catarina (SC)**: 75% ICMS diferido (TTD 060)
- **Espírito Santo (ES)**: Benefícios FUNDAP com taxa efetiva 9%
- **Minas Gerais (MG)**: Cálculo padrão sem benefícios especiais

### **Gestão de Despesas de Importação**
- **Automáticas**: SISCOMEX, AFRMM, capatazia extraídas da DI
- **Manuais**: Armazenagem, transporte, despachante
- **Base ICMS**: `(CIF + II + IPI + PIS + COFINS + Despesas) / (1 - alíquota ICMS)`

## Comandos Principais

### **Executar Sistema Web**
```bash
# Sistema principal (com detecção de banco vazio)
open sistema-expertzy-local/index.html

# Dashboard de importação XML
open sistema-expertzy-local/xml-import/import-dashboard.html

# Processador DI (requer banco populado)
open sistema-expertzy-local/di-processing/di-processor.html

# Interface de importação legada
open povoar_importa_precifica.php
```

### **Aplicar Correções de Conformidade**
```bash
# 1. Atualizar estrutura do banco
mysql -u root -p importa_precificacao < sql/fix_nomenclatura_compliance.sql

# 2. Migrar dados existentes
mysql -u root -p importa_precificacao < sql/migrate_existing_data.sql

# 3. Validar conformidade
php test_nomenclatura_compliance.php
```

### **Configurar Banco de Dados MySQL**
```bash
# Executar script de criação do banco
mysql -u root -p < sql/create_database_importa_precifica.sql

# Verificar tabelas criadas
mysql -u root -p importa_precificacao -e "SHOW TABLES;"

# Configurar variáveis de ambiente
cp api/config/.env.example api/config/.env
```

### **Protótipo Python Legado**
```bash
python orientacoes/importador-xml-di-nf-entrada-perplexity-aprimorado-venda.py
```

## Dados de Amostra
- XML Declaração de Importação: `orientacoes/2300120746.xml`
- Templates Excel em `orientacoes/`

## Regras de Negócio Importantes

1. **Segmentos de Cliente**: Precificação diferente para consumidores finais vs revendedores
2. **Cálculo de Markup**: Baseado no custo total landed incluindo todos os impostos
3. **Lógica Específica por Estado**: Cada estado tem benefícios fiscais únicos
4. **Parsing XML**: Deve lidar com formato DI brasileiro com adições
5. **Múltiplas Moedas**: Taxa de câmbio CALCULADA a partir de valores DI (não extraída)

## Padrões de Nomenclatura (Fluxo de Dados)

| **Módulo** | **Tipo de Dado** | **Nome da Variável** | **Ordem do Fluxo** |
|------------|------------------|---------------------|-------------------|
| XML DI | Dados Brutos | `<declaracaoImportacao>` | 0 |
| xml-parser.php | Dados Convertidos | `$diData` | 0.5 |
| MySQL | Dados Persistidos | tabelas `declaracoes_importacao` | 1 |
| DIProcessor.js | Dados DI | `this.diData` | 1.5 |
| DIProcessor.js | Totais Extraídos | `this.diData.totais.tributos_totais.*` | 2 |
| di-interface.js | DI Global | `currentDI` | 2.5 |
| di-interface.js | Config ICMS | `window.icmsConfig` | 3 |
| ComplianceCalculator.js | Cálculo | `this.lastCalculation` | 3.5 |
| ComplianceCalculator.js | Produtos Individuais | `produtos_individuais[]` | 4 |
| DatabaseConnector.js | Sync Banco | `this.cache` | 4.5 |
| exportCroquiNF.js | Export Cálculo | `this.calculos` | 5 |
| ExcelExporter.js | Export Excel | `this.calculationData` | 5.5 |

## Sistema de Banco de Dados

### **Estrutura das Tabelas Principais**

**declaracoes_importacao**
- `numero_di` (PRIMARY KEY)
- `data_registro`, `importador_id`, `carga_id`
- Relacionamentos: 1:N com adições

**adicoes**
- `id` (AUTO_INCREMENT), `numero_di` (FK)
- `numero_adicao`, `ncm`, `valor_reais`
- Relacionamentos: 1:N com mercadorias e tributos

**mercadorias**
- `id` (AUTO_INCREMENT), `adicao_id` (FK)
- `descricao_mercadoria`, `quantidade`, `valor_unitario`

### **API REST Endpoints**

| Endpoint | Método | Descrição | Parâmetros |
|----------|--------|-----------|------------|
| `/api/upload-xml.php` | POST | Upload e processa XML DI | `file`, `overwrite` |
| `/api/listar-dis.php` | GET | Lista DIs com paginação | `page`, `limit`, `search` |
| `/api/buscar-di.php` | GET | Busca DI específica | `numero_di` |
| `/api/buscar-adicoes.php` | GET | Busca adições de DI | `numero_di`, `adicao` |
| `/api/salvar-calculo.php` | POST | Salva cálculo realizado | `numero_di`, `dados_calculo` |

### **Sincronização Dados**

```javascript
// DatabaseConnector.js - Fluxo de sincronização
1. Verificar conectividade com API
2. Cache local (localStorage) como fallback
3. Sync bidirecional: localStorage ↔ MySQL
4. Queue de operações offline
5. Resolução de conflitos por timestamp
```

## Debugging

### **Sistema de Log Integrado**
- **Logs de importação**: `xml-import/logs/import-log-YYYY-MM-DD.json`
- **Níveis de log**: info, success, warning, error
- **Exportação visual**: Dashboard → Botão "Exportar Log" → Relatório HTML
- **Debug via console**: Ferramentas dev do browser + janela de log integrada

### **Comandos de Debug**
```bash
# Testar importação específica
php test_import_fix.php

# Verificar logs recentes
tail -f sistema-expertzy-local/xml-import/logs/import-log-$(date +%Y-%m-%d).json

# Abrir dashboard de importação
open sistema-expertzy-local/xml-import/import-dashboard.html
```

### **Problemas Comuns**
- **ICMS null**: ICMS não vem da DI - usar `aliquotas.json`
- **Dados truncados**: Verificar tamanhos de campo no banco MySQL
- **XML mal formado**: Usar logs para identificar estrutura específica

---

*Este arquivo foi otimizado para performance, mantendo apenas informações essenciais para desenvolvimento ativo.*