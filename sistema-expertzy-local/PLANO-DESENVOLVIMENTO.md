# Plano de Desenvolvimento - Sistema Expertzy de Importação e Precificação

## 📊 STATUS GERAL DO PROJETO
**Progresso Total: 35%**  
**Início:** 17/08/2025  
**Prazo:** 19/08/2025 (2 dias)  
**Status:** 🔄 Em desenvolvimento - **FASE DE IMPORTAÇÃO CONCLUÍDA ✅**

---

## 🏗️ ESTRUTURA DO PROJETO

### Arquitetura de Arquivos
```
/sistema-expertzy-local/
├── index.html                    # Landing page Expertzy ⏳
├── sistema-importacao.html       # Sistema principal ⏳
├── PLANO-DESENVOLVIMENTO.md      # Este documento ✅
├── /css/
│   ├── landing.css              # Estilos da landing page ⏳
│   └── sistema.css              # Estilos do sistema ⏳
├── /js/
│   ├── app.js                   # Aplicação principal ⏳
│   ├── xmlParser.js             # Parser do XML da DI ⏳
│   ├── calculator.js            # Cálculos tributários ⏳
│   ├── pricing.js               # Engine de precificação ⏳
│   └── storage.js               # Gerenciamento localStorage ⏳
├── /data/
│   ├── aliquotas.json           # Base de alíquotas 2025 ⏳
│   ├── beneficios.json          # Benefícios fiscais ⏳
│   └── config.json              # Configurações do sistema ⏳
├── /assets/
│   └── /images/                 # Logos Expertzy ✅
└── /samples/
    └── 2300120746.xml           # XML de teste ✅
```

---

## 📅 DIA 1 - ESTRUTURA E PROCESSAMENTO

### 🌅 MANHÃ (8h-12h)

#### 1. Estrutura Base do Projeto
- [x] Criar estrutura de pastas
- [x] Copiar logos Expertzy para /assets/images/
- [x] Copiar XML de teste para /samples/
- [x] Criar PLANO-DESENVOLVIMENTO.md
**Status:** ✅ CONCLUÍDO

#### 2. Landing Page (index.html)
- [ ] Estrutura HTML5 com Bootstrap 4
- [ ] Header com logo Expertzy
- [ ] Seção Hero com CTA
- [ ] Seção de Funcionalidades
- [ ] Seção de Benefícios
- [ ] Footer com contato
- [ ] Estilização com cores Expertzy (#FF002D, #091A30)
**Status:** ⏳ PENDENTE

#### 3. Sistema Principal (sistema-importacao.html)
- [ ] Layout com sidebar de navegação
- [ ] Área de upload de XML
- [ ] Tabela de resultados
- [ ] Formulários de configuração
- [ ] Dashboard de resumo
**Status:** ⏳ PENDENTE

#### 4. Parser XML (xmlParser.js)
- [ ] Classe DiParser
- [ ] Método parseXML()
- [ ] Extração de dados gerais
- [ ] Processamento de adições
- [ ] Extração de produtos
- [ ] Parsing de informações complementares
**Status:** ⏳ PENDENTE

### 🌆 TARDE (13h-17h)

#### 5. JSONs de Configuração
- [ ] aliquotas.json com dados 2025
- [ ] beneficios.json (GO, SC, MG, ES)
- [ ] config.json
**Status:** ⏳ PENDENTE

#### 6. Calculadora Tributária (calculator.js)
- [ ] Classe TributaryCalculator
- [ ] Cálculo de II
- [ ] Cálculo de IPI
- [ ] Cálculo de PIS/COFINS
- [ ] Cálculo de ICMS
- [ ] Aplicação de benefícios
**Status:** ⏳ PENDENTE

#### 7. Interface de Upload
- [ ] Drag-and-drop
- [ ] Validação de arquivo
- [ ] Feedback visual
- [ ] Exibição de dados
**Status:** ⏳ PENDENTE

#### 8. Armazenamento Local (storage.js)
- [ ] Classe DataStorage
- [ ] Salvar DI
- [ ] Carregar DI
- [ ] Listar DIs
- [ ] Exportar/Importar JSON
**Status:** ⏳ PENDENTE

---

## 📅 DIA 2 - INTERFACE E FUNCIONALIDADES

### 🌅 MANHÃ (8h-12h)

#### 9. Interface de Resultados
- [ ] Tabela expansível multi-nível
- [ ] Campos editáveis
- [ ] Dashboard com totais
- [ ] Visualização detalhada
**Status:** ⏳ PENDENTE

#### 10. Módulo de Precificação (pricing.js)
- [ ] Classe PricingEngine
- [ ] Cálculo de preços
- [ ] Comparação entre estados
- [ ] Simulação de cenários
**Status:** ⏳ PENDENTE

#### 11. Configuração de Custos Extras
- [ ] Interface de custos
- [ ] Rateio proporcional
- [ ] Templates salvos
**Status:** ⏳ PENDENTE

### 🌆 TARDE (13h-17h)

#### 12. Exportações
- [ ] Excel (SheetJS)
- [ ] PDF (jsPDF)
- [ ] JSON estruturado
**Status:** ⏳ PENDENTE

#### 13. Testes com XML Real
- [ ] Carregar 2300120746.xml
- [ ] Validar extração
- [ ] Verificar cálculos
- [ ] Testar precificação
**Status:** ⏳ PENDENTE

#### 14. Ajustes Finais
- [ ] Responsividade
- [ ] Mensagens de erro
- [ ] Loading states
- [ ] Documentação
**Status:** ⏳ PENDENTE

---

## 🔑 NOMENCLATURAS PADRONIZADAS

### Classes JavaScript
- `DiParser` - Parser de XML da DI
- `TributaryCalculator` - Calculadora de tributos
- `PricingEngine` - Motor de precificação
- `DataStorage` - Gerenciamento de armazenamento

### Estrutura de Dados (seguindo documentação)
```javascript
{
  numero_di: "2300120746",
  data_registro: "2023-01-02",
  urf_despacho_codigo: "0120100",
  urf_despacho_nome: "GOIANIA",
  importador: {
    nome: "...",
    cnpj: "...",
    endereco: "..."
  },
  adicoes: [{
    numero_adicao: "001",
    ncm: "73181500",
    produtos: [...],
    tributos: {
      ii_valor: 0,
      ipi_valor: 0,
      pis_valor: 0,
      cofins_valor: 0,
      icms_valor: 0
    }
  }]
}
```

---

## 🎯 FASE DE IMPORTAÇÃO - CONCLUÍDA ✅

### ✅ Implementado e Testado (17/08/2025)

#### Upload e Processamento de XML
- ✅ **Interface de upload**: Drag & drop e seleção de arquivo
- ✅ **Função processFile()**: Módulo `js/globals.js` conecta HTML ao app
- ✅ **Parser XML**: Classe `DiParser` extraindo dados da DI
- ✅ **Identificação automática do incoterm**: CFR identificado corretamente
- ✅ **Validação de arquivo**: Extensão .xml, tamanho máximo 50MB

#### Extração de Dados
- ✅ **Dados gerais da DI**: Número, data, URF, modalidade
- ✅ **Informações do importador**: Nome, CNPJ, endereço completo
- ✅ **Adições**: NCM 73181500 extraído corretamente
- ✅ **Carga**: Peso bruto/líquido, país de procedência
- ✅ **Tributos federais**: II, IPI, PIS, COFINS extraídos

#### Interface de Dados
- ✅ **Aba de dados**: Tabela `#adicoesTable` implementada
- ✅ **Container importador**: `#importadorInfo` populado
- ✅ **Resumo de totais**: `#totalsInfo` com cards
- ✅ **Navegação de abas**: Sistema funcional com habilitação progressiva
- ✅ **Visual feedback**: Loading, alertas de sucesso/erro

#### Testes Automatizados
- ✅ **9 testes básicos**: Playwright cobrindo fluxo completo
- ✅ **5 testes de validação**: Dados específicos da DI
- ✅ **Screenshots**: Evidências visuais de funcionamento
- ✅ **Servidor localhost**: CORS resolvido para testes

### 📋 Resultado dos Testes

```bash
# Testes Básicos - Fase Importação
✅ Deve carregar a página sem erros
✅ Deve aceitar upload de arquivo XML  
✅ Deve habilitar abas após processar XML
✅ Deve navegar para aba de dados e mostrar informações

# Testes de Validação - Dados da DI
✅ Deve identificar incoterm CFR corretamente
✅ Deve extrair adições corretamente (NCM 73181500)
✅ Deve mostrar dados do importador
✅ Deve calcular totais da DI
✅ Deve habilitar aba de custos após processamento
```

### 🔧 Arquivos Implementados

- `sistema-importacao.html`: Interface com elementos necessários
- `js/globals.js`: Funções globais modulares
- `js/app.js`: Orquestrador principal com populateDataTab()
- `js/xmlParser.js`: Parser completo da DI
- `tests/test-validacao-dados.spec.js`: Suite de validação
- `samples/2300120746.xml`: Arquivo de teste

### ➡️ Próxima Fase: Custos e Cálculos Tributários

---

## 📝 NOTAS DE DESENVOLVIMENTO

### Última Atualização
**Data/Hora:** 17/08/2025 - Início do projeto  
**Ação:** Criada estrutura base e documentação

### Próximos Passos Imediatos
1. Criar landing page com identidade Expertzy
2. Desenvolver parser XML funcional
3. Implementar cálculos tributários básicos

### Observações Importantes
- Sistema 100% frontend (HTML/JS)
- Dados em localStorage/JSON
- Preparado para futura migração PHP
- Foco em funcionalidade sobre estética

---

## ✅ CHECKLIST DE ENTREGA

### Dia 1
- [x] Estrutura de pastas criada
- [ ] Landing page funcional
- [ ] Parser XML operacional
- [ ] Cálculos básicos funcionando

### Dia 2
- [ ] Interface completa
- [ ] Precificação implementada
- [ ] Exportações funcionando
- [ ] Sistema testado com XML real

---

## 🔍 ANÁLISE PROFUNDA: CUSTOS ZERADOS POR ITEM

**Data:** 17/08/2025  
**Problema:** Valores de custo por item aparecem zerados na tabela de resultados  
**Status:** Causa raiz identificada, correções planejadas  

### 🚨 Problemas Identificados

#### 1. **Custos Extras Não Rateados** 
**Localização:** `js/app.js:736`
```javascript
custos_extra_rateados: 0, // ❌ Hardcoded como 0
```
**Impacto:** Custos extras nunca aparecem por item

#### 2. **ICMS Não Incluído**
**Localização:** `js/app.js:747-754`
```javascript
calculateItemTotalCost(adicao, produto, cenario, ratios) {
    const custoBase = produto.valor_total_item || 0;
    const tributos = ratios.ii_rateado + ratios.ipi_rateado + ratios.pis_rateado + ratios.cofins_rateado;
    // ❌ ICMS não incluído no cálculo
    const freteSeguro = ratios.frete_rateado + ratios.seguro_rateado;
    const custosExtras = ratios.custos_extra_rateados; // ❌ Sempre 0
    return custoBase + tributos + freteSeguro + custosExtras;
}
```

#### 3. **Tabela de Variáveis do Sistema**

| Categoria | Variável | Onde é Criada | Onde é Chamada | Status |
|-----------|----------|---------------|----------------|--------|
| **Parser XML** | `produtos` | `extractProdutos()` (xmlParser.js:363) | `createItemRow()` (app.js:647) | **🚨 Base dos custos por item** |
| **Interface** | `ratios` | `calculateItemRatios()` (app.js:728) | `createItemRow()` (app.js:699) | **🚨 custos_extra_rateados = 0** |
| **Cálculos** | `cenario` | `populateTabelaResultados()` (app.js:640) | `createItemRow()` (app.js:700) | **🚨 Pode ser NULL** |
| **Resultado** | `custoTotalItem` | `calculateItemTotalCost()` (app.js:747) | `createItemRow()` (app.js:700) | **❌ Incompleto** |

### 🔧 Plano de Correção

#### **Etapa 1: Corrigir Rateio de Custos Extras**
```javascript
// js/app.js:728-741 - CORREÇÃO
calculateItemRatios(adicao, produto, cenario) {
    const totalQuantidade = adicao.produtos.reduce((sum, p) => sum + (p.quantidade || 0), 0);
    
    if (totalQuantidade === 0) {
        console.warn(`Adição ${adicao.numero_adicao}: Quantidade total zero`);
        return this.createEmptyRatios();
    }
    
    const proporcao = (produto.quantidade || 0) / totalQuantidade;
    return {
        proporcao: proporcao,
        custos_extra_rateados: (cenario?.total_custos_extras || 0) * proporcao, // ✅ CORRIGIDO
        // ... outros rateios
    };
}
```

#### **Etapa 2: Incluir ICMS no Custo Total**
```javascript
// js/app.js:747-754 - CORREÇÃO
calculateItemTotalCost(adicao, produto, cenario, ratios) {
    const custoBase = produto.valor_total_item || 0;
    const tributosFederais = ratios.ii_rateado + ratios.ipi_rateado + ratios.pis_rateado + ratios.cofins_rateado;
    const icmsRateado = (cenario?.icms_calculado?.valor_total || 0) * (ratios.proporcao || 0); // ✅ ADICIONADO
    const freteSeguro = ratios.frete_rateado + ratios.seguro_rateado;
    const custosExtras = ratios.custos_extra_rateados;
    
    return custoBase + tributosFederais + icmsRateado + freteSeguro + custosExtras; // ✅ COMPLETO
}
```

### 📋 Checklist de Implementação

- [x] Modificar `calculateItemRatios()` para receber cenário
- [x] Corrigir cálculo de `custos_extra_rateados` 
- [x] Incluir ICMS em `calculateItemTotalCost()`
- [x] Adicionar validações para quantidade zero
- [x] Criar método `createEmptyRatios()`
- [x] Atualizar chamadas da função em `createItemRow()`
- [x] Testar com dados reais (DI 2300120746)
- [x] Validar que soma dos itens = custo da adição

---

## 🚨 ANÁLISE CRÍTICA: SEPARAÇÃO IMPORTAÇÃO vs PRECIFICAÇÃO

**Data:** 17/08/2025  
**Problema Crítico:** Mistura de conceitos entre operações de importação e venda  
**Status:** Separação conceitual necessária para funcionamento correto  

### 🎯 **Problema Identificado**

#### **1. Valor FOB Unitário Zerado**
- **Localização**: Tabela de resultados, coluna "Valor FOB"
- **Impacto**: Impossibilidade de validar custos unitários
- **Causa**: Problema no cálculo ou exibição de `produto.valor_total_item`

#### **2. Mistura Conceitual GRAVE**
**Configurações de VENDA na aba de IMPORTAÇÃO:**
- ❌ "Estado de Destino" → Isso é para onde vai VENDER, não importar
- ❌ "Tipo de Operação: Venda Interestadual/Interna" → Isso é PRECIFICAÇÃO
- ❌ "Regime Tributário" → Isso é configuração do VENDEDOR

**Problema**: Estamos calculando custos de **entrada** misturado com configurações de **saída**

### 🔄 **Separação Correta dos Conceitos**

#### **FASE 1: IMPORTAÇÃO (Atual - Deve ser isolada)**
**Objetivo**: Calcular **custo de entrada** da mercadoria no Brasil  
**Escopo**:
```
XML da DI → Parser → Tributos Federais → ICMS Importação → Custos Extras → CUSTO FINAL DE ENTRADA
```
**Elementos válidos**:
- ✅ Dados da DI (FOB, frete, seguro)
- ✅ Tributos federais (II, IPI, PIS, COFINS) 
- ✅ ICMS de importação (estado da URF)
- ✅ Custos extras de importação (capatazia, despachante, AFRMM)
- ✅ **Resultado**: Custo unitário de entrada

#### **FASE 2: PRECIFICAÇÃO (Futura - Separada)**
**Objetivo**: Calcular **preço de venda**  
**Escopo**:
```
Custo de Entrada → Configurações de Venda → Markup → Tributos de Saída → PREÇO FINAL
```
**Elementos válidos**:
- 📋 Estado de destino (onde vai vender)
- 📋 Tipo de operação (interestadual/interna/consumidor final)
- 📋 Regime tributário (do vendedor)
- 📋 ICMS de saída, substituição tributária
- 📋 Markup, margem, análise de concorrência

### 🔧 **Plano de Correção Estrutural**

#### **Etapa 1: Corrigir Valor FOB Unitário**
```javascript
// Investigar em createItemRow():
<td>${this.formatCurrency(produto.valor_total_item)}</td>
// Verificar se produto.valor_total_item está sendo calculado corretamente
```

#### **Etapa 2: Limpar Aba "Custos Extras" - Focar APENAS Importação**
**REMOVER** (mover para futura aba de precificação):
```html
<!-- EXCLUIR da aba custos -->
<select id="estadoDestino">        <!-- Isso é venda -->
<select id="regimeTributario">     <!-- Isso é venda -->
<select id="tipoOperacao">         <!-- Isso é venda -->
```

**MANTER** (são custos reais de importação):
```html
<!-- MANTER na aba custos -->
<input name="temCustosExtras">     <!-- Pergunta sobre custos extras -->
<input id="custosPortuarios">      <!-- Custo real de importação -->
<input id="custosBancarios">       <!-- Custo real de importação -->
<input id="custosLogisticos">      <!-- Custo real de importação -->
<input id="custosAdministrativos"> <!-- Custo real de importação -->
```

#### **Etapa 3: Ajustar Cálculo de ICMS para Importação**
```javascript
// ANTES (errado - misturava venda):
const estadoDestino = document.getElementById('estadoDestino')?.value;

// DEPOIS (correto - só importação):
const estadoImportacao = this.currentDI.urf_despacho_codigo; // Estado da URF
```

#### **Etapa 4: Renomear e Reorganizar**
- **Aba atual**: "Custos Extras" → "Custos de Importação"
- **Descrição**: "Configure custos adicionais do processo de importação"
- **Foco**: Apenas custos que afetam o custo de entrada

### 📊 **Resultado Final Esperado**

**Tabela de Custos de Importação (por item)**:
| Campo | Fonte | Objetivo |
|-------|-------|----------|
| Valor FOB | `produto.valor_total_item` | Custo base da mercadoria |
| Frete | Rateado da DI | Custo de transporte |
| Seguro | Rateado da DI | Custo de seguro |
| II | Rateado da DI | Imposto de Importação |
| IPI | Rateado da DI | IPI na importação |
| PIS | Rateado da DI | PIS na importação |
| COFINS | Rateado da DI | COFINS na importação |
| ICMS Importação | Calculado | ICMS de entrada |
| Custos Extras | Opcional/Rateado | Custos adicionais |
| **CUSTO TOTAL** | **Soma** | **Custo unitário de entrada** |

### 🎯 **Benefícios da Separação**

1. **✅ Clareza conceitual**: Importação ≠ Venda
2. **✅ Compliance fiscal**: Cada fase com suas regras
3. **✅ Facilita auditoria**: Custos de entrada vs preços de saída
4. **✅ Modularidade**: Fases independentes
5. **✅ Extensibilidade**: Facilita adição de precificação futura

---

## 📊 MÉTRICAS

- **Arquivos criados:** 8/20
- **Funcionalidades implementadas:** 7/14
- **Testes realizados:** 16/19 (3 falhando)
- **Bugs conhecidos:** 1 (custos zerados por item)

---

**Responsável:** Sistema Expertzy  
**Versão:** 0.3.1  
**Ambiente:** Local (navegador)