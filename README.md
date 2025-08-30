# Sistema de Importação e Precificação Expertzy

Sistema brasileiro para processamento de Declarações de Importação (DI), cálculo de impostos de importação e otimização de estratégias de precificação com incentivos fiscais estaduais.

## 🚀 Status do Projeto

### ✅ **Sistema Web Funcional** 
- **Drag & drop** de arquivos XML da DI com feedback visual
- **Cálculo de impostos** usando dados extraídos da DI (conformidade POP)
- **ICMS Goiás corrigido para 19%** (não mais 17% fallback)
- **Extração automática** de SISCOMEX, AFRMM, capatazia
- **Despesas extras** com classificação ICMS em tempo real

### 🎯 **Arquitetura Implementada**
**Fase 1**: Processamento de DI (Compliance) - Interface azul  
**Fase 2**: Sistema de Precificação (Business) - Interface verde *(planejado)*

## 📁 Estrutura do Projeto

```
/sistema-expertzy-local/          # 🌐 Sistema Web Principal
├── di-processing/                # 📋 Fase 1: Compliance
│   ├── di-processor.html         # Interface de processamento DI
│   └── js/
│       ├── DIProcessor.js        # Parser XML (legado funcional)
│       ├── ComplianceCalculator.js  # Cálculos fiscais
│       └── di-interface.js       # Lógica UI + drag & drop
├── shared/                       # 🎨 Recursos Compartilhados
│   ├── css/expertzy-brand.css    # Sistema de marca
│   ├── css/compliance-theme.css  # Tema compliance (azul)
│   └── data/*.json               # Configurações fiscais
├── samples/                      # 📄 Arquivos XML de teste
└── orientacoes/                  # 🐍 Protótipo Python + documentação
```

## 🔧 Como Usar

### **Sistema Web (Recomendado)**
1. Abrir `sistema-expertzy-local/di-processing/di-processor.html`
2. Arrastar arquivo XML da DI ou clicar para selecionar
3. Revisar despesas automáticas extraídas
4. Configurar despesas extras (marcando se compõem base ICMS)
5. Calcular impostos e visualizar resultados

### **Protótipo Python (Legacy)**
```bash
python orientacoes/importador-xml-di-nf-entrada-perplexity-aprimorado-venda.py
```

## 📊 Funcionalidades

### **✅ Implementado (Sistema Web)**
- **Upload DI**: Drag & drop com validação e preview
- **Extração Automática**: SISCOMEX, AFRMM, capatazia da DI
- **Cálculo de Impostos**: PIS, COFINS, II, IPI (dados da DI) + ICMS (configuração)
- **Despesas Extras**: Campos configuráveis com impacto ICMS em tempo real
- **Interface Responsiva**: Design moderno com animações
- **Conformidade POP**: "Alíquotas devem ser extraídas da DI nesta etapa"

### **🔄 Próximas Implementações**
- **Expansão de Adições**: Visualizar itens detalhados de cada adição da DI
- **Máscara de Moeda**: Formatação automática nos campos de despesas
- **Memória de Cálculo**: Exportação detalhada dos cálculos realizados
- **Campo Despesas Dinâmico**: Adicionar despesas customizadas
- **Sistema de Precificação**: Fase 2 com análise multi-cenário

## 🧮 Lógica de Cálculo

### **Impostos Federais** (extraídos da DI)
```javascript
PIS = adicao.tributos.pis_valor_devido
COFINS = adicao.tributos.cofins_valor_devido  
II = adicao.tributos.ii_valor_devido
IPI = adicao.tributos.ipi_valor_devido
```

### **ICMS por Estado** (configuração + cálculo)
```javascript
// Goiás = 19% (corrigido!)
Base ICMS = (CIF + II + IPI + PIS + COFINS + Despesas) / (1 - 0.19)
ICMS = Base ICMS × 0.19
```

### **Despesas na Base ICMS**
- **Automáticas**: SISCOMEX, AFRMM, capatazia (sempre incluídas)
- **Extras**: Armazenagem, transporte, despachante (opcionais)

## 🚨 Correções Críticas Recentes (2025-08-28)

### **Problema Identificado**
❌ ComplianceCalculator buscava alíquotas em JSON inexistente  
❌ Fallbacks com valores incorretos (ICMS GO = 17%)  
❌ Erro: "Configuração PIS não carregada"  

### **Solução Implementada** 
✅ Sistema usa valores extraídos da DI (conformidade POP)  
✅ ICMS Goiás corrigido para 19%  
✅ Eliminados fallbacks problemáticos  
✅ Arquitetura: DI → Parser → Calculator → Interface  

### **Commit Principal**
`4974771` - "fix: Corrigir cálculo de impostos usando dados extraídos da DI"

## 🎯 Estados com Incentivos Fiscais

| **Estado** | **ICMS** | **Incentivo** | **Benefício** |
|------------|----------|---------------|---------------|
| **GO** | 19% | Crédito 67% | Eletrônicos, médicos |
| **SC** | 17% | Diferimento 75% | TTD060 |  
| **ES** | 17% | FUNDAP | Alíquota efetiva 9% |
| **MG** | 18% | Padrão | Sem benefícios especiais |

## 📋 NCMs Críticos com Benefícios

- **8517.62.**, **8517.70.** - Equipamentos eletrônicos
- **9018.** - Equipamentos médicos
- **8471.** - Máquinas de processamento de dados

## 🔍 Análise com Serena MCP

Sistema configurado com Serena MCP para análise avançada:

```bash
# Acesso global configurado
uvx --python 3.11 --from git+https://github.com/oraios/serena.git serena --help
```

## 📄 Arquivos de Referência

- **POP de Impostos**: `orientacoes/pop_impostos_importacao_v1.md`
- **XML de Exemplo**: `samples/2300120746.xml`, `samples/2518173187.xml`
- **Configurações**: `shared/data/aliquotas.json` (ICMS por estado)
- **CLAUDE.md**: Instruções detalhadas para desenvolvimento

## 🎨 Design System

### **Marca Expertzy**
- **Primária**: #FF002D (vermelho)
- **Secundária**: #091A30 (azul naval)

### **Temas por Fase**
- **Compliance**: Azul (#0066cc) - Processamento DI
- **Business**: Verde (#28a745) - Precificação

## 🤖 Créditos

Desenvolvido com **Claude Code** (claude.ai/code)  
Sistema integrado com **Serena MCP** para análise arquitetural  
Baseado em especificações técnicas Expertzy 2025

---

> **Nota**: Este sistema está em conformidade com o POP de Impostos de Importação v1, que determina: *"As alíquotas de PIS, COFINS, IPI, II devem ser extraídas da DI nesta etapa."*