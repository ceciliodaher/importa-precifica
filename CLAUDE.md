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

## Recent Critical Fixes (2025-08-29)

### **🎯 KISS Implementation: Replicating Legacy System Functionality**
**Approach**: "Keep It Simple, Stupid" - copied exactly what **ALREADY WORKED** in the legacy system

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
=======

## Development Notes

- No version control initialized yet (consider `git init`)
- No dependency management files exist (create `requirements.txt` for Python)
- Tax rates and incentives are hardcoded in the prototype
- The project is transitioning from Python prototype to PHP web application
- Extensive documentation exists in `documentos/` directory for implementation guidance
>>>>>>> 7d3bba78094df4422d2bd74265553fe6ba0e419b
