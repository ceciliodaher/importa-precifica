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

### Planned Web Architecture (PHP-based)
According to `documentos/especificacao-tecnica-sistema.md`:
- **Backend**: PHP 7.4+ with MVC pattern
- **Frontend**: HTML5/CSS3 with Bootstrap 4.x
- **Database**: MySQL (optional)
- **JavaScript**: ES6 with jQuery 3.x

Planned directory structure for web application:
```
/public_html/
├── index.php
├── /controllers/
├── /models/
├── /views/
├── /config/
├── /assets/
└── /uploads/
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

## Development Notes

- No version control initialized yet (consider `git init`)
- No dependency management files exist (create `requirements.txt` for Python)
- Tax rates and incentives are hardcoded in the prototype
- Project is transitioning from Python prototype to PHP web application
- Extensive documentation exists in `documentos/` directory for implementation guidance