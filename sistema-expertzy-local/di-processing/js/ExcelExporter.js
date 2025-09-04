/**
 * ExcelExporter.js - Specialized Excel Export Module
 * 
 * Handles Excel export of DI cost calculations with Brazilian formatting
 */

class ExcelExporter {
    constructor() {
        this.name = 'ExcelExporter';
    }

    /**
     * Export DI calculation data to Excel format
     * @param {Object} diData - DI data from currentDI
     * @param {Object} calculationData - Calculation results from currentCalculation
     */
    export(diData, calculationData) {
        if (!diData || !calculationData) {
            throw new Error('DI data e calculation data são obrigatórios para export Excel');
        }

        console.log('📊 ExcelExporter: Iniciando export de planilha de custos...');

        try {
            // Create new workbook
            const wb = XLSX.utils.book_new();
            
            // Prepare data with Brazilian formatting
            const costData = this.prepareCostData(diData, calculationData);
            const productData = this.prepareProductData(diData, calculationData);
            
            // Create worksheets
            const costWs = XLSX.utils.aoa_to_sheet(costData);
            const productWs = XLSX.utils.aoa_to_sheet(productData);
            
            // Add worksheets to workbook
            XLSX.utils.book_append_sheet(wb, costWs, 'Resumo Custos');
            XLSX.utils.book_append_sheet(wb, productWs, 'Produtos');
            
            // Generate filename with Brazilian date format
            const filename = this.generateFilename(diData.numero_di);
            
            // Export file
            XLSX.writeFile(wb, filename);
            
            console.log(`✅ ExcelExporter: Planilha exportada - ${filename}`);
            return { success: true, filename };
            
        } catch (error) {
            console.error('❌ ExcelExporter: Erro no export:', error);
            throw new Error(`Falha no export Excel: ${error.message}`);
        }
    }

    /**
     * Prepare cost summary data for Excel
     */
    prepareCostData(diData, calculationData) {
        const data = [
            ['SISTEMA EXPERTZY - RELATÓRIO DE CUSTOS DE IMPORTAÇÃO'],
            [''],
            ['DI PROCESSADA'],
            ['Número DI', diData.numero_di],
            ['Incoterm', diData.incoterm_identificado?.codigo || 'N/A'],
            ['Estado Destino', calculationData.estado || 'N/A'],
            ['NCM', calculationData.ncm || 'N/A'],
            ['Data Processamento', new Date().toLocaleDateString('pt-BR')],
            [''],
            ['VALORES BASE'],
            ['Valor Aduaneiro Total', this.formatBrazilianCurrency(calculationData.valores_base.valor_aduaneiro_total)],
            ['Peso Líquido (kg)', calculationData.valores_base.peso_liquido],
            ['Taxa de Câmbio', calculationData.valores_base.taxa_cambio?.toFixed(6) || 'N/A'],
            [''],
            ['IMPOSTOS CALCULADOS'],
            ['Imposto de Importação (II)', this.formatBrazilianCurrency(calculationData.impostos.ii.valor_devido)],
            ['IPI', this.formatBrazilianCurrency(calculationData.impostos.ipi.valor_devido)],
            ['PIS', this.formatBrazilianCurrency(calculationData.impostos.pis.valor_devido)],
            ['COFINS', this.formatBrazilianCurrency(calculationData.impostos.cofins.valor_devido)],
            ['ICMS (' + calculationData.impostos.icms.aliquota + '%)', this.formatBrazilianCurrency(calculationData.impostos.icms.valor_devido)],
            [''],
            ['DESPESAS ADUANEIRAS'],
            ['SISCOMEX', this.formatBrazilianCurrency(calculationData.despesas.automaticas.siscomex)],
            ['AFRMM', this.formatBrazilianCurrency(calculationData.despesas.automaticas.afrmm)],
            ['Capatazia', this.formatBrazilianCurrency(calculationData.despesas.automaticas.capatazia)],
            ['Despesas Extras', this.formatBrazilianCurrency(calculationData.despesas.extras.total || 0)],
            ['Total Despesas', this.formatBrazilianCurrency(calculationData.despesas.totais.total_geral)],
            [''],
            ['RESUMO FINAL'],
            ['Total de Impostos', this.formatBrazilianCurrency(calculationData.totais.total_impostos)],
            ['Custo Total Final', this.formatBrazilianCurrency(calculationData.totais.custo_total)]
        ];

        return data;
    }

    /**
     * Prepare product details for Excel
     */
    prepareProductData(diData, calculationData) {
        const products = calculationData.adicoes_detalhes || [];
        
        const data = [
            ['DETALHAMENTO POR PRODUTO'],
            [''],
            ['NCM', 'Descrição', 'Quantidade', 'Valor Unit. (R$)', 'Valor Total (R$)', 'II', 'IPI', 'PIS', 'COFINS', 'ICMS']
        ];

        products.forEach(adicao => {
            if (adicao.produtos) {
                adicao.produtos.forEach(produto => {
                    data.push([
                        produto.ncm || 'N/A',
                        produto.descricao || 'N/A',
                        produto.quantidade || 1,
                        this.formatBrazilianNumber(produto.valor_unitario),
                        this.formatBrazilianNumber(produto.valor_total),
                        this.formatBrazilianNumber(produto.impostos?.ii || 0),
                        this.formatBrazilianNumber(produto.impostos?.ipi || 0),
                        this.formatBrazilianNumber(produto.impostos?.pis || 0),
                        this.formatBrazilianNumber(produto.impostos?.cofins || 0),
                        this.formatBrazilianNumber(produto.impostos?.icms || 0)
                    ]);
                });
            }
        });

        return data;
    }

    /**
     * Format currency for Excel (remove R$ symbol, keep Brazilian decimal format)
     */
    formatBrazilianCurrency(value) {
        if (value === null || value === undefined || isNaN(value)) return '0,00';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /**
     * Format numbers for Excel
     */
    formatBrazilianNumber(value) {
        if (value === null || value === undefined || isNaN(value)) return '0,00';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /**
     * Generate Excel filename with Brazilian date format
     */
    generateFilename(numeroDI) {
        const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        return `custos_di_${numeroDI}_${date}.xlsx`;
    }
}