# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brazilian import taxation and pricing system (Sistema de Importação e Precificação Expertzy) designed to process XML files from Import Declarations (DI - Declaração de Importação), calculate import taxes, and optimize pricing strategies with fiscal incentives across different Brazilian states.

## Current Implementation

### **Production Web System** (JavaScript-based)

Located at `sistema-expertzy-local/` - **Two-phase architecture** with fully functional DI processing:

**Phase 1: DI Compliance Processor** (`/di-processing/`) ✅ **FULLY FUNCTIONAL**

- ✅ **Complete DI data display**: Shows correct DI number, incoterm, all additions
- ✅ **Multiple additions support**: Interactive table with 16+ additions, detail modals
- ✅ **Brazilian formatting**: Currency (R$ 33.112,20), numbers (1.234,56)
- ✅ **Real export functions**: Excel, PDF croqui, JSON, calculation memory
- ✅ **Drag & drop XML upload** with visual feedback and validation
- ✅ **DIProcessor.js**: Proven legacy parsing with correct field naming
- ✅ **ComplianceCalculator.js**: DI-extracted tax rates (POP compliant)
- ✅ **Real-time expense preview** and ICMS impact calculation
- ✅ **ICMS Goiás = 19%** (corrected from 17% fallback)
- ✅ **Automatic SISCOMEX, AFRMM, capatazia** extraction from DI
- ✅ **Manual extra expenses** with ICMS base classification
- ✅ **Legacy system parity**: All core functionality replicated

**Phase 2: Pricing Strategy System** (`/pricing-strategy/`)

- Multi-scenario pricing analysis (planned)
- State-specific fiscal incentive optimization
- Business-focused interface (green theme)

### **Legacy Python Prototype**

Python prototype at `orientacoes/importador-xml-di-nf-entrada-perplexity-aprimorado-venda.py`:

- GUI interface using Tkinter
- XML parsing for DI documents
- Tax calculation engine (ICMS, IPI, PIS, COFINS, II)
- Fiscal incentive analysis for states (GO, SC, ES, MG)
- Excel export functionality

## Recent Critical Fixes (2025-09-05)

### **🔗 Complete Phase Integration: Cross-System Data Bridge Architecture**

**Latest Fix (2025-09-05)**: Resolução completa da integração entre Fase 1 (Compliance) e Fase 2 (Precificação) com validação rigorosa e zero fallbacks

**Problema Resolvido**:

- ❌ **Sistema procurava DI processada mas dados não eram encontrados** → ✅ **Integração completa entre fases**
- ❌ **Dados salvos apenas no final dos cálculos** → ✅ **Salvamento imediato após processamento XML**
- ❌ **Validação fraca com fallbacks** → ✅ **Validação rigorosa fail-fast com orientação específica**
- ❌ **localStorage como fallback** → ✅ **localStorage como sistema principal de integração**

**Implementação Técnica**:

**1. Salvamento no Momento Correto**:
- **Local**: `di-interface.js` → `processarDI()` linha 205
- **Timing**: Imediatamente após `diProcessor.parseXML(xmlContent)`
- **Função**: `salvarDIParaIntegracao()` salva dados básicos + XML preservado
- **Update**: `ComplianceCalculator.atualizarDISalvaComCalculos()` após cálculo impostos

**2. Validação Rigorosa Fase 2**:
- **Local**: `business-interface.js` → `checkForLoadedDI()` renovada
- **Estados**: NENHUMA_DI, DADOS_CORROMPIDOS, ESTRUTURA_INVALIDA, FASE1_INCOMPLETA
- **Validação**: JSON structure, metadata, produtos, impostos calculados, integridade
- **NO FALLBACKS**: Falha explícita com orientação específica para usuário

**3. Botão Integração com Pré-requisitos**:
- **Local**: `di-interface.js` → `prepararParaPrecificacao()` linha 1342
- **Validação**: 5 etapas rigorosas (DI, impostos, produtos, câmbio, valores)
- **Feedback**: Confirmação detalhada antes transição
- **Integridade**: Verificação localStorage vs currentDI

**Fluxo de Integração - NO FALLBACKS**:

```javascript
// 1. Upload XML → Processamento → Salvamento IMEDIATO
processarDI() → diProcessor.parseXML() → salvarDIParaIntegracao() ✅

// 2. Cálculo Impostos → Atualização dados localStorage
calcularImpostos() → ComplianceCalculator → atualizarDISalvaComCalculos() ✅

// 3. Transição → Validação rigorosa → Precificação
prepararParaPrecificacao() → validarPreRequisitosIntegracao() → redirect ✅

// 4. Sistema Precificação → Validação entrada → Dados ou erro específico  
checkForLoadedDI() → validarEstruturaDICarregada() → sucesso/erro ✅
```

**Arquivos Modificados**:

- `di-processing/js/di-interface.js` → Salvamento imediato + botão validação
- `di-processing/js/ComplianceCalculator.js` → Atualização dados com cálculos
- `pricing-strategy/js/business-interface.js` → Validação rigorosa entrada

**Business Impact**: Integração perfeita entre fases eliminando "DI não encontrada" - usuários transitam seamlessly do compliance para precificação com dados sempre disponíveis.

### **🧠 Advanced Memory System: Regime-Based Cost Calculation Architecture**

**Previous Fix (2025-09-05)**: Implementação completa de sistema de memória com cálculo de custos por regime tributário - arquitetura database-ready com zero fallbacks

**Sistema Implementado**:

- ✅ **ProductMemoryManager.js**: Sistema de memória para produtos importados com estrutura database-ready
- ✅ **RegimeConfigManager.js**: Gerenciamento de regime tributário (Lucro Real, Lucro Presumido, Simples Nacional)
- ✅ **CostCalculationEngine.js**: Motor de cálculo que aplica créditos tributários baseado no regime da empresa
- ✅ **Interface de configuração**: HTML + JS completo para configuração de regime tributário
- ✅ **Integração completa**: PricingEngine atualizado para usar sistema de custos por regime
- ✅ **Zero fallbacks**: Eliminados todos os padrões `|| 0` e `|| code` dos métodos críticos

**Cálculo Inteligente por Regime**:

```javascript
// Lucro Real: Créditos PIS/COFINS não-cumulativo + IPI (indústria) + ICMS
// Lucro Presumido: Créditos ICMS + IPI (indústria), PIS/COFINS cumulativo
// Simples Nacional: Sem créditos, DAS unificado
```

**Arquivos Criados**:

- `shared/js/ProductMemoryManager.js` → Sistema de memória JSON database-ready
- `shared/js/RegimeConfigManager.js` → Configuração de regime com carregamento dinâmico
- `shared/js/CostCalculationEngine.js` → Motor de cálculo com fail-fast validation
- `shared/data/regime-aliquotas.json` → Alíquotas por regime (eliminado hardcode)
- `shared/data/estados-brasil.json` → Todos os 27 estados + DF (eliminado hardcode)
- `js/regime-interface.js` → Interface completa para configuração

**Arquivos Modificados**:

- `di-processing/js/ComplianceCalculator.js` → Integrado com ProductMemoryManager
- `pricing-strategy/js/PricingEngine.js` → Métodos auxiliares corrigidos, duplicatas removidas
- `pricing-strategy/js/business-interface.js` → Carregamento dinâmico de estados
- `pricing-strategy/pricing-system.html` → Select de estados dinâmico

**Technical Excellence**:

- **Database-Ready JSON Structure**: Produtos salvos com ID, base costs, special cases
- **Fail-Fast Validation**: Todos os métodos críticos lançam exceções explícitas
- **Zero Hardcoded Data**: Estados, alíquotas, preços - tudo carregado de arquivos JSON
- **Regime-Based Logic**: Créditos aplicados conforme regime tributário da empresa

**Business Impact**: Sistema agora calcula custo líquido real considerando regime tributário, eliminando estimativas e fornecendo precificação precisa baseada na situação fiscal da empresa.

## Previous Critical Fixes (2025-09-04)

### **🔧 Modular Export System: Eliminação de Dependências Legadas**

**Previous Fix (2025-09-04)**: Implementação de sistema modular de export e eliminação completa de dependências do sistema legado

**Problemas Resolvidos**:

- ❌ **Excel export falhando**: "Sistema não inicializado" em globals.js → ✅ **ExcelExporter.js especializado**
- ❌ **Dependência window.app legado** → ✅ **Sistema totalmente modular sem globals.js**
- ❌ **ICMS GO = 17% incorreto** em PricingEngine → ✅ **19% correto via aliquotas.json**
- ❌ **AFRMM 25% hardcoded** → ✅ **Taxa configurável em import-fees.json**
- ❌ **73+ fallbacks fiscais problemáticos** → ✅ **Fail-fast com validação explícita**

**Implementações Técnicas**:

- **ExcelExporter.js**: Módulo especializado para planilhas de custo com formatação brasileira
- **ExportManager.js**: Coordenador de exports (Excel, PDF, JSON) com validação unificada  
- **ConfigLoader.js**: Carregador simples para configurações que mudam com legislação
- **import-fees.json**: Centralizou SISCOMEX, AFRMM e outras taxas de importação
- **Eliminação completa**: 73+ fallbacks `|| 0` removidos dos cálculos fiscais

**Arquivos Criados/Modificados**:

- `di-processing/js/ExcelExporter.js` → Novo módulo especializado para Excel
- `di-processing/js/ExportManager.js` → Novo coordenador de exports  
- `shared/js/ConfigLoader.js` → Novo carregador de configurações
- `shared/data/import-fees.json` → Novas taxas de importação configuráveis
- `shared/js/globals.js` → **REMOVIDO** (eliminada dependência legada)
- `pricing-strategy/js/PricingEngine.js` → Corrigido para usar aliquotas.json
- `di-processing/js/DIProcessor.js` → AFRMM agora configurável
- Multiple files → Fallbacks fiscais eliminados

**Princípio KISS Aplicado**:

- **Centralizados apenas**: Dados que mudam com legislação (alíquotas, taxas)
- **Mantidos no código**: Fórmulas, conversões, lógica de negócio (já funcionam)
- **Sistema modular**: Cada export tem módulo especializado
- **Zero dependências legadas**: Eliminado window.app e globals.js completamente

**Business Impact**: Excel export agora funciona com dados reais da DI, alíquotas corretas e sistema 100% modular sem dependências legadas.

## Previous Critical Fixes (2025-09-02)

### **💾 Advanced Data Management System: File-Based Workflow Implementation**

**Previous Fix (2025-09-02)**: Complete implementation of file-based data management with workflow continuity

**New Features Implemented**:

- ✅ **File-Based Saving**: Save complete DI work as `.expertzy.json` files on user's computer
- ✅ **Workflow Continuity**: Load saved files to continue exactly where you left off
- ✅ **Step 1 Redesign**: Two clear options - "Nova Importação" OR "Continuar Trabalho"
- ✅ **Integration Ready**: Automatic data preparation for pricing phase
- ✅ **Complete Data Preservation**: XML content, DI data, calculations, and metadata all saved

**Technical Implementation**:

- **File Format**: `.expertzy.json` contains full project state (DI data + calculations + XML base64)
- **Step 1 Interface**: Card-based layout with upload zone and file recovery option
- **Data Flow**: XML → Process → Calculate → Save (.expertzy) → Continue to Pricing
- **Error Resolution**: Fixed missing `fileType` element causing "Processar DI" button to disappear
- **Smart Navigation**: Loaded files go directly to appropriate step (Step 2 or 3) based on completion state

**Files Updated**:

- `di-processing/di-processor.html` → New Step 1 interface with dual options and restored fileType element
- `di-processing/js/di-interface.js` → File-based save/load functions replacing localStorage approach
- `shared/js/storage.js` → Extended with snapshot management for backward compatibility
- `di-processing/css/compliance-theme.css` → New styling for option cards and upload areas

**User Benefits**:

- **Portability**: Work files can be shared, backed up, and moved between computers
- **Flexibility**: Stop and resume work at any time without losing progress
- **Integration**: Seamless transition to pricing phase with all data preserved
- **Audit Trail**: Complete processing history saved in human-readable JSON format

**Business Impact**: Users can now work on DI processing in stages, save their progress, and seamlessly transition to the pricing optimization phase without data loss or reprocessing.

## Previous Critical Fixes (2025-09-01)

### **🔧 TypeError Fixes: Complete Data Structure Standardization**

**Previous Fix (2025-09-01)**: Complete resolution of TypeError issues in calculation objects and export functions

**Problems Solved**:

- ❌ **TypeError: calculation.despesas is undefined** → ✅ **Despesas structure** correctly passed to export functions
- ❌ **TypeError: p.valor_unitario is undefined** → ✅ **Property names standardized** across all modules
- ❌ **Error: Alíquota ICMS não encontrada para NCM** → ✅ **State-based ICMS rates** from DI importer address
- ❌ **Missing consolidated fields** → ✅ **Complete calculation object** with peso_liquido, taxa_cambio, ncm, custo_por_kg

**Technical Implementation**:

- **State Extraction**: Estado obtained from `di.importador.endereco_uf` instead of hardcoded 'GO'
- **Data Flow**: `despesasConsolidadas` properly passed through `consolidarTotaisDI()` method
- **Property Standardization**: `valor_unitario_reais` → `valor_unitario` for consistency
- **Field Completeness**: Added missing fields to consolidated calculation object
- **Fallback Removal**: Eliminated unnecessary fallback for products (all DIs have products)

**Files Updated**:

- `di-processing/js/di-interface.js` → State extraction and proper data passing
- `di-processing/js/ComplianceCalculator.js` → Complete consolidated object structure
- `shared/js/exportCroquiNF.js` → Property name standardization and robust error handling

**Commit**: `f4dfb2d` - Complete TypeError resolution with standardized data structures

## Previous Critical Fixes (2025-08-29)

### **🎨 Visual Interface Standardization: Complete Expertzy Brand Implementation**

**Latest Fix (2025-08-29)**: Complete visual standardization across all interfaces using Expertzy brand identity

**Problems Solved**:

- ❌ **Inconsistent navbar**: Different styling across pages → ✅ **Unified navbar** with navy background and white logo background
- ❌ **Simple gradients**: Basic 2-color headers → ✅ **Professional gradients** with SVG decorative overlay
- ❌ **Poor typography**: Small fonts, low contrast → ✅ **Consistent hierarchy** (3rem H1, 1.5rem lead, proper contrast)
- ❌ **Scattered CSS**: Duplicate files in multiple directories → ✅ **Clean architecture** with shared/css/ as single source
- ❌ **Low-impact headers**: Short headers with poor visual presence → ✅ **Majestic headers** with 50vh min-height

**Technical Implementation**:

- **CSS Architecture**: Consolidated all brand CSS into `shared/css/` directory structure
- **Gradient Unification**: Applied same `linear-gradient(135deg, navy → #0d1a3d)` + SVG overlay across all pages
- **Logo Enhancement**: Added white background container with rounded corners and hover effects
- **Typography Standardization**: Consistent font sizes and colors for optimal readability on dark backgrounds
- **Navbar Consistency**: Identical navigation styling matching landing page across all interfaces

**Files Updated**:

- `sistema-expertzy-local/index.html` → Updated CSS references to shared directory
- `sistema-expertzy-local/di-processing/css/compliance-theme.css` → Complete overhaul with Expertzy branding
- `sistema-expertzy-local/pricing-strategy/css/business-theme.css` → Complete overhaul with Expertzy branding
- Removed duplicate CSS files and consolidated architecture

**Visual Result**: All three interfaces (index.html, di-processor.html, pricing-system.html) now maintain 100% visual consistency with professional Expertzy branding, differentiated only by button colors for UX clarity.

### **🎯 Currency Formatting Fix: Complete Brazilian Standards Implementation**

**Latest Fix (2025-08-29)**: Comprehensive currency formatting corrections throughout the interface

**Problems Solved**:

- ❌ USD values showing "Valor USD: R$ 6.346,13" → ✅ Shows **"Valor USD: $6,346.13"** (USD symbol only)
- ❌ Preview sections using periods: "R$ 112998.65" → ✅ **Brazilian commas: "R$ 112.998,65"**
- ❌ Inconsistent formatting across interface → ✅ **All currency displays use formatCurrency()**
- ❌ Mixed currency symbols and formats → ✅ **Proper USD ($) vs BRL (R$) distinction**

**Technical Implementation**:

- **Lines 506-509**: Fixed preview sections to use `formatCurrency()` instead of `.toFixed(2)`
- **Lines 443-664**: Applied Brazilian formatting to all currency displays in interface
- **Multi-currency support**: USD shows "$", BRL shows "R$" with proper decimal separators
- **Complete consistency**: All monetary values throughout system use standardized formatting

### **🎯 KISS Implementation: Replicating Legacy System Functionality**

**Previous Major Fix**: "Keep It Simple, Stupid" - copied exactly what **ALREADY WORKED** in the legacy system

**Problems Solved**:

- ❌ DI showing "Número: N/A, Incoterm: N/A" → ✅ Shows **"DI 2300120746, Incoterm: CFR"**
- ❌ Incorrect CIF value from unknown source → ✅ **Correct total from all additions**
- ❌ Only first addition displayed → ✅ **All 16 additions** in interactive table
- ❌ Export functions showing placeholders → ✅ **Real Excel/PDF/JSON exports**
- ❌ Poor number formatting → ✅ **Brazilian format: R$ 33.112,20**

### **✅ Implementation Details (5 Phases)**

**PHASE 1: Field Name Standardization**

- Fixed `di_numero` → `numero_di` (matching legacy)  
- Fixed `incoterm?.codigo` → `incoterm_identificado?.codigo` (matching DIProcessor)

**PHASE 2: Legacy updateDIInfo() Replication**

- Implemented `updateDIInfo()` function copying exact legacy behavior
- Added DI summary display at top of Step 2
- Brazilian currency formatting with `formatCurrency()`

**PHASE 3: Multiple Additions Support**

- `populateAllAdditions()`: Table showing all DI additions
- `viewAdicaoDetails()`: Modal with detailed addition view (taxes, products, supplier)
- Interactive navigation between additions (legacy-style buttons)

**PHASE 4: Export Functions Activation** 

- Connected to legacy export scripts: `exportCroquiNF.js`, `globals.js`
- Real export functions (not placeholders):
  - Excel: via SheetJS integration
  - PDF: via jsPDF + legacy croqui system
  - JSON: native JavaScript implementation
- Proper error handling and user feedback

**PHASE 5: Brazilian Number Formatting**

- `formatCurrency()`: R$ 33.112,20 (pt-BR locale)
- `formatNumber()`: 1.234,56 formatting
- Applied throughout interface

### **🔧 Previous Tax Calculation Fix (2025-08-28)**

**Problem**: ComplianceCalculator was using non-existent JSON configurations instead of DI-extracted values
**Solution**: Implemented POP compliance - **"alíquotas devem ser extraídas da DI nesta etapa"**

**Fixed**:

- ✅ **PIS**: Uses `adicao.tributos.pis_aliquota_ad_valorem` + `pis_valor_devido`
- ✅ **COFINS**: Uses `adicao.tributos.cofins_aliquota_ad_valorem` + `cofins_valor_devido`
- ✅ **II**: Uses `adicao.tributos.ii_aliquota_ad_valorem` + `ii_valor_devido`
- ✅ **IPI**: Uses `adicao.tributos.ipi_aliquota_ad_valorem` + `ipi_valor_devido`
- ✅ **ICMS**: Uses `aliquotas_icms_2025[estado].aliquota_interna` (GO = 19%)

**Eliminated**:

- ❌ Fallback configurations with incorrect values
- ❌ Validation errors with zero tax rates
- ❌ "Configuração PIS não carregada" errors
- ❌ ICMS Goiás 17% fallback (now correctly 19%)
- ❌ Redundant tax recalculations

### **🏆 Current System Status**

**DI Compliance Processor** is now **production-ready** with:

- ✅ Complete DI data extraction and display
- ✅ All 16 additions viewable with detailed breakdowns
- ✅ Correct tax calculations using DI values
- ✅ Brazilian formatting standards  
- ✅ Functional export capabilities
- ✅ Legacy system parity achieved

**Key Commits**:

- `a5b618d` - KISS implementation replicating legacy functionality
- `419824f` - Tax validation fixes for zero values
- `4974771` - Tax calculation using DI-extracted values
  
  ## Key Commands

### Running the Web System

```bash
# Open the main system
open sistema-expertzy-local/index.html

# Or directly access DI processor
open sistema-expertzy-local/di-processing/di-processor.html
```

### Running the Legacy Python Prototype

```bash
python orientacoes/importador-xml-di-nf-entrada-perplexity-aprimorado-venda.py
```

### Serena MCP Analysis

```bash
# Global Serena MCP access (configured)
uvx --python 3.11 --from git+https://github.com/oraios/serena.git serena --help
```

### Python Dependencies (Legacy)

The prototype requires these packages (no requirements.txt exists yet):

- tkinter (usually included with Python)
- pandas
- openpyxl (for Excel export)
- xml.etree.ElementTree (standard library)

## Architecture and Structure

### **Current Directory Structure**

```
/sistema-expertzy-local/
├── index.html                    # Landing page with navigation
├── di-processing/                # PHASE 1: Compliance System
│   ├── di-processor.html         # DI processing interface (blue theme)
│   └── js/
│       ├── DIProcessor.js        # XML parser (legacy xmlParser.js)
│       ├── ComplianceCalculator.js  # Tax calculations using DI data
│       └── di-interface.js       # UI logic with drag & drop
├── pricing-strategy/             # PHASE 2: Business System
│   └── pricing-system.html      # Pricing interface (green theme)
├── shared/                       # Common resources
│   ├── css/
│   │   ├── expertzy-brand.css    # Brand identity system
│   │   ├── compliance-theme.css  # Blue compliance theme
│   │   └── business-theme.css    # Green business theme
│   └── data/
│       ├── aliquotas.json        # Tax rates by state
│       ├── beneficios.json       # Fiscal incentives
│       └── config.json           # System configuration
├── samples/                      # XML test files
└── legacy/                       # Original sistema-importacao.html
```

### **Data Processing Architecture**

**KISS Principle Applied** - Single source of truth for DI data:

```
DI (XML) → DIProcessor.js → ComplianceCalculator.js → Interface
   ↓
✅ Extract real tax rates from SISCOMEX data
✅ Use actual values (not JSON fallbacks)  
✅ Conform to POP: "alíquotas extraídas da DI"
```

### **Tax Calculation Flow**

1. **DIProcessor.js**: Extracts all tax rates and values from DI XML
2. **ComplianceCalculator.js**: Uses extracted values (not recalculates)
3. **ICMS Only**: Uses JSON configuration (by state) for ICMS rates
4. **All Federal Taxes**: PIS, COFINS, II, IPI from DI directly

### **Import Expenses Management**

**Current System (Functional)**:

- ✅ **Automatic DI Processing**: SISCOMEX, AFRMM, capatazia extraction
- ✅ **Manual Extra Expenses**: Storage, transport, customs agent
- ✅ **ICMS Classification**: Mark expenses as taxable or cost-only
- ✅ **Real-time Preview**: Show ICMS impact before applying

**ICMS Tax Base Formula**:

```
Base ICMS = (CIF + II + IPI + PIS + COFINS + DI Expenses + Extra Taxable Expenses) / (1 - ICMS rate)
```

```
## Tax Calculation Logic

The system handles Brazilian import taxes with specific rules:

1. **Base Taxes**:
   - II (Import Tax): Variable rate on CIF value
   - IPI: Calculated on (CIF + II)
   - PIS/COFINS: 11.75% combined on CIF value
   - ICMS: State-specific rates with ST (tax substitution)

2. **Fiscal Incentives by State**:
   - **Goiás (GO)**: 67% ICMS credit for specific NCMs
   - **Santa Catarina (SC)**: 75% deferred ICMS (TTD 060)
   - **Espírito Santo (ES)**: FUNDAP benefits with 9% effective rate
   - **Minas Gerais (MG)**: Standard calculation without special benefits

3. **Critical NCM Codes with Benefits**:
   - Electronics: 8517.62.*, 8517.70.*
   - Medical equipment: 9018.*
   - Industrial machinery: Various chapter 84 codes

## Sample Data

- XML Import Declaration: `orientacoes/2300120746.xml`
- Excel templates in `orientacoes/` directory
- Reference PDFs with tax legislation

## Important Business Rules

1. **Customer Segments**: Different pricing for final consumers vs resellers
2. **Markup Calculation**: Based on total landed cost including all taxes
3. **State-Specific Logic**: Each state has unique fiscal benefits requiring separate calculation paths
4. **XML Parsing**: Must handle Brazilian DI (Declaração de Importação) format with additions (adições)
<<<<<<< HEAD
5. **Import Expenses Management**: System must handle both automatic DI expenses and manual extra expenses, with proper ICMS tax base calculation

## Development Notes

- Git repository initialized and active
- JavaScript-based web application currently in development
- Tax rates and incentives loaded from JSON configuration files
- XMLParser.js serves as single source of truth for DI data processing
- Extensive documentation exists in `documentos/` directory for implementation guidance

### Recent Updates (2025-08-27)

**🚨 CRITICAL ARCHITECTURAL RESTRUCTURE - IN PROGRESS**
- **Problem Identified**: System mixing DI processing (compliance) with pricing (business strategy)
- **Root Cause**: Interface confusion, technical issues with SISCOMEX inclusion, excessive recalculations
- **Solution**: Complete separation into two distinct phases

**🔧 NEW ARCHITECTURE: Two-Phase System**

### **PHASE 1: DI Compliance Processor**
**Purpose**: Handle mandatory import compliance activities
**Location**: `/di-processing/`

**Core Modules:**
- `DIProcessor.js` - Pure DI data extraction and validation
- `ComplianceCalculator.js` - Fiscal calculations (II, IPI, PIS, COFINS, ICMS)
- `di-processor.html` - Compliance-focused interface (blue theme)

**Workflow:**
1. **Upload & Validate**: XML DI processing
2. **Extract Automatically**: SISCOMEX, AFRMM, capatazia from DI
3. **Configure Extras**: Additional expenses with tax classification
4. **Calculate Taxes**: All import taxes with correct ICMS base
5. **Export Compliance**: Official cost analysis and tax reports

**Key Features:**
- ✅ Correct SISCOMEX inclusion in ICMS tax base
- ✅ Single consolidation (no 6x recalculations)
- ✅ Clean separation of concerns
- ✅ Compliance-focused UX

### **PHASE 2: Pricing Strategy System** 
**Purpose**: Business optimization and pricing analysis (optional)
**Location**: `/pricing-strategy/`

**Core Modules:**
- `PricingEngine.js` - Multi-scenario pricing analysis
- `ScenarioAnalysis.js` - State comparisons and fiscal benefits
- `pricing-system.html` - Business-focused interface (green theme)

**Workflow:**
1. **Import DI Data**: Load processed compliance data (read-only)
2. **Configure Scenarios**: Multiple states, customer types, margins
3. **Analyze Benefits**: GO, SC, ES, MG fiscal incentives
4. **Optimize Pricing**: Competitive pricing strategies
5. **Export Strategy**: Business reports and pricing recommendations

**Key Features:**
- ✅ Separated from compliance concerns
- ✅ Multiple scenario analysis
- ✅ State-specific optimization
- ✅ Business-focused UX

### **🏗️ Directory Structure (NEW)**

**IMPORTANT: Landing Page vs. Functional System Separation**
- **`index.html`**: Landing page ONLY - marketing/presentation interface
- **Functional Systems**: Located in dedicated phase directories
- **No mixing**: Landing page does not contain system functionality
```

/sistema-expertzy-local/
├── index.html                  # LANDING PAGE ONLY (marketing/navigation)
├── di-processing/              # PHASE 1: Compliance System
│   ├── di-processor.html       # Functional DI processing system
│   ├── js/
│   │   ├── DIProcessor.js      # DI extraction only
│   │   ├── ComplianceCalculator.js  # Tax calculations only
│   │   └── di-interface.js     # Interface logic
│   └── css/
│       └── compliance-theme.css # Blue theme
├── pricing-strategy/           # PHASE 2: Business System
│   ├── pricing-system.html     # Functional pricing system
│   ├── js/
│   │   ├── PricingEngine.js    # Pricing scenarios
│   │   ├── ScenarioAnalysis.js # Multi-state analysis
│   │   └── business-interface.js # Interface logic
│   └── css/
│       └── business-theme.css  # Green theme
├── shared/                     # Common resources
│   ├── js/
│   │   ├── storage.js
│   │   ├── config.js
│   │   └── calculationMemory.js
│   ├── css/
│   │   └── shared.css
│   └── data/
└── legacy/                     # Original system (backup)
    └── sistema-importacao.html

```
**Navigation Flow:**
1. `index.html` → Landing page with links to phases
2. `di-processing/di-processor.html` → Full DI processing functionality
3. `pricing-strategy/pricing-system.html` → Full pricing functionality

### **🔧 Technical Fixes Implemented:**
- **SISCOMEX Integration**: Correctly included in ICMS tax base calculation
- **Performance**: Eliminated 6x repetitive ICMS calculations
- **Consolidation**: Single expense consolidation per configuration
- **Memory**: Clean calculation logging and memory management
- **Separation**: Distinct modules for compliance vs. business logic

### **📊 Business Impact:**
- **Clarity**: Clear separation between mandatory compliance and optional pricing
- **Efficiency**: Users access only what they need (compliance OR pricing)
- **Accuracy**: Correct tax calculations with proper SISCOMEX inclusion  
- **Productivity**: Focused workflows eliminate interface confusion
- **Compliance**: Dedicated compliance phase ensures regulatory accuracy

**Previous Implementation (DEPRECATED):**
- ~~Import Expenses System~~ → Now integrated in DI Compliance Processor
- ~~Single interface approach~~ → Replaced with two-phase architecture
- ~~Mixed compliance/business logic~~ → Completely separated

### Previous Updates (2025-08-26)

**Major Implementation: Standardized Currency Structure**
- **XMLParser.js**: Implemented standardized USD/BRL value structure with automatic exchange rate calculation
- **Product Data Structure**: All products now include both USD (original DI values) and BRL (converted values)
- **Exchange Rate**: Dynamically calculated from DI data (valor_reais / valor_moeda_negociacao)
- **Weight Conversions**: Fixed divisor (100000) for proper kg display (20000 → 0.2 kg)

**Interface Updates:**
- **app.js**: Updated product display to show both USD and BRL values separately
- **Currency Labels**: FOB values now clearly labeled as "USD" vs "R$" 
- **Product Values**: Display format now shows "USD: $4,468.20" and "BRL: R$ 24,096.10"

**Export Modules:**
- **exportCroquiNF.js**: Updated to prioritize BRL values for Brazilian fiscal documents
- **Compatibility**: Maintains fallback to USD-to-BRL conversion when BRL values unavailable

**Data Structure Example:**
```javascript
produto = {
    valor_unitario_usd: 4468.2,      // Original USD from DI
    valor_unitario_brl: 24096.1,     // Converted to BRL
    valor_total_usd: 893.64,         // Total USD
    valor_total_brl: 4819.22,        // Total BRL  
    taxa_cambio: 5.392797994718231   // Exchange rate used
}
```

## Data Processing Rules (MANDATORY)

**XMLParser.js Centralization Principle:**

- XMLParser.js is the SINGLE SOURCE OF TRUTH for all DI data processing
- NO other module should perform conversions, parsing, or calculations on DI data
- Consumer modules (Calculator, ExportCroqui, ExportNF, Storage) must ONLY consume processed data
- This prevents inconsistencies, unit conversion errors, and data discrepancies between modules
- Any DI-related data transformation MUST be implemented in XMLParser.js only

**Prohibited Actions in Consumer Modules:**

- Unit conversions (KG to MG, currency conversions)
- Mathematical operations on raw DI data
- Reprocessing of XML elements
- Custom parsing or data extraction
- Recalculation of values already processed by XMLParser

## CRITICAL: Zero Fallbacks Policy (KISS Enforcement)

### **NO FALLBACKS RULE - Effective 2025-09-01**

**MANDATORY: All fiscal/tax calculation modules MUST fail fast when data is missing**

**Prohibited Patterns:**

```javascript
// ❌ NEVER DO THIS IN FISCAL MODULES:
const aliquota = adicao.tributos?.ii_aliquota || 0;           // Masks missing data
const valor = produto.valor_unitario_brl || 5.39;            // Creates fake values  
const despesas = calculation.despesas?.total || 112505.09;   // Invented amounts
const taxa = adicao.taxa_cambio || 5.392800;                 // Hardcoded rates
const automaticas = despesasConsolidadas.automaticas?.total || 0; // Hides structure errors
```

**Required Pattern:**

```javascript
// ✅ ALWAYS DO THIS IN FISCAL MODULES:
const aliquota = adicao.tributos?.ii_aliquota;
if (aliquota === undefined) {
    throw new Error(`Alíquota II ausente na adição ${adicao.numero}`);
}

// ✅ VALIDATE DATA STRUCTURES:
if (!despesasConsolidadas.automaticas || typeof despesasConsolidadas.automaticas.total === 'undefined') {
    throw new Error('Estrutura de despesas automáticas inválida ou ausente');
}
```

**Scope:**

- ✅ **Apply to**: DIProcessor, ComplianceCalculator, ItemCalculator, exportCroquiNF
- ❌ **Exempt**: UX display modules (quantities can default to 1), localStorage, logs

**Expense Distribution Workflow (Bottom-Up):**

1. DIProcessor extracts total expenses from DI (e.g., SISCOMEX R$ 493.56)
2. ItemCalculator distributes expenses proportionally to EACH item
3. Each item's taxes are calculated INCLUDING its expense share
4. Items with expenses → Addition totals → DI totals (validation)
5. NO recalculation, NO fallbacks masking missing data

**Rationale**: Fallbacks in fiscal calculations create phantom values (like R$ 112.505,09) that don't exist in the source DI, violating fiscal compliance. The system must use ONLY real data from the DI.

## Important Coding Rules

### ⚠️ NEVER Use Fallbacks

- **NUNCA** use fallbacks que silenciosamente pulam etapas do fluxo
- **SEMPRE** lance exceções explícitas quando componentes obrigatórios não estão disponíveis
- **PROIBIDO** usar padrões como `if (!component) { return; }` ou `if (!component) { proceedToNextStep(); }`
- **OBRIGATÓRIO** falhar com mensagem de erro clara: `throw new Error('Component X não disponível - obrigatório para o fluxo')`
- **EVITE** duplicação de lógica entre módulos (ex: WorkflowOrchestrator vs CorrectionInterface)

## Debugging

Use browser dev tools and the built-in log window. The application provides extensive logging through the Logger class, with both console and UI output available.

## CRITICAL: Variable Naming Standards (Data Flow)

### **MANDATORY: Consistent Naming Across Modules**

**Variable Naming Table (Workflow Order):**

| **Module**                  | **Data Type**         | **Variable Name**           | **Access Pattern**                   | **Flow Order** |
| --------------------------- | --------------------- | --------------------------- | ------------------------------------ | -------------- |
| **DIProcessor.js**          | DI Data               | `this.diData`               | `diData.numero_di`                   | 1              |
| **di-interface.js**         | DI Global             | `currentDI`                 | `currentDI.numero_di`                | 2              |
| **ComplianceCalculator.js** | Calculation           | `this.lastCalculation`      | `calculo.impostos.ii`                | 3              |
| **di-interface.js**         | Calculation Global    | `window.currentCalculation` | `currentCalculation.despesas`        | 4              |
| **exportCroquiNF.js**       | Calculation Export    | `this.calculos`             | `this.calculos.despesas.automaticas` | 5              |
| **DIProcessor.js**          | Expenses              | `despesasConsolidadas`      | `despesas.automaticas.total`         | 3              |
| **ComplianceCalculator.js** | Expenses Proportional | `despesasAdicao`            | `despesas.automaticas.total`         | 3              |
| **ItemCalculator.js**       | Expenses Per Item     | `despesasAduaneiras`        | `despesas.total_despesas_aduaneiras` | 4              |

**NEVER MIX NAMES:**

- ❌ `this.calculation` vs `this.calculos` 
- ❌ `automaticas` vs `automaticas.total`
- ❌ Different property names for same data across modules

**First Module Defines Name**: The first module in workflow order that creates a data object defines its naming standard for all subsequent modules.

## Development Notes

- Git repository initialized and active
- JavaScript-based web application currently in development  
- Tax rates and incentives loaded from JSON configuration files
- XMLParser.js serves as single source of truth for DI data processing
- Extensive documentation exists in `documentos/` directory for implementation guidance
