# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brazilian import taxation and pricing system (Sistema de Importação e Precificação Expertzy) that processes XML files from Import Declarations (DI - Declaração de Importação), calculates import taxes, and optimizes pricing strategies with fiscal incentives across different Brazilian states.

## Current Implementation

Working Python prototype at `orientacoes/importador-xml-di-nf-entrada-perplexity-aprimorado-venda.py` providing:
- GUI interface using Tkinter
- XML parsing for DI documents
- Tax calculation engine (ICMS, IPI, PIS, COFINS, II)
- Fiscal incentive analysis for states (GO, SC, ES, MG)
- Excel export functionality

**Current Web System** (JavaScript-based):
- Automatic DI processing with expense extraction
- ICMS tax base calculation including DI expenses
- Manual extra expenses form for costing purposes
- **Limitation**: Extra expenses not integrated with ICMS tax base calculation

## Key Commands

### Running the Current Prototype
```bash
python orientacoes/importador-xml-di-nf-entrada-perplexity-aprimorado-venda.py
```

### Python Dependencies
The prototype requires these packages (no requirements.txt exists yet):
- tkinter (usually included with Python)
- pandas
- openpyxl (for Excel export)
- xml.etree.ElementTree (standard library)

## Architecture and Structure

### Current Directory Structure
- `documentos/` - Product requirements, technical specifications, implementation plans
- `orientacoes/` - Python prototype, sample XML files, Excel templates, reference documents
- `sistema-expertzy-local/` - Current web implementation with centralized data processing

### Current Web Architecture (JavaScript-based)
Implemented as a client-side application with centralized data processing:
- **Frontend**: HTML5/CSS3 with responsive design
- **JavaScript**: ES6 modules with centralized XMLParser
- **Data Processing**: Single XMLParser handles all DI conversions
- **Storage**: LocalStorage for client-side data persistence

Current directory structure:
```
/sistema-expertzy-local/
├── index.html
├── sistema-importacao.html
├── /js/
│   ├── xmlParser.js (CORE - All DI data processing)
│   ├── calculator.js
│   ├── exportCroquiNF.js
│   ├── exportNF.js
│   └── storage.js
├── /css/
├── /data/
└── /samples/
```

### Data Processing Architecture Principles

**CRITICAL: Centralized Data Processing Rule**
- **XMLParser.js is the ONLY module authorized to process and convert DI data**
- All other modules (Calculator, ExportCroqui, ExportNF, Storage) are DATA CONSUMERS only
- No conversions, calculations, or data transformations outside XMLParser
- Ensures data consistency and prevents unit conversion errors

**Data Flow:**
```
DI (XML) → XMLParser.js (ONLY PROCESSOR) → Standardized Data → Consumer Modules
```

## Import Expenses Management

### Current System Behavior
- **Automatic DI Processing**: System extracts SISCOMEX, AFRMM, capatazia from DI XML
- **Manual Extra Expenses**: User can input additional costs (storage, internal transport, customs agent)
- **Current Issue**: Extra expenses used only for costing, not included in ICMS tax base

### Planned Enhancement (See: documentos/plano-implementacao-despesas-extras.md)
**New Workflow**: Upload DI → Review Expenses → Configure Extras → Final Processing

**Key Features**:
1. **Automatic Expense Display**: Show SISCOMEX, AFRMM, capatazia found in DI
2. **Extra Expenses Form**: Storage, internal transport, customs agent, port fees
3. **Tax Classification**: Mark expenses as "ICMS tax base" vs "costing only"
4. **Real-time Preview**: Show impact on ICMS calculation before applying
5. **Consolidated Calculation**: All expenses properly included in tax calculations

**ICMS Tax Base Formula** (Enhanced):
```
Base ICMS = (CIF + II + IPI + PIS + COFINS + DI Expenses + Extra Taxable Expenses) / (1 - ICMS rate)
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
5. **Import Expenses Management**: System must handle both automatic DI expenses and manual extra expenses, with proper ICMS tax base calculation

## Development Notes

- Git repository initialized and active
- JavaScript-based web application currently in development
- Tax rates and incentives loaded from JSON configuration files
- XMLParser.js serves as single source of truth for DI data processing
- Extensive documentation exists in `documentos/` directory for implementation guidance

### Recent Updates (2025-08-27)

**Import Expenses Enhancement Planning**
- **Analysis**: Completed system analysis for expenses management integration
- **Documentation**: Created comprehensive implementation plan at `documentos/plano-implementacao-despesas-extras.md`
- **Architecture**: Defined new workflow with expense review step
- **Technical Spec**: Detailed modifications for XMLParser, Calculator, App.js, and interface

**Key Technical Decisions:**
- **Consolidation Approach**: Merge automatic DI expenses + manual extra expenses
- **Tax Classification**: Allow users to mark expenses as ICMS taxable vs costing-only
- **Real-time Preview**: Show ICMS impact before applying changes
- **Backward Compatibility**: Maintain existing functionality while adding new features

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