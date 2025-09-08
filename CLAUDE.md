# CLAUDE.md

Este arquivo fornece orientações ao Claude Code para trabalho com código neste repositório.

## Visão Geral do Projeto

Sistema brasileiro de tributação e precificação de importação (Sistema de Importação e Precificação Expertzy) para processar arquivos XML de Declarações de Importação (DI), calcular impostos de importação e otimizar estratégias de precificação com incentivos fiscais em diferentes estados brasileiros.

## Sistema de Produção Atual

### **Arquitetura de Duas Fases** (JavaScript)

**Localização**: `sistema-expertzy-local/`

**Fase 1: Processador de Conformidade DI** (`/di-processing/`) ✅ **TOTALMENTE FUNCIONAL**
- ✅ Exibição completa de dados DI com múltiplas adições
- ✅ Formatação brasileira (R$ 33.112,20)
- ✅ Upload de XML via drag & drop
- ✅ Cálculos de impostos usando dados extraídos da DI
- ✅ Funções de exportação (Excel, PDF, JSON)

**Fase 2: Sistema de Estratégia de Precificação** (`/pricing-strategy/`)
- Análise de precificação multi-cenário
- Otimização de incentivos fiscais por estado
- Interface focada em negócios (tema verde)

### **Protótipo Python Legado**
- Interface GUI usando Tkinter
- Motor de cálculo de impostos (ICMS, IPI, PIS, COFINS, II)
- Análise de incentivos fiscais para estados (GO, SC, ES, MG)

## Estrutura de Diretórios

```
/sistema-expertzy-local/
├── index.html                    # Página inicial com navegação
├── di-processing/                # FASE 1: Sistema de Conformidade
│   ├── di-processor.html         # Interface de processamento DI
│   └── js/
│       ├── DIProcessor.js        # Parser XML
│       ├── ComplianceCalculator.js  # Cálculos de impostos
│       └── di-interface.js       # Lógica da UI
├── pricing-strategy/             # FASE 2: Sistema de Negócios  
│   └── pricing-system.html      # Interface de precificação
├── shared/                       # Recursos compartilhados
│   ├── css/                      # Temas e estilos
│   ├── js/                       # Módulos compartilhados
│   └── data/                     # Configurações JSON
└── samples/                      # Arquivos XML de teste
```

## Regras de Processamento de Dados

### **Princípio de Centralização XMLParser.js**
- XMLParser.js é a ÚNICA FONTE DE VERDADE para processamento de dados DI
- NENHUM outro módulo deve realizar conversões ou cálculos em dados DI
- Módulos consumidores devem APENAS consumir dados processados

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
# Sistema principal
open sistema-expertzy-local/index.html

# Processador DI diretamente  
open sistema-expertzy-local/di-processing/di-processor.html
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
| DIProcessor.js | Dados DI | `this.diData` | 1 |
| DIProcessor.js | Totais Extraídos | `this.diData.totais.tributos_totais.*` | 1.5 |
| di-interface.js | DI Global | `currentDI` | 2 |
| di-interface.js | Config ICMS | `window.icmsConfig` | 2.5 |
| ComplianceCalculator.js | Cálculo | `this.lastCalculation` | 3 |
| ComplianceCalculator.js | Produtos Individuais | `produtos_individuais[]` | 3.5 |
| exportCroquiNF.js | Export Cálculo | `this.calculos` | 4 |
| ExcelExporter.js | Export Excel | `this.calculationData` | 4 |

## Debugging

Use ferramentas dev do browser e janela de log integrada. A aplicação fornece logging extensivo através da classe Logger.

---

*Este arquivo foi otimizado para performance, mantendo apenas informações essenciais para desenvolvimento ativo.*