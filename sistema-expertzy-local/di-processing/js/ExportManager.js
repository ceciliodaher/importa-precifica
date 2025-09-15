/**
 * ExportManager.js - Export System Coordinator
 * 
 * Manages all export operations with validation and error handling
 * Coordinates between specialized export modules
 */

class ExportManager {
    constructor() {
        this.name = 'ExportManager';
        this.excelExporter = null;
        
        // Initialize ExcelExporter with error handling
        this.initializeExcelExporter();
    }
    
    initializeExcelExporter() {
        try {
            if (typeof ExcelExporter === 'undefined') {
                throw new Error('ExcelExporter class não disponível - verifique se o script está carregado');
            }
            
            this.excelExporter = new ExcelExporter();
            console.log('✅ ExportManager: ExcelExporter inicializado com sucesso');
        } catch (error) {
            console.error('❌ ExportManager: Erro ao inicializar ExcelExporter:', error);
            this.excelExporter = null;
        }
    }

    /**
     * Main export function - routes to specialized modules
     * @param {string} format - Export format ('excel', 'pdf', 'json')
     * @param {Object} diData - DI data
     * @param {Object} calculationData - Calculation results
     * @param {Object} memoryData - Calculation memory (optional)
     */
    async export(format, diData, calculationData, memoryData = null) {
        // Validate required data
        this.validateExportData(diData, calculationData);
        
        console.log(`📊 ExportManager: Iniciando export ${format}...`);

        try {
            switch (format) {
                case 'excel':
                    return await this.exportExcel(diData, calculationData, memoryData);
                    
                case 'pdf':
                    return await this.exportPDF(diData, calculationData);
                    
                case 'json':
                    return await this.exportJSON(diData, calculationData);
                    
                default:
                    throw new Error(`Formato de export não suportado: ${format}`);
            }
        } catch (error) {
            console.error(`❌ ExportManager: Erro no export ${format}:`, error);
            throw error;
        }
    }

    /**
     * Export to Excel using specialized module
     */
    async exportExcel(diData, calculationData, memoryData = null) {
        // Check if ExcelExporter is available
        if (!this.excelExporter) {
            console.warn('⚠️ ExcelExporter não disponível, tentando reinicializar...');
            this.initializeExcelExporter();
        }
        
        if (!this.excelExporter) {
            throw new Error('ExcelExporter não pôde ser inicializado. Verifique se todas as dependências estão carregadas.');
        }
        
        return this.excelExporter.export(diData, calculationData, memoryData);
    }

    /**
     * Export to PDF using existing CroquiNF module
     */
    async exportPDF(diData, calculationData) {
        // Use existing PDF export functionality
        if (typeof window.gerarCroquiPDFNovo === 'function') {
            return window.gerarCroquiPDFNovo(calculationData);
        } else {
            throw new Error('Módulo PDF export não disponível');
        }
    }

    /**
     * Export to JSON format
     */
    async exportJSON(diData, calculationData) {
        const jsonData = {
            timestamp: new Date().toISOString(),
            di_data: diData,
            calculation_results: calculationData,
            metadata: {
                sistema: 'Expertzy DI Processor',
                versao: '2.0'
            }
        };

        const filename = `dados_di_${diData.numero_di}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`;
        
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        console.log(`✅ ExportManager: JSON exportado - ${filename}`);
        return { success: true, filename };
    }

    /**
     * Validate export data before processing - estrutura completa obrigatória
     */
    validateExportData(diData, calculationData) {
        // Validar DI data
        if (!diData) {
            throw new Error('DI data não disponível para export');
        }
        if (!diData.numero_di) {
            throw new Error('Número da DI é obrigatório para export');
        }
        if (!diData.adicoes || diData.adicoes.length === 0) {
            throw new Error('DI deve conter pelo menos uma adição para export');
        }
        // Frete e seguro são opcionais - usar 0 como default se não disponível
        // Removido validação obrigatória conforme CLAUDE.md - fail-fast apenas para dados críticos
        if (diData.frete_brl === undefined) {
            console.warn('⚠️ Frete BRL não encontrado na DI, usando 0 como default');
            diData.frete_brl = 0;
        }
        if (diData.seguro_brl === undefined) {
            console.warn('⚠️ Seguro BRL não encontrado na DI, usando 0 como default');
            diData.seguro_brl = 0;
        }

        // Validar calculation data
        if (!calculationData) {
            throw new Error('Dados de cálculo não disponíveis para export');
        }
        if (!calculationData.totais) {
            throw new Error('Totais de cálculo não disponíveis para export');
        }
        if (!calculationData.impostos) {
            throw new Error('Impostos não disponíveis para export');
        }
        if (!calculationData.despesas) {
            throw new Error('Despesas não disponíveis para export');
        }

        // Validar estrutura com rateio hierárquico
        if (!calculationData.adicoes_detalhes) {
            throw new Error('Adições com rateio não disponíveis - ComplianceCalculator deve processar rateio hierárquico');
        }
        
        // Validar cada adição tem rateio completo
        calculationData.adicoes_detalhes.forEach(adicao => {
            if (!adicao.despesas_rateadas) {
                throw new Error(`Despesas rateadas ausentes na adição ${adicao.numero_adicao}`);
            }
            if (!adicao.impostos) {
                throw new Error(`Impostos ausentes na adição ${adicao.numero_adicao}`);
            }
            if (!adicao.incoterm) {
                throw new Error(`INCOTERM ausente na adição ${adicao.numero_adicao}`);
            }
            if (adicao.custo_total === undefined || adicao.custo_total === null) {
                throw new Error(`Custo total ausente na adição ${adicao.numero_adicao}`);
            }
            
            // Validar produtos com rateio se existirem
            if (adicao.produtos_com_rateio && adicao.produtos_com_rateio.length > 0) {
                adicao.produtos_com_rateio.forEach(produto => {
                    if (!produto.despesas_rateadas) {
                        throw new Error(`Despesas rateadas ausentes no produto ${produto.codigo} da adição ${adicao.numero_adicao}`);
                    }
                    if (!produto.impostos_item) {
                        throw new Error(`Impostos por item ausentes no produto ${produto.codigo} da adição ${adicao.numero_adicao}`);
                    }
                    if (produto.custo_total_item === undefined || produto.custo_total_item === null) {
                        throw new Error(`Custo total por item ausente no produto ${produto.codigo} da adição ${adicao.numero_adicao}`);
                    }
                });
            }
        });

        // Validar produtos individuais para croqui NFe
        if (!calculationData.produtos_individuais) {
            throw new Error('Produtos individuais não calculados - necessários para croqui NFe');
        }
        if (calculationData.produtos_individuais.length === 0) {
            throw new Error('Lista de produtos individuais vazia - croqui NFe ficará sem dados');
        }

        console.log('✅ ExportManager: Estrutura de dados completa validada para export');
    }
}