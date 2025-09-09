/**
 * ExcelExporter.js - Professional Multi-Sheet Excel Export Module
 * 
 * Generates comprehensive Excel workbook following ExtratoDI_COMPLETO template
 * Includes complete DI data, calculations, validation, and memory trace
 * 
 * Structure:
 * - Cover and basic information sheets
 * - Configuration and expense sheets  
 * - Tax calculation and validation sheets
 * - Individual addition detail sheets (DYNAMIC - based on actual additions count)
 * - Summary and consolidation sheets
 * - Calculation memory and audit trail
 */

class ExcelExporter {
    constructor() {
        this.name = 'ExcelExporter';
        this.workbook = null;
        this.diData = null;
        this.calculationData = null;
        this.memoryData = null;
        
        // Sistema de formatação profissional
        this.styles = new ExcelProfessionalStyles();
    }

    /**
     * Main export method - generates complete multi-sheet workbook
     * @param {Object} diData - Complete DI data from currentDI
     * @param {Object} calculationData - All calculations from currentCalculation
     * @param {Object} memoryData - Calculation memory trace (optional)
     */
    async export(diData, calculationData, memoryData = null) {
        if (!diData) {
            throw new Error('DI data é obrigatório para export Excel');
        }
        if (!calculationData) {
            throw new Error('Calculation data é obrigatório para export Excel');
        }
        if (!diData.numero_di) {
            throw new Error('Número da DI é obrigatório para export Excel');
        }
        if (!diData.adicoes || diData.adicoes.length === 0) {
            throw new Error('DI deve conter pelo menos uma adição para export Excel');
        }

        console.log('📊 ExcelExporter: Iniciando export completo estilo ExtratoDI_COMPLETO...');
        console.log(`📋 DI possui ${diData.adicoes?.length || 0} adições - criando abas dinamicamente`);

        try {
            // Store data for use in helper methods
            this.diData = diData;
            this.calculationData = calculationData;
            this.memoryData = memoryData;

            // Create new ExcelJS workbook
            this.workbook = new ExcelJS.Workbook();
            this.workbook.creator = 'Expertzy - Sistema de Importação e Precificação';
            this.workbook.lastModifiedBy = 'ExcelExporter';
            this.workbook.created = new Date();
            this.workbook.modified = new Date();
            
            // Generate all sheets in order
            this.createCoverSheet();                    // 01_Capa
            this.createImporterSheet();                 // 02_Importador
            this.createCargoSheet();                    // 03_Carga
            this.createValuesSheet();                   // 04_Valores
            this.createComplementaryExpensesSheet();    // 04B_Despesas_Complementares
            this.createCostConfigSheet();               // 04A_Config_Custos
            this.createTotalTaxesSheet();               // 05_Tributos_Totais
            this.createCostValidationSheet();           // 05A_Validacao_Custos
            this.createAdditionsSummarySheet();         // 06_Resumo_Adicoes
            this.createCostSummarySheet();              // 06A_Resumo_Custos
            this.createIndividualAdditionSheets();      // Add_001 to Add_XXX (dinâmico)
            this.createComplementarySheet();            // 99_Complementar
            this.createCroquiNFeSheet();                // Croqui_NFe_Entrada
            
            // Generate filename with DI number and date
            const filename = this.generateFilename(diData.numero_di);
            
            // Export file with ExcelJS (full formatting support)
            const arquivoBuffer = await this.workbook.xlsx.writeBuffer();
            this.downloadArquivo(arquivoBuffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            
            console.log(`✅ ExcelExporter: Export completo realizado com formatação profissional - ${filename}`);
            console.log(`📊 Total de ${this.workbook.SheetNames.length} abas criadas`);
            return { success: true, filename };
            
        } catch (error) {
            console.error('❌ ExcelExporter: Erro no export:', error);
            throw new Error(`Falha no export Excel: ${error.message}`);
        }
    }

    /**
     * 01_Capa - Cover sheet with basic DI information (ExcelJS)
     */
    createCoverSheet() {
        const worksheet = this.workbook.addWorksheet('01_Capa');
        
        const data = [
            ['Campo', 'Valor'],
            ['DI', this.diData.numero_di],
            ['Data registro', this.diData.data_registro || 'N/D'],
            ['URF despacho', this.diData.urf_despacho],
            ['Modalidade', this.diData.modalidade_despacho],
            ['Qtd. adições', this.diData.adicoes.length],
            ['Situação', this.diData.situacao]
        ];

        // Adicionar dados à planilha
        worksheet.addRows(data);
        
        // Aplicar formatação profissional
        this.styles.applyHeaderStyle(worksheet, 'A1:B1');
        this.styles.applyZebraStriping(worksheet, 1, data.length - 1, 0, 1);
        this.styles.setOptimizedColumnWidths(worksheet, [30, 60]);
    }

    /**
     * 02_Importador - Importer company details
     */
    createImporterSheet() {
        const importador = this.diData.importador || {};
        const data = [
            ['Campo', 'Valor'],
            ['Nome/Razão Social', importador.nome],
            ['CNPJ', importador.cnpj || 'N/D'], // Already formatted XX.XXX.XXX/XXXX-XX by DIProcessor
            ['Endereço', importador.endereco],
            ['Cidade', importador.cidade],
            ['UF', importador.endereco_uf],
            ['CEP', importador.cep]
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        this.applyHeaderStyle(ws, 'A1:B1');
        
        // Aplicar zebra striping nas linhas de dados
        this.applyZebraStriping(ws, 1, data.length - 1, 0, 1);
        
        // Configurar larguras otimizadas
        this.styles.setOptimizedColumnWidths(ws, [30, 60]);
        
        XLSX.utils.book_append_sheet(this.workbook, ws, '02_Importador');
    }

    /**
     * 03_Carga - Cargo and transport information
     */
    createCargoSheet() {
        const data = [
            ['Campo', 'Valor'],
            ['Peso Bruto (kg)', this.formatNumber(this.diData.peso_bruto)],
            ['Peso Líquido (kg)', this.formatNumber(this.diData.peso_liquido)],
            ['Via de Transporte', this.diData.via_transporte],
            ['Tipo de Declaração', this.diData.tipo_declaracao],
            ['URF Entrada', this.diData.urf_entrada],
            ['Recinto Aduaneiro', this.diData.recinto_aduaneiro]
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        this.applyHeaderStyle(ws, 'A1:B1');
        XLSX.utils.book_append_sheet(this.workbook, ws, '03_Carga');
    }

    /**
     * 04_Valores - Values and exchange rates
     */
    createValuesSheet() {
        // Trust processed data structure from DIProcessor
        const moedas = this.diData.moedas || {};
        const vmle = moedas.vmle_vmld || {};
        
        const data = [
            ['Campo', 'Valor USD', 'Valor R$', 'Taxa Câmbio'],
            ['VMLE/VMLD', 
                this.formatNumber(vmle.vmle_usd), 
                this.formatNumber(vmle.vmle_brl), 
                this.formatNumber(vmle.taxa, 6)],
            [],
            ['Moeda Principal', vmle.codigo, 'USD', ''],
            ['Total CIF', 
                this.formatNumber(this.diData.valor_total_usd), 
                this.formatNumber(this.diData.valor_total_brl), 
                ''],
            ['Frete Internacional', 
                this.formatNumber(this.diData.frete_usd), 
                this.formatNumber(this.diData.frete_brl), 
                ''],
            ['Seguro Internacional', 
                this.formatNumber(this.diData.seguro_usd), 
                this.formatNumber(this.diData.seguro_brl), 
                ''],
            [],
            ['Data Taxa Câmbio', this.diData.data_taxa_cambio || 'N/D', '', ''] // Already formatted by DIProcessor
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        this.applyHeaderStyle(ws, 'A1:D1');
        XLSX.utils.book_append_sheet(this.workbook, ws, '04_Valores');
    }

    /**
     * 04B_Despesas_Complementares - Additional expenses
     */
    createComplementaryExpensesSheet() {
        // Trust processed data - use what's available
        const despesas = this.calculationData?.despesas?.extras || {};
        
        const data = [
            ['Tipo de Despesa', 'Valor R$', 'Compõe Base ICMS'],
            ['Armazenagem', this.formatNumber(despesas.armazenagem), despesas.armazenagem_icms ? 'Sim' : 'Não'],
            ['Transporte Interno', this.formatNumber(despesas.transporte), despesas.transporte_icms ? 'Sim' : 'Não'],
            ['Despachante', this.formatNumber(despesas.despachante), despesas.despachante_icms ? 'Sim' : 'Não'],
            ['Outras Despesas', this.formatNumber(despesas.outras), despesas.outras_icms ? 'Sim' : 'Não'],
            [],
            ['Total Extras', this.formatNumber(despesas.total), ''],
            ['Total Base ICMS', this.formatNumber(despesas.total_base_icms), '']
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        this.applyHeaderStyle(ws, 'A1:C1');
        XLSX.utils.book_append_sheet(this.workbook, ws, '04B_Despesas_Complementares');
    }

    /**
     * 04A_Config_Custos - Cost configuration
     */
    createCostConfigSheet() {
        // Trust processed data from ComplianceCalculator
        const config = this.calculationData || {};
        const despesas = config.despesas || {};
        const impostos = config.impostos || {};
        
        const data = [
            ['Configuração', 'Valor'],
            ['Frete Embutido', this.diData.frete_embutido ? 'Sim' : 'Não'],
            ['Seguro Embutido', this.diData.seguro_embutido ? 'Sim' : 'Não'],
            ['Base de Cálculo', 'Valor Aduaneiro'],
            ['Valor Base R$', this.formatNumber(config.valores_base.valor_aduaneiro_total)],
            ['Frete Considerado R$', this.formatNumber(this.diData.frete_brl)],  // Fail-fast - must be number
            ['Seguro Considerado R$', this.formatNumber(this.diData.seguro_brl)],
            ['AFRMM R$', this.formatNumber(despesas.automaticas.afrmm)],
            ['Siscomex R$', this.formatNumber(despesas.automaticas.siscomex)],
            ['ICMS Normal R$', this.formatNumber(impostos.icms.valor_devido)],
            ['ICMS Alíquota %', impostos.icms.aliquota],
            ['Estado Destino', config.estado],
            [],
            ['Regime Tributário', config.regime_tributario], // Use processed value directly - no defaults
            ['Contribuinte IPI', 'Sim'], // Todo importador é contribuinte IPI
            ['Data Cálculo', new Date().toLocaleDateString('pt-BR')] // Format new date only
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        this.applyHeaderStyle(ws, 'A1:B1');
        XLSX.utils.book_append_sheet(this.workbook, ws, '04A_Config_Custos');
    }

    /**
     * 05_Tributos_Totais - Total taxes summary
     */
    createTotalTaxesSheet() {
        // Trust processed data from ComplianceCalculator
        const impostos = this.calculationData?.impostos || {};
        const totais = this.calculationData?.totais || {};
        
        const data = [
            ['Tributo', 'Valor R$', '% do Total'],
            ['II - Imposto de Importação', 
                this.formatNumber(impostos.ii.valor_devido),
                this.formatPercent(impostos.ii.valor_devido, totais.total_impostos)],
            ['IPI - Imposto Produtos Industrializados', 
                this.formatNumber(impostos.ipi.valor_devido),
                this.formatPercent(impostos.ipi.valor_devido, totais.total_impostos)],
            ['PIS - Programa Integração Social', 
                this.formatNumber(impostos.pis.valor_devido),
                this.formatPercent(impostos.pis.valor_devido, totais.total_impostos)],
            ['COFINS - Contribuição Financ. Seg. Social', 
                this.formatNumber(impostos.cofins.valor_devido),
                this.formatPercent(impostos.cofins.valor_devido, totais.total_impostos)],
            ['ICMS - Imposto Circulação Mercadorias', 
                this.formatNumber(impostos.icms.valor_devido),
                this.formatPercent(impostos.icms.valor_devido, totais.total_impostos)],
            [],
            ['TOTAL IMPOSTOS', 
                this.formatNumber(totais.total_impostos),
                '100,00%'],
            [],
            ['Valor Aduaneiro', this.formatNumber(totais.valor_aduaneiro), ''],
            ['Total Despesas', this.formatNumber(totais.total_despesas), ''],
            ['CUSTO TOTAL FINAL', this.formatNumber(totais.custo_total), '']
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        this.applyHeaderStyle(ws, 'A1:C1');
        XLSX.utils.book_append_sheet(this.workbook, ws, '05_Tributos_Totais');
    }

    /**
     * 05A_Validacao_Custos - Cost validation and verification
     */
    createCostValidationSheet() {
        // Trust processed data - use what's available
        const totais = this.calculationData?.totais || {};
        const validacao = this.calculationData?.validacao || {};
        
        // Calculate validation metrics
        const custoCalculado = totais.custo_total;
        const valorEsperado = validacao?.valor_esperado || custoCalculado; // Default to calculated if no validation provided
        const diferenca = custoCalculado - valorEsperado;
        const percentDiferenca = valorEsperado > 0 ? (diferenca / valorEsperado) * 100 : 0;
        
        // Validate values before formatting
        if (custoCalculado === null || custoCalculado === undefined) {
            throw new Error('Custo total calculado é obrigatório para validação');
        }
        
        const data = [
            ['Métrica', 'Valor'],
            ['Custo Total Calculado', this.formatNumber(custoCalculado)],
            ['Valor Esperado', this.formatNumber(valorEsperado)],
            ['Diferença', this.formatNumber(Math.abs(diferenca))],
            ['% Diferença', percentDiferenca !== 0 ? this.formatPercent(Math.abs(percentDiferenca), 100) : '0,00%'],
            ['Status', Math.abs(percentDiferenca) < 0.5 ? 'OK' : 'DIVERGÊNCIA'],
            ['Configuração', `Frete: ${this.diData.frete_embutido ? 'Embutido' : 'Separado'}, Seguro: ${this.diData.seguro_embutido ? 'Embutido' : 'Separado'}`],
            [],
            ['Validação de Impostos', ''],
            ['II Extraído DI', this.diData.totais?.tributos_totais?.ii_total ? this.formatNumber(this.diData.totais.tributos_totais.ii_total) : 'N/D'],
            ['II Calculado', this.formatNumber(this.calculationData.impostos.ii.valor_devido)],
            ['IPI Extraído DI', this.diData.totais?.tributos_totais?.ipi_total ? this.formatNumber(this.diData.totais.tributos_totais.ipi_total) : 'N/D'],
            ['IPI Calculado', this.formatNumber(this.calculationData.impostos.ipi.valor_devido)],
            ['PIS/COFINS Extraído', (this.diData.totais?.tributos_totais?.pis_total || this.diData.totais?.tributos_totais?.cofins_total) ? this.formatNumber((this.diData.totais.tributos_totais.pis_total || 0) + (this.diData.totais.tributos_totais.cofins_total || 0)) : 'N/D'],
            ['PIS/COFINS Calculado', this.formatNumber(this.calculationData.impostos.pis.valor_devido + this.calculationData.impostos.cofins.valor_devido)]
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Aplicar formatação profissional
        this.applyHeaderStyle(ws, 'A1:B1');
        
        // Aplicar formatação condicional baseada na diferença já calculada
        const validationStatus = Math.abs(percentDiferenca) < 0.5 ? 'OK' : (Math.abs(percentDiferenca) < 5 ? 'AVISO' : 'ERRO');
        
        // Aplicar formatação de validação na linha de status
        if (ws['B6']) { // Status line (linha 6 é onde está o Status)
            this.styles.applyValidationStyle(ws, 'B6', validationStatus.toLowerCase());
        }
        
        // Configurar larguras otimizadas
        this.styles.setOptimizedColumnWidths(ws, [35, 20]);
        
        XLSX.utils.book_append_sheet(this.workbook, ws, '05A_Validacao_Custos');
    }

    /**
     * 06_Resumo_Adicoes - Additions summary
     */
    createAdditionsSummarySheet() {
        // Trust processed data from DIProcessor
        const adicoes = this.diData.adicoes || [];
        
        const data = [
            ['Adição', 'NCM', 'Descrição', 'INCOTERM', 'Valor USD', 'Valor R$', 'Qtd Produtos']
        ];

        adicoes.forEach(adicao => {
            data.push([
                adicao.numero_adicao,
                adicao.ncm,
                (adicao.descricao_ncm || 'N/D').substring(0, 30) + '...',  // ✅ Graceful handling for mock data
                adicao.condicao_venda_incoterm,  // ✅ CORRECTED: Use condicao_venda_incoterm
                this.formatNumber(adicao.valor_moeda_negociacao),
                this.formatNumber(adicao.valor_reais),
                adicao.produtos ? adicao.produtos.length : 0
            ]);
        });

        // Add totals row
        const totalUSD = adicoes.reduce((sum, a) => sum + a.condicao_venda_valor_moeda, 0);
        const totalBRL = adicoes.reduce((sum, a) => sum + a.condicao_venda_valor_reais, 0);
        const totalProducts = adicoes.reduce((sum, a) => sum + (a.produtos ? a.produtos.length : 0), 0);
        
        data.push([]);
        data.push(['TOTAL', '', '', '', this.formatNumber(totalUSD), this.formatNumber(totalBRL), totalProducts]);

        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Aplicar formatação profissional
        this.applyHeaderStyle(ws, 'A1:G1');
        
        // Aplicar zebra striping nas linhas de dados
        this.applyZebraStriping(ws, 1, data.length - 3, 0, 6); // Excluir totais
        
        // Aplicar formatação de valores monetários
        this.applyCurrencyFormatting(ws, 'E2:F' + (data.length - 2));
        
        // Configurar larguras otimizadas
        this.styles.setOptimizedColumnWidths(ws, [8, 15, 45, 12, 18, 18, 10]);
        
        // Configurar auto-filter
        this.styles.setAutoFilter(ws, 'A1:G' + (data.length - 3));
        
        XLSX.utils.book_append_sheet(this.workbook, ws, '06_Resumo_Adicoes');
    }

    /**
     * 06A_Resumo_Custos - Cost summary by addition
     */
    createCostSummarySheet() {
        // Usar dados já processados pelo ComplianceCalculator - sem fallbacks
        const adicoes = this.calculationData.adicoes_detalhes;
        
        if (!adicoes) {
            throw new Error('Adições com rateio não disponíveis - ComplianceCalculator deve ter processado completamente');
        }
        
        const data = [
            ['Adição', 'NCM', 'INCOTERM', 'Valor Mercadoria R$', 'Frete Rateado R$', 'Seguro Rateado R$', 
             'AFRMM Rateado R$', 'Siscomex Rateado R$', 'II R$', 'IPI R$', 'PIS R$', 'COFINS R$', 'ICMS R$', 'Custo Total R$']
        ];

        adicoes.forEach(adicao => {
            // Usar dados já processados - falhar se ausentes
            if (!adicao.despesas_rateadas) {
                throw new Error(`Despesas rateadas ausentes na adição ${adicao.numero_adicao}`);
            }
            if (!adicao.impostos) {
                throw new Error(`Impostos ausentes na adição ${adicao.numero_adicao}`);
            }
            
            data.push([
                adicao.numero_adicao,
                adicao.ncm,
                adicao.incoterm,
                this.formatNumber(adicao.valor_aduaneiro),
                this.formatNumber(adicao.despesas_rateadas.frete),
                this.formatNumber(adicao.despesas_rateadas.seguro),
                this.formatNumber(adicao.despesas_rateadas.afrmm),
                this.formatNumber(adicao.despesas_rateadas.siscomex),
                this.formatNumber(adicao.impostos.ii),
                this.formatNumber(adicao.impostos.ipi),
                this.formatNumber(adicao.impostos.pis),
                this.formatNumber(adicao.impostos.cofins),
                this.formatNumber(adicao.impostos.icms),
                this.formatNumber(adicao.custo_total)
            ]);
        });

        // Add totals row usando valores já calculados
        const totals = this.calculateTotalsByColumn(adicoes);
        data.push([]);
        data.push(['TOTAL', '', '', 
            this.formatNumber(totals.valor_aduaneiro),
            this.formatNumber(totals.frete),
            this.formatNumber(totals.seguro),
            this.formatNumber(totals.afrmm),
            this.formatNumber(totals.siscomex),
            this.formatNumber(totals.ii),
            this.formatNumber(totals.ipi),
            this.formatNumber(totals.pis),
            this.formatNumber(totals.cofins),
            this.formatNumber(totals.icms),
            this.formatNumber(totals.custo_total)
        ]);

        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Aplicar formatação profissional
        this.applyHeaderStyle(ws, 'A1:N1');
        
        // Aplicar zebra striping nas linhas de dados
        this.applyZebraStriping(ws, 1, data.length - 3, 0, 13);
        
        // Aplicar formatação monetária para todas as colunas de valores
        this.applyCurrencyFormatting(ws, 'D2:N' + (data.length - 2));
        
        // Aplicar formatação NCM
        this.applyNCMFormatting(ws, 'B2:B' + (data.length - 3));
        
        // Destacar linha de totais
        this.styles.applySecondaryHeaderStyle(ws, 'A' + data.length + ':N' + data.length);
        
        // Configurar larguras otimizadas
        this.styles.setOptimizedColumnWidths(ws, [8, 12, 12, 15, 15, 15, 15, 15, 12, 12, 10, 12, 12, 15]);
        
        // Configurar auto-filter
        this.styles.setAutoFilter(ws, 'A1:N' + (data.length - 3));
        
        XLSX.utils.book_append_sheet(this.workbook, ws, '06A_Resumo_Custos');
    }

    /**
     * Create individual addition sheets dynamically based on actual additions
     * CRÍTICO: Não assume quantidade fixa - cria baseado em this.diData.adicoes.length
     */
    createIndividualAdditionSheets() {
        // Trust processed data from DIProcessor
        const adicoes = this.diData.adicoes || [];
        
        if (adicoes.length === 0) {
            console.warn('⚠️ DI sem adições - nenhuma aba Add_XXX será criada');
            return;
        }
        
        // Criar uma aba para CADA adição existente, seja 1 ou 100+
        adicoes.forEach((adicao, index) => {
            const sheetName = `Add_${String(index + 1).padStart(3, '0')}`;
            const calculoAdicao = this.calculationData.adicoes_detalhes[index];
            
            if (!calculoAdicao) {
                throw new Error(`Cálculo da adição ${adicao.numero_adicao} não encontrado em adicoes_detalhes`);
            }
            
            this.createAdditionDetailSheet(adicao, calculoAdicao, sheetName);
        });
        
        console.log(`📊 Criadas ${adicoes.length} abas de adições (Add_001 a Add_${String(adicoes.length).padStart(3, '0')})`);
    }

    /**
     * Create detailed sheet for a single addition
     */
    createAdditionDetailSheet(adicao, calculo, sheetName) {
        // Use ONLY the correct field names documented in CLAUDE.md
        const data = [
            ['DADOS GERAIS'],
            ['Campo', 'Valor'],
            ['NCM', adicao.ncm],
            ['Descrição NCM', adicao.descricao_ncm],
            ['VCMV USD', this.formatNumber(adicao.valor_moeda_negociacao)],
            ['VCMV R$', this.formatNumber(adicao.valor_reais)],
            ['INCOTERM', adicao.condicao_venda_incoterm],
            ['Local', adicao.condicao_venda_local],
            ['Moeda', adicao.moeda_negociacao_nome],
            ['Peso líq. (kg)', this.formatNumber(adicao.peso_liquido)],
            ['Quantidade', this.formatNumber(adicao.quantidade_estatistica)],
            ['Unidade', adicao.unidade_estatistica],
            ['Taxa Câmbio', this.formatNumber(adicao.taxa_cambio, 6)],
            [],
            ['TRIBUTOS'],
            ['Tributo', 'Alíquota %', 'Base Cálculo R$', 'Valor Devido R$'],
            ['II', 
                this.formatNumber(adicao.tributos.ii_aliquota_ad_valorem), 
                this.formatNumber(adicao.valor_reais),
                this.formatNumber(adicao.tributos.ii_valor_devido)],
            ['IPI', 
                this.formatNumber(adicao.tributos.ipi_aliquota_ad_valorem),
                this.formatNumber(adicao.valor_reais + adicao.tributos.ii_valor_devido),
                this.formatNumber(adicao.tributos.ipi_valor_devido)],
            ['PIS', 
                this.formatNumber(adicao.tributos.pis_aliquota_ad_valorem),
                this.formatNumber(adicao.valor_reais),
                this.formatNumber(adicao.tributos.pis_valor_devido)],
            ['COFINS', 
                this.formatNumber(adicao.tributos.cofins_aliquota_ad_valorem),
                this.formatNumber(adicao.valor_reais),
                this.formatNumber(adicao.tributos.cofins_valor_devido)],
            ['ICMS', 
                this.formatNumber(this.calculationData?.impostos?.icms?.aliquota),
                this.formatNumber(calculo.impostos?.icms_base || adicao.valor_reais),
                this.formatNumber(this.calculationData?.impostos?.icms?.valor_devido)],
            [],
            ['PRODUTOS'],
            ['Código', 'Descrição', 'Quantidade', 'Unidade', 'Valor Unit. USD', 'Valor Total USD', 'Valor Unit. R$', 'Valor Total R$']
        ];

        // Add products
        if (adicao.produtos && adicao.produtos.length > 0) {
            adicao.produtos.forEach(produto => {
                data.push([
                    produto.codigo,
                    produto.descricao_mercadoria,  // Correct field name from CLAUDE.md
                    this.formatNumber(produto.quantidade),
                    produto.unidade_medida,
                    this.formatNumber(produto.valor_unitario_usd),
                    this.formatNumber(produto.valor_total_usd),
                    this.formatNumber(produto.valor_unitario_brl),
                    this.formatNumber(produto.valor_total_brl)
                ]);
            });
        }

        // Add expense allocation - usar dados já rateados
        data.push([]);
        data.push(['RATEIO DE DESPESAS']);
        data.push(['Despesa', 'Valor Rateado R$']);
        
        // Usar despesas já rateadas pelo ComplianceCalculator
        if (!calculo.despesas_rateadas) {
            throw new Error(`Despesas rateadas ausentes na adição ${adicao.numero_adicao}`);
        }
        
        data.push(['AFRMM Rateado', this.formatNumber(calculo.despesas_rateadas.afrmm)]);
        data.push(['SISCOMEX Rateado', this.formatNumber(calculo.despesas_rateadas.siscomex)]);
        data.push(['Capatazia Rateada', this.formatNumber(calculo.despesas_rateadas.capatazia)]);
        data.push(['Frete Rateado', this.formatNumber(calculo.despesas_rateadas.frete)]);
        data.push(['Seguro Rateado', this.formatNumber(calculo.despesas_rateadas.seguro)]);
        data.push(['Total Despesas Rateadas', this.formatNumber(calculo.despesas_rateadas.total)]);

        // Add cost summary - usar valores já calculados
        data.push([]);
        data.push(['RESUMO DE CUSTOS']);
        data.push(['Item', 'Valor R$']);
        data.push(['Valor Aduaneiro', this.formatNumber(calculo.valor_aduaneiro)]);
        data.push(['Total Impostos', this.formatNumber(
            calculo.impostos.ii + calculo.impostos.ipi + calculo.impostos.pis + calculo.impostos.cofins + calculo.impostos.icms
        )]);
        data.push(['Total Despesas', this.formatNumber(calculo.despesas_rateadas.total)]);
        data.push(['CUSTO TOTAL', this.formatNumber(calculo.custo_total)]);

        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Aplicar formatação profissional para adições individuais
        // Header principal
        this.applyHeaderStyle(ws, 'A1:B1');
        
        // Seção dados gerais
        this.applyHeaderStyle(ws, 'A2:B2');
        
        // Seção tributos
        this.styles.applySecondaryHeaderStyle(ws, 'A15:A15');
        this.applyHeaderStyle(ws, 'A16:D16');
        
        // Formatar percentuais nos tributos
        this.applyPercentageFormatting(ws, 'B17:B21');
        
        // Formatar valores monetários
        this.applyCurrencyFormatting(ws, 'C17:D21');
        this.applyCurrencyFormatting(ws, 'B3:B16'); // Valores em dados gerais
        
        // Seção produtos
        const produtosStartRow = data.findIndex(row => row[0] === 'PRODUTOS');
        if (produtosStartRow > -1) {
            this.styles.applySecondaryHeaderStyle(ws, 'A' + (produtosStartRow + 1) + ':A' + (produtosStartRow + 1));
            this.applyHeaderStyle(ws, 'A' + (produtosStartRow + 2) + ':H' + (produtosStartRow + 2));
        }
        
        // Aplicar formatação NCM
        this.applyNCMFormatting(ws, 'B3:B3');
        
        // Configurar larguras otimizadas
        this.styles.setOptimizedColumnWidths(ws, [25, 40, 15, 15, 18, 18, 18, 18]);
        
        XLSX.utils.book_append_sheet(this.workbook, ws, sheetName);
    }

    /**
     * 99_Complementar - Complementary notes
     */
    createComplementarySheet() {
        const data = [
            ['Observações e Notas Complementares'],
            [''],
            ['Data Processamento', new Date().toLocaleDateString('pt-BR')], // Format new date only
            ['Sistema', 'Expertzy - Sistema de Importação e Precificação'],
            ['Versão', '2025.1'],
            [''],
            ['DI Processada:'],
            [`- Número: ${this.diData.numero_di}`],
            [`- Total de Adições: ${this.diData.adicoes.length}`],
            [`- Estado Destino: ${this.calculationData.estado}`],
            [''],
            ['Notas:'],
            ['- Cálculos baseados na legislação vigente'],
            ['- ICMS calculado conforme estado de destino'],
            ['- Todos os importadores são contribuintes de IPI'],
            ['- Despesas aduaneiras rateadas proporcionalmente ao valor'],
            ['- Número de abas de adições criadas dinamicamente'],
            [''],
            ['Memória de Cálculo:'],
            [`- Total de operações registradas: ${this.memoryData ? this.memoryData.operations.length : 0}`],
            [`- Sessão de cálculo: ${this.memoryData ? this.memoryData.sessionId : 'Sessão não disponível'}`]
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Aplicar formatação profissional
        this.applyHeaderStyle(ws, 'A1:A1');
        this.styles.applySecondaryHeaderStyle(ws, 'A7:A7'); // "DI Processada:"
        this.styles.applySecondaryHeaderStyle(ws, 'A12:A12'); // "Notas:"
        this.styles.applySecondaryHeaderStyle(ws, 'A19:A19'); // "Memória de Cálculo:"
        
        // Configurar larguras otimizadas para texto longo
        this.styles.setOptimizedColumnWidths(ws, [150]);
        
        XLSX.utils.book_append_sheet(this.workbook, ws, '99_Complementar');
    }

    /**
     * Croqui_NFe_Entrada - Formatted for fiscal document
     */
    createCroquiNFeSheet() {
        // Usar dados pré-calculados pelo ComplianceCalculator - sem fallbacks
        const produtosIndividuais = this.calculationData.produtos_individuais;
        
        if (!produtosIndividuais) {
            throw new Error('Produtos individuais não calculados - ComplianceCalculator deve processar produtos por item');
        }
        
        if (produtosIndividuais.length === 0) {
            throw new Error('Nenhum produto individual encontrado para croqui NFe');
        }
        
        console.log(`📊 Usando ${produtosIndividuais.length} produtos pré-calculados para croqui NFe`);
        
        const produtos = produtosIndividuais.map(produto => {
            // Usar dados já processados - sem fallbacks
            return {
                adicao: produto.adicao_numero,
                ncm: produto.ncm,
                codigo: produto.codigo,
                descricao: produto.descricao,
                quantidade: produto.quantidade,
                unidade: produto.unidade_medida,
                valor_unitario: produto.valor_unitario_brl,
                valor_total: produto.valor_total_brl,
                // Usar valores pré-calculados exatamente como vêm
                ii: produto.ii_item,
                ipi: produto.ipi_item, 
                pis: produto.pis_item,
                cofins: produto.cofins_item,
                icms: produto.icms_item
            };
        });

        const data = [
            ['CROQUI PARA NOTA FISCAL DE ENTRADA'],
            [''],
            ['Item', 'NCM', 'Código', 'Descrição', 'Qtd', 'Un', 'V.Unit', 'V.Total', 'II', 'IPI', 'PIS', 'COFINS', 'ICMS', 'Total c/ Impostos']
        ];

        produtos.forEach((produto, index) => {
            const totalComImpostos = produto.valor_total + produto.ii + produto.ipi + produto.pis + produto.cofins + produto.icms;
            
            data.push([
                index + 1,
                produto.ncm,
                produto.codigo,
                produto.descricao,
                this.formatNumber(produto.quantidade),
                produto.unidade,
                this.formatNumber(produto.valor_unitario),
                this.formatNumber(produto.valor_total),
                this.formatNumber(produto.ii),
                this.formatNumber(produto.ipi),
                this.formatNumber(produto.pis),
                this.formatNumber(produto.cofins),
                this.formatNumber(produto.icms),
                this.formatNumber(totalComImpostos)
            ]);
        });

        // Add totals using pre-calculated values
        const totals = produtos.reduce((acc, p) => ({
            valor_total: acc.valor_total + p.valor_total,
            ii: acc.ii + p.ii,
            ipi: acc.ipi + p.ipi,
            pis: acc.pis + p.pis,
            cofins: acc.cofins + p.cofins,
            icms: acc.icms + p.icms
        }), { valor_total: 0, ii: 0, ipi: 0, pis: 0, cofins: 0, icms: 0 });
        
        console.log(`✅ Croqui NFe: ${produtos.length} produtos processados com impostos pré-calculados`);

        const grandTotal = totals.valor_total + totals.ii + totals.ipi + totals.pis + totals.cofins + totals.icms;

        data.push([]);
        data.push(['TOTAL', '', '', '', '', '', '', 
            this.formatNumber(totals.valor_total),
            this.formatNumber(totals.ii),
            this.formatNumber(totals.ipi),
            this.formatNumber(totals.pis),
            this.formatNumber(totals.cofins),
            this.formatNumber(totals.icms),
            this.formatNumber(grandTotal)
        ]);

        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Aplicar formatação profissional estilo nota fiscal
        this.applyHeaderStyle(ws, 'A1:A1'); // Título principal
        this.applyHeaderStyle(ws, 'A3:N3'); // Headers da tabela
        
        // Aplicar zebra striping nas linhas de dados
        this.applyZebraStriping(ws, 3, data.length - 3, 0, 13); // Excluir totais
        
        // Aplicar formatação de valores monetários
        this.applyCurrencyFormatting(ws, 'G4:N' + (data.length - 2));
        
        // Aplicar formatação NCM
        this.applyNCMFormatting(ws, 'B4:B' + (data.length - 3));
        
        // Destacar linha de totais
        this.styles.applySecondaryHeaderStyle(ws, 'A' + data.length + ':N' + data.length);
        
        // Configurar larguras otimizadas para croqui NFe
        this.styles.setOptimizedColumnWidths(ws, [6, 12, 15, 40, 8, 6, 15, 15, 12, 12, 10, 12, 12, 18]);
        
        // Configurar auto-filter
        this.styles.setAutoFilter(ws, 'A3:N' + (data.length - 3));
        
        XLSX.utils.book_append_sheet(this.workbook, ws, 'Croqui_NFe_Entrada');
    }

    // ========== Helper Methods ==========

    /**
     * Format number with Brazilian locale - trusts processed data
     */
    formatNumber(value, decimals = 2) {
        // Trust processed data - display N/D for missing values
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/D';
        }
        return value.toLocaleString('pt-BR', { 
            minimumFractionDigits: decimals, 
            maximumFractionDigits: decimals 
        });
    }

    /**
     * Format percentage - trusts processed data
     */
    formatPercent(value, total) {
        // Trust processed data - display N/D for invalid calculations
        if (value === null || value === undefined || total === null || total === undefined || total === 0) {
            return 'N/D';
        }
        const percent = (value / total) * 100;
        return this.formatNumber(percent, 2) + '%';
    }

    /**
     * Format date - ONLY for new Date objects (DIProcessor already formats DI dates)
     */
    formatDate(date) {
        // DIProcessor already formats DI dates to DD/MM/YYYY - only format new Date() objects
        if (date instanceof Date) {
            return date.toLocaleDateString('pt-BR');
        }
        
        // If it's already a string, trust it's processed by DIProcessor
        if (typeof date === 'string') {
            return date;
        }
        
        // For missing dates, return N/D instead of throwing error
        return 'N/D';
    }

    /**
     * Aplicar formatação monetária brasileira
     */
    applyCurrencyFormatting(ws, range) {
        this.styles.applyCurrencyStyle(ws, range);
    }
    
    /**
     * Aplicar formatação de percentual
     */
    applyPercentageFormatting(ws, range) {
        this.styles.applyPercentageStyle(ws, range);
    }
    
    /**
     * Aplicar formatação NCM com fonte monospace
     */
    applyNCMFormatting(ws, range) {
        this.styles.applyNCMStyle(ws, range);
    }
    
    /**
     * Aplicar zebra striping nas tabelas
     */
    applyZebraStriping(ws, startRow, endRow, startCol, endCol) {
        this.styles.applyZebraStriping(ws, startRow, endRow, startCol, endCol);
    }

    /**
     * Format CNPJ - DIProcessor already formats CNPJs to XX.XXX.XXX/XXXX-XX
     * This method only handles edge cases
     */
    formatCNPJ(cnpj) {
        // Trust DIProcessor formatting - CNPJs arrive already formatted
        if (!cnpj) {
            return 'N/D';
        }
        
        // Return as-is - DIProcessor already handles formatting
        return cnpj;
    }

    /**
     * Apply professional header style to worksheet cells
     */
    applyHeaderStyle(worksheet, range) {
        this.styles.applyHeaderStyle(worksheet, range);
    }
    
    /**
     * Apply secondary header style
     */
    applySecondaryHeaderStyle(ws, range) {
        this.styles.applySecondaryHeaderStyle(ws, range);
    }
    
    /**
     * Apply zebra striping to table data
     */
    applyZebraStriping(ws, startRow, endRow, startCol, endCol) {
        this.styles.applyZebraStriping(ws, startRow, endRow, startCol, endCol);
    }
    
    /**
     * Apply professional currency formatting
     */
    applyCurrencyFormatting(ws, range) {
        this.styles.applyCurrencyStyle(ws, range);
    }
    
    /**
     * Apply percentage formatting
     */
    applyPercentageFormatting(ws, range) {
        this.styles.applyPercentageStyle(ws, range);
    }

    /**
     * Calculate totals by column for summary sheets
     */
    calculateTotalsByColumn(adicoes) {
        return adicoes.reduce((totals, adicao) => {
            // Trust processed data structure from ComplianceCalculator
            const despesas = adicao.despesas_rateadas || {};
            const impostos = adicao.impostos || {};
            
            return {
                valor_aduaneiro: totals.valor_aduaneiro + adicao.valor_aduaneiro,
                frete: totals.frete + despesas.frete,
                seguro: totals.seguro + despesas.seguro,
                afrmm: totals.afrmm + despesas.afrmm,
                siscomex: totals.siscomex + despesas.siscomex,
                ii: totals.ii + impostos.ii,
                ipi: totals.ipi + impostos.ipi,
                pis: totals.pis + impostos.pis,
                cofins: totals.cofins + impostos.cofins,
                icms: totals.icms + impostos.icms,
                custo_total: totals.custo_total + adicao.custo_total
            };
        }, {
            valor_aduaneiro: 0, frete: 0, seguro: 0, afrmm: 0, siscomex: 0,
            ii: 0, ipi: 0, pis: 0, cofins: 0, icms: 0, custo_total: 0
        });
    }

    
    /**
     * Generate filename with DI number, date, and importer
     */
    generateFilename(numeroDI) {
        // Use processed data directly - no reprocessing
        const dataRegistro = this.diData.data_registro || 
            new Date().toLocaleDateString('pt-BR');
        
        // Clean importer name for filename
        const nomeImportador = this.diData.importador?.nome ? 
            this.diData.importador.nome
                .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
                .replace(/\s+/g, '_')          // Replace spaces with underscore
                .substring(0, 20)              // Limit to 20 characters
                .toUpperCase() : 
            'IMPORTADOR';
        
        const date = dataRegistro.replace(/\//g, '-');
        return `ExtratoDI_COMPLETO_${numeroDI}_${date}_${nomeImportador}.xlsx`;
    }

    /**
     * Download arquivo com formatação preservada (baseado no sistema original)
     */
    downloadArquivo(conteudo, nomeArquivo, mimeType) {
        const blob = new Blob([conteudo], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar URL para evitar vazamentos de memória
        window.URL.revokeObjectURL(url);
    }
}