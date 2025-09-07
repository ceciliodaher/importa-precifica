/**
 * ExportManager.js - Export System Coordinator
 * 
 * Manages all export operations with validation and error handling
 * Coordinates between specialized export modules
 */

class ExportManager {
    constructor() {
        this.excelExporter = new ExcelExporter();
        this.name = 'ExportManager';
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
     * Validate export data before processing
     */
    validateExportData(diData, calculationData) {
        if (!diData) {
            throw new Error('DI data não disponível para export');
        }

        if (!diData.numero_di) {
            throw new Error('Número da DI é obrigatório para export');
        }

        if (!calculationData) {
            throw new Error('Dados de cálculo não disponíveis para export');
        }

        if (!calculationData.totais) {
            throw new Error('Totais de cálculo não disponíveis para export');
        }

        console.log('✅ ExportManager: Dados validados para export');
    }
}