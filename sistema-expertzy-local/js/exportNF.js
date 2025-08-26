/**
 * Módulo de Exportação de Croqui de Nota Fiscal - Versão Profissional
 * Gera arquivo Excel/PDF profissional com layout empresarial
 * Integrado com sistema de múltiplas moedas
 * Baseado no modelo RASCUNHO NOTA FISCAL com branding Expertzy
 */

class NFExporter {
    constructor(diData) {
        this.diData = diData;
        this.workbook = null;
        this.worksheet = null;
        
        console.log('🏭 NFExporter: Inicializando com dados da DI:', diData.numero_di);
        console.log('💱 Moedas disponíveis:', diData.moedas);
        
        // Configurações de formatação profissional
        this.styles = {
            // Cabeçalho Expertzy
            expertzyHeader: {
                font: { bold: true, size: 16, color: { rgb: "1B4B73" } },
                fill: { fgColor: { rgb: "F8F9FA" } },
                border: { top: { style: "thick", color: { rgb: "1B4B73" } }, bottom: { style: "thick", color: { rgb: "1B4B73" } }, left: { style: "thick", color: { rgb: "1B4B73" } }, right: { style: "thick", color: { rgb: "1B4B73" } } },
                alignment: { horizontal: "center", vertical: "center" }
            },
            // Cabeçalhos de tabela
            tableHeader: {
                font: { bold: true, size: 10, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "1B4B73" } },
                border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
                alignment: { horizontal: "center", vertical: "center", wrapText: true }
            },
            title: {
                font: { bold: true, size: 14 },
                alignment: { horizontal: "center", vertical: "center" }
            },
            currency: {
                numFmt: '_-R$ * #,##0.00_-;-R$ * #,##0.00_-;_-R$ * "-"??_-;_-@_-',
                alignment: { horizontal: "right" }
            },
            percentage: {
                numFmt: '0.00%',
                alignment: { horizontal: "center" }
            },
            bordered: {
                border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
            }
        };
        
        // Larguras das colunas
        this.columnWidths = [
            8,   // Adição
            10,  // ITEM  
            35,  // PRODUTO
            12,  // NCM
            10,  // PESO
            10,  // QUANT CX
            12,  // QUANT P/CX
            12,  // TOTAL UN
            15,  // V. UNIT
            15,  // V. TOTAL
            15,  // BC ICMS
            15,  // V.ICMS
            15,  // BC IPI
            15,  // V.IPI
            12,  // ALIQ ICMS
            12,  // ALIQ IPI
            10,  // MVA
            12,  // BC ST
            12,  // ST
            8    // FP
        ];
    }

    /**
     * Método principal para gerar o croqui Excel
     * @returns {Promise<Buffer>} Buffer do arquivo Excel
     */
    async generateCroqui() {
        return this.generateExcel();
    }

    /**
     * Gera arquivo Excel
     * @returns {Promise<Buffer>} Buffer do arquivo Excel
     */
    async generateExcel() {
        try {
            // Verificar se SheetJS está disponível
            if (typeof XLSX === 'undefined') {
                throw new Error('Biblioteca SheetJS não encontrada. Verifique se está carregada.');
            }

            // Criar workbook
            this.workbook = XLSX.utils.book_new();
            
            // Preparar dados
            const croquisData = this.prepareCroquisData();
            
            // Criar worksheet
            this.worksheet = this.createWorksheet(croquisData);
            
            // Aplicar formatação
            this.applyFormatting();
            
            // Adicionar ao workbook
            XLSX.utils.book_append_sheet(this.workbook, this.worksheet, "Croqui NF");
            
            // Gerar buffer
            const buffer = XLSX.write(this.workbook, { 
                bookType: 'xlsx', 
                type: 'array',
                cellStyles: true 
            });
            
            return buffer;
            
        } catch (error) {
            console.error('Erro ao gerar croqui Excel:', error);
            throw new Error(`Falha na geração do croqui Excel: ${error.message}`);
        }
    }

    /**
     * Gera arquivo PDF
     * @returns {Promise<Buffer>} Buffer do arquivo PDF
     */
    async generatePDF() {
        try {
            // Verificar se jsPDF está disponível
            if (typeof window.jsPDF === 'undefined') {
                throw new Error('Biblioteca jsPDF não encontrada. Verifique se está carregada.');
            }

            const { jsPDF } = window;
            const doc = new jsPDF('landscape', 'mm', 'a4');
            
            // Preparar dados
            const croquisData = this.prepareCroquisData();
            
            // Adicionar cabeçalho
            this.addPDFHeader(doc, croquisData.header);
            
            // Adicionar tabela de produtos
            this.addPDFTable(doc, croquisData.produtos);
            
            // Adicionar totais
            this.addPDFTotals(doc, croquisData.totais);
            
            // Gerar buffer
            const pdfBuffer = doc.output('arraybuffer');
            
            return pdfBuffer;
            
        } catch (error) {
            console.error('Erro ao gerar croqui PDF:', error);
            throw new Error(`Falha na geração do croqui PDF: ${error.message}`);
        }
    }

    /**
     * Adiciona cabeçalho ao PDF
     * @param {Object} doc Documento jsPDF
     * @param {Object} header Dados do cabeçalho
     */
    addPDFHeader(doc, header) {
        // Logo/Empresa Expertzy
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(header.empresa, 20, 20);
        
        // Título do documento
        doc.setFontSize(14);
        doc.text('RASCUNHO NOTA FISCAL DE ENTRADA', 20, 35);
        
        // Informações da DI
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`DI: ${header.di_numero}`, 20, 50);
        doc.text(`DATA: ${header.data_registro}`, 100, 50);
        doc.text(`IMPORTADOR: ${header.importador.nome}`, 180, 50);
        
        // Informações de câmbio
        doc.text(`MOEDAS: ${header.moedas_utilizadas}`, 20, 60);
        doc.text(`CNPJ: ${header.importador.cnpj}`, 180, 60);
    }

    /**
     * Adiciona tabela de produtos ao PDF
     * @param {Object} doc Documento jsPDF
     * @param {Array} produtos Lista de produtos
     */
    addPDFTable(doc, produtos) {
        // Implementação básica - pode ser melhorada com autoTable
        let yPosition = 80;
        
        // Headers
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.text('Adição', 20, yPosition);
        doc.text('Item', 35, yPosition);
        doc.text('Produto', 55, yPosition);
        doc.text('NCM', 120, yPosition);
        doc.text('Peso', 140, yPosition);
        doc.text('Qtd', 160, yPosition);
        doc.text('V.Unit', 175, yPosition);
        doc.text('V.Total', 195, yPosition);
        doc.text('ICMS%', 215, yPosition);
        doc.text('IPI%', 235, yPosition);
        
        yPosition += 10;
        
        // Produtos
        doc.setFont(undefined, 'normal');
        produtos.forEach(produto => {
            if (yPosition > 180) { // Nova página se necessário
                doc.addPage();
                yPosition = 20;
            }
            
            doc.text(produto.adicao.toString(), 20, yPosition);
            doc.text(produto.item, 35, yPosition);
            doc.text(produto.produto.substring(0, 30), 55, yPosition);
            doc.text(produto.ncm, 120, yPosition);
            doc.text(produto.peso_kg.toFixed(2), 140, yPosition);
            doc.text(produto.quantidade.toString(), 160, yPosition);
            doc.text(this.formatCurrency(produto.valor_unitario_brl), 175, yPosition);
            doc.text(this.formatCurrency(produto.valor_total_brl), 195, yPosition);
            doc.text(produto.aliq_icms_pct, 215, yPosition);
            doc.text(produto.aliq_ipi_pct, 235, yPosition);
            
            yPosition += 8;
        });
    }

    /**
     * Adiciona totais ao PDF
     * @param {Object} doc Documento jsPDF
     * @param {Object} totais Dados dos totais
     */
    addPDFTotals(doc, totais) {
        let yPosition = 200;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('CÁLCULO DO IMPOSTO', 20, yPosition);
        
        yPosition += 15;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        
        doc.text(`Base Cálculo ICMS: ${this.formatCurrency(totais.base_calculo_icms)}`, 20, yPosition);
        doc.text(`Valor ICMS: ${this.formatCurrency(totais.valor_icms)}`, 80, yPosition);
        doc.text(`Valor II: ${this.formatCurrency(totais.valor_ii)}`, 140, yPosition);
        doc.text(`Valor IPI: ${this.formatCurrency(totais.valor_ipi)}`, 200, yPosition);
        
        yPosition += 10;
        doc.text(`PIS: ${this.formatCurrency(totais.pis)}`, 20, yPosition);
        doc.text(`COFINS: ${this.formatCurrency(totais.cofins)}`, 80, yPosition);
        doc.text(`VALOR TOTAL: ${this.formatCurrency(totais.valor_total_nota)}`, 140, yPosition);
    }

    /**
     * Formata valor como moeda
     * @param {number} value Valor numérico
     * @returns {string} Valor formatado
     */
    formatCurrency(value) {
        if (!value) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    /**
     * Prepara os dados da DI no formato do croqui
     * @returns {Object} Dados estruturados para o croqui
     */
    prepareCroquisData() {
        const data = {
            header: this.prepareHeader(),
            produtos: this.prepareProducts(),
            totais: this.prepareTotals()
        };
        
        console.log('Dados preparados para croqui:', data);
        return data;
    }

    /**
     * Prepara dados do cabeçalho com integração de múltiplas moedas
     * @returns {Object} Dados do cabeçalho profissional
     */
    prepareHeader() {
        const moedas = this.diData.moedas || {};
        
        console.log('💱 Preparando cabeçalho com múltiplas moedas:', moedas);
        
        // Usar sistema de múltiplas moedas em vez de taxa legada
        const moedasInfo = moedas.lista || [];
        const moedasTexto = moedasInfo.map(m => `${m.sigla}: ${m.taxa.toFixed(6)}`).join(' | ');
        
        return {
            empresa: 'EXPERTZY - SISTEMA DE IMPORTAÇÃO',
            di_numero: this.diData.numero_di || '',
            data_registro: this.formatDateBR(this.diData.data_registro) || '',
            importador: {
                nome: this.diData.importador?.nome || '',
                cnpj: this.diData.importador?.cnpj || ''
            },
            moedas_utilizadas: moedasTexto || 'USD: 5.3339',
            moeda_vmle: moedas.vmle_vmld?.sigla || 'USD',
            taxa_vmle: moedas.vmle_vmld?.taxa || 5.3339,
            total_moedas: moedas.total || 1
        };
    }

    /**
     * Converte valor de moeda específica para reais usando sistema de múltiplas moedas
     * @param {number} valor - Valor na moeda original
     * @param {string} codigoMoeda - Código da moeda (ex: '220' para USD, '860' para INR)
     * @returns {number} Valor convertido em reais
     */
    converterParaReais(valor, codigoMoeda = '220') {
        if (!valor || valor === 0) return 0;
        
        const moedas = this.diData.moedas?.lista || [];
        const moeda = moedas.find(m => m.codigo === codigoMoeda);
        
        if (moeda && moeda.taxa) {
            console.log(`💰 Convertendo ${valor} ${moeda.sigla} para reais (taxa: ${moeda.taxa})`);
            return valor * moeda.taxa;
        }
        
        // Fallback para taxa padrão USD se não encontrar
        const taxaPadrao = 5.3339;
        console.warn(`⚠️ Moeda ${codigoMoeda} não encontrada, usando taxa padrão USD: ${taxaPadrao}`);
        return valor * taxaPadrao;
    }

    /**
     * Converte totais para reais (método auxiliar para totais gerais)
     * @param {number} valor - Valor na moeda original
     * @param {string} codigoMoeda - Código da moeda
     * @returns {number} Valor convertido em reais
     */
    convertTotalToReais(valor, codigoMoeda = '220') {
        return this.converterParaReais(valor, codigoMoeda);
    }

    /**
     * Prepara dados dos produtos
     * @returns {Array} Lista de produtos formatada para o croqui
     */
    prepareProducts() {
        const produtos = [];
        let itemCounter = 1;

        if (!this.diData.adicoes || this.diData.adicoes.length === 0) {
            console.warn('Nenhuma adição encontrada na DI');
            return produtos;
        }

        this.diData.adicoes.forEach(adicao => {
            if (!adicao.produtos || adicao.produtos.length === 0) {
                console.warn(`Adição ${adicao.numero_adicao}: Nenhum produto encontrado`);
                return;
            }

            adicao.produtos.forEach(produto => {
                // CORREÇÃO: Acessar dados corretos da estrutura XML parser
                const codigoMoedaVcmv = adicao.moeda_negociacao_codigo || '220';
                
                // Converter valores para reais usando sistema de múltiplas moedas
                const valorUnitarioReais = this.converterParaReais(produto.valor_unitario, codigoMoedaVcmv);
                const valorTotalReais = this.converterParaReais(adicao.valor_moeda_negociacao, codigoMoedaVcmv);
                
                const produtoFormatado = {
                    adicao: adicao.numero_adicao,
                    item: this.generateItemCode(itemCounter),
                    produto: this.formatProductDescription(produto.descricao_mercadoria),
                    ncm: adicao.ncm || '',
                    peso_kg: (adicao.peso_liquido || 0) / 1000, // Converter de gramas para kg
                    quantidade: produto.quantidade || adicao.quantidade_estatistica || 0,
                    unidade: produto.unidade_medida || adicao.unidade_estatistica || 'UN',
                    valor_unitario_brl: valorUnitarioReais,
                    valor_total_brl: valorTotalReais,
                    // CORREÇÃO: Usar estrutura correta dos tributos do XML parser
                    base_icms_brl: this.calculateBCICMS(adicao, produto),
                    valor_icms_brl: this.calculateICMSValue(adicao, produto),
                    base_ipi_brl: this.calculateBCIPI(adicao, produto),
                    valor_ipi_brl: this.calculateIPIValue(adicao, produto),
                    valor_pis_brl: adicao.tributos?.pis_valor_devido || 0,
                    valor_cofins_brl: adicao.tributos?.cofins_valor_devido || 0,
                    // Alíquotas corrigidas
                    aliq_icms_pct: this.getICMSRate(adicao),
                    aliq_ipi_pct: this.getIPIRate(adicao),
                    // Dados da moeda original para referência
                    moeda_original: codigoMoedaVcmv,
                    valor_original: adicao.valor_moeda_negociacao || 0
                };

                produtos.push(produtoFormatado);
                itemCounter++;
            });
        });

        return produtos;
    }

    /**
     * Prepara dados dos totais convertidos para reais
     * @returns {Object} Totais calculados em BRL
     */
    prepareTotals() {
        const totais = this.diData.totais || {};
        const moedas = this.diData.moedas?.lista || [];
        
        // Converter valores totais para reais usando múltiplas moedas
        const valorTotalProdutosBRL = this.convertTotalToReais(totais.valor_total_fob || 0, totais.moeda_fob || '220');
        const totalFreteBRL = this.convertTotalToReais(totais.valor_total_frete || 0, totais.moeda_frete || '220');
        const valorSeguroBRL = this.convertTotalToReais(totais.valor_total_seguro || 0, totais.moeda_seguro || '220');
        
        return {
            base_calculo_icms: this.calculateTotalBCICMS(),
            valor_icms: this.calculateTotalICMS(),
            valor_total_produtos: valorTotalProdutosBRL,
            total_frete: totalFreteBRL,
            valor_seguro: valorSeguroBRL,
            total_desconto: 0.00, // Desconto não comum em importação
            valor_ii: totais.tributos_totais?.ii_total || 0,
            valor_ipi: totais.tributos_totais?.ipi_total || 0,
            pis: totais.tributos_totais?.pis_total || 0,
            cofins: totais.tributos_totais?.cofins_total || 0,
            valor_total_nota: this.calculateTotalNota(),
            outras_despesas: this.calculateOutrasDespesas()
        };
    }

    /**
     * Cria a planilha Excel com os dados
     * @param {Object} data Dados do croqui
     * @returns {Object} Worksheet
     */
    createWorksheet(data) {
        const ws = {};
        let currentRow = 1;

        // SEÇÃO 1: Cabeçalho com logo TWALOG
        this.addCell(ws, 'A1', 'TWALOG', { ...this.styles.expertzyHeader, font: { bold: true, size: 16, color: { rgb: "FF6600" } } });
        this.addMergedCell(ws, 'A1', 'T1');
        
        this.addCell(ws, 'A2', 'LOGÍSTICA INTERNACIONAL INTEGRADA', { ...this.styles.tableHeader, font: { size: 10 } });
        this.addMergedCell(ws, 'A2', 'T2');
        currentRow = 4;

        // SEÇÃO 2: Título Rascunho Nota Fiscal
        this.addCell(ws, 'A' + currentRow, 'Rascunho Nota Fiscal', this.styles.title);
        this.addMergedCell(ws, 'A' + currentRow, 'T' + currentRow);
        currentRow += 2;

        // SEÇÃO 3: Dados do Fornecedor (parte superior)
        const fornecedor = data.header.fornecedor || {};
        this.addCell(ws, 'A' + currentRow, 'Nome / Razão');
        this.addCell(ws, 'B' + currentRow, fornecedor.nome || '', this.styles.bordered);
        this.addMergedCell(ws, 'B' + currentRow, 'L' + currentRow);
        this.addCell(ws, 'M' + currentRow, 'CNPJ');
        this.addCell(ws, 'N' + currentRow, fornecedor.cnpj || '', this.styles.bordered);
        this.addMergedCell(ws, 'N' + currentRow, 'T' + currentRow);
        currentRow++;

        this.addCell(ws, 'A' + currentRow, 'Endereço');
        this.addCell(ws, 'B' + currentRow, fornecedor.endereco || '', this.styles.bordered);
        this.addMergedCell(ws, 'B' + currentRow, 'H' + currentRow);
        this.addCell(ws, 'I' + currentRow, 'Município');
        this.addCell(ws, 'J' + currentRow, fornecedor.municipio || '', this.styles.bordered);
        this.addMergedCell(ws, 'J' + currentRow, 'M' + currentRow);
        this.addCell(ws, 'N' + currentRow, 'UF');
        this.addCell(ws, 'O' + currentRow, fornecedor.uf || '', this.styles.bordered);
        this.addMergedCell(ws, 'O' + currentRow, 'T' + currentRow);
        currentRow += 2;

        // SEÇÃO 4: Cabeçalho da tabela de produtos
        this.addTableHeadersNF(ws, currentRow);
        currentRow++;

        // SEÇÃO 5: Produtos
        data.produtos.forEach(produto => {
            this.addCell(ws, 'A' + currentRow, produto.adicao);
            this.addCell(ws, 'B' + currentRow, produto.produto);
            this.addMergedCell(ws, 'B' + currentRow, 'E' + currentRow);
            this.addCell(ws, 'F' + currentRow, produto.ncm);
            this.addCell(ws, 'G' + currentRow, 'A'); // Classe Fiscal
            this.addCell(ws, 'H' + currentRow, ''); // CFO
            this.addCell(ws, 'I' + currentRow, 'UNI');
            this.addCell(ws, 'J' + currentRow, produto.quantidade, this.styles.currency);
            this.addCell(ws, 'K' + currentRow, produto.valor_unitario_brl, this.styles.currency);
            this.addCell(ws, 'L' + currentRow, produto.valor_total_brl, this.styles.currency);
            this.addCell(ws, 'M' + currentRow, produto.base_icms_brl, this.styles.currency);
            this.addCell(ws, 'N' + currentRow, produto.valor_icms_brl, this.styles.currency);
            this.addCell(ws, 'O' + currentRow, produto.valor_ipi_brl, this.styles.currency);
            this.addCell(ws, 'P' + currentRow, produto.valor_total_brl, this.styles.currency); // Base PIS/Cofins
            this.addCell(ws, 'Q' + currentRow, produto.valor_pis_brl, this.styles.currency);
            this.addCell(ws, 'R' + currentRow, produto.valor_cofins_brl, this.styles.currency);
            this.addCell(ws, 'S' + currentRow, ''); // CIF
            this.addCell(ws, 'T' + currentRow, ''); // Vl. II
            currentRow++;
        });

        // SEÇÃO 6: Totais
        currentRow = this.addTotalsNF(ws, data.totais, currentRow);

        // SEÇÃO 7: Dados do destinatário
        currentRow = this.addDestinatario(ws, data.header, currentRow);

        // SEÇÃO 8: Dados adicionais
        currentRow = this.addDadosAdicionais(ws, data.header, currentRow);

        // Definir range e larguras
        ws['!ref'] = `A1:T${currentRow}`;
        this.setColumnWidthsNF(ws);

        return ws;
    }

    /**
     * Adiciona cabeçalhos da tabela de produtos no formato NF
     */
    addTableHeadersNF(ws, row) {
        const headers = [
            'Código', 'Descrição', '', '', '', 'NCM', 'Class', 'CFO', 'UNI', 
            'Quant', 'Vl Unit', 'Vl Total', 'BASE ICMS', 'Vl. ICMS', 'Vl. IPI', 
            'BASE PIS/Cofins', 'Vl. PIS', 'Vl. Cofins', 'CIF', 'Vl. II'
        ];
        
        headers.forEach((header, index) => {
            const col = String.fromCharCode(65 + index); // A, B, C...
            this.addCell(ws, col + row, header, this.styles.tableHeader);
        });
    }

    /**
     * Adiciona seção de totais no formato NF
     */
    addTotalsNF(ws, totais, row) {
        // Linha de totais principais
        this.addCell(ws, 'A' + row, 'Base ICMS');
        this.addCell(ws, 'B' + row, totais.base_calculo_icms || 0, this.styles.currency);
        this.addCell(ws, 'C' + row, 'Valor ICMS');
        this.addCell(ws, 'D' + row, totais.valor_icms || 0, this.styles.currency);
        this.addCell(ws, 'E' + row, 'BCalc ICMS Subst');
        this.addCell(ws, 'F' + row, 0, this.styles.currency);
        this.addCell(ws, 'G' + row, 'VL ICMS Subst');
        this.addCell(ws, 'H' + row, 0, this.styles.currency);
        this.addCell(ws, 'I' + row, 'Vl Tot Base PIS/Cofins');
        this.addCell(ws, 'J' + row, totais.base_pis_cofins || 0, this.styles.currency);
        this.addCell(ws, 'K' + row, 'Vl Tot PIS');
        this.addCell(ws, 'L' + row, totais.pis || 0, this.styles.currency);
        this.addCell(ws, 'M' + row, 'Vl Tot Cofins');
        this.addCell(ws, 'N' + row, totais.cofins || 0, this.styles.currency);
        row++;

        // Segunda linha de totais
        this.addCell(ws, 'A' + row, 'Vl Desp.');
        this.addCell(ws, 'B' + row, totais.despesas_acessorias || 0, this.styles.currency);
        this.addCell(ws, 'C' + row, 'Vl Tot IPI');
        this.addCell(ws, 'D' + row, totais.valor_ipi || 0, this.styles.currency);
        this.addCell(ws, 'E' + row, 'Vl Tot Produtos');
        this.addCell(ws, 'F' + row, totais.valor_total_fob_brl || 0, this.styles.currency);
        this.addCell(ws, 'G' + row, 'Vl Total Nota');
        this.addCell(ws, 'H' + row, totais.valor_total_nota || 0, this.styles.currency);
        this.addCell(ws, 'I' + row, 'Vl Total CIF');
        this.addCell(ws, 'J' + row, totais.valor_total_cif || 0, this.styles.currency);
        
        return row + 2;
    }

    /**
     * Adiciona dados do destinatário
     */
    addDestinatario(ws, header, row) {
        const importador = header.importador || {};
        
        this.addCell(ws, 'A' + row, 'Nome / Razão');
        this.addCell(ws, 'B' + row, importador.nome || '', this.styles.bordered);
        this.addMergedCell(ws, 'B' + row, 'L' + row);
        
        this.addCell(ws, 'M' + row, 'Frete por conta');
        this.addCell(ws, 'N' + row, '1 - Emitente    2 - Destinatario', this.styles.bordered);
        this.addCell(ws, 'O' + row, '1', this.styles.bordered); // Assumindo emitente
        
        this.addCell(ws, 'P' + row, 'CNPJ');
        this.addCell(ws, 'Q' + row, importador.cnpj || '', this.styles.bordered);
        this.addMergedCell(ws, 'Q' + row, 'T' + row);
        row++;

        this.addCell(ws, 'A' + row, 'Endereço');
        this.addCell(ws, 'B' + row, importador.endereco || '', this.styles.bordered);
        this.addMergedCell(ws, 'B' + row, 'F' + row);
        
        this.addCell(ws, 'G' + row, 'Municipio');
        this.addCell(ws, 'H' + row, importador.municipio || '', this.styles.bordered);
        this.addMergedCell(ws, 'H' + row, 'K' + row);
        
        this.addCell(ws, 'L' + row, 'UF');
        this.addCell(ws, 'M' + row, importador.uf || '', this.styles.bordered);
        
        this.addCell(ws, 'N' + row, 'Insc. Estadual');
        this.addCell(ws, 'O' + row, importador.ie || '', this.styles.bordered);
        this.addMergedCell(ws, 'O' + row, 'T' + row);
        
        return row + 2;
    }

    /**
     * Adiciona dados adicionais da DI
     */
    addDadosAdicionais(ws, header, row) {
        this.addCell(ws, 'A' + row, 'DADOS ADICIONAIS', this.styles.tableHeader);
        this.addMergedCell(ws, 'A' + row, 'T' + row);
        row++;

        // Referências da DI
        this.addCell(ws, 'A' + row, `N/Ref.: ${header.referencia_twa || ''}`);
        this.addCell(ws, 'E' + row, `TAXA SISCOMEX.: ${header.taxa_siscomex || '154,23'}`);
        this.addCell(ws, 'I' + row, `VALOR TOTAL DO II.: ${header.valor_total_ii || '0,00'}`);
        row++;

        this.addCell(ws, 'A' + row, `S/Ref.: ${header.referencia_importador || ''}`);
        this.addCell(ws, 'E' + row, `VALOR TOTAL DO PIS.: ${header.valor_total_pis || '101,20'}`);
        row++;

        this.addCell(ws, 'A' + row, `Nº D.i.: ${header.di_numero || ''}`);
        this.addCell(ws, 'E' + row, `VALOR TOTAL DO COFINS.: ${header.valor_total_cofins || '465,05'}`);
        row++;

        this.addCell(ws, 'A' + row, `DT D.I.: ${header.data_registro || ''}`);
        this.addCell(ws, 'E' + row, `VLR. DESPESAS ACESSÓRIAS.: ${header.despesas_acessorias || '154,23'}`);
        
        return row + 2;
    }

    /**
     * Define larguras das colunas para formato NF
     */
    setColumnWidthsNF(ws) {
        const widths = [
            8,   // A - Código
            25,  // B - Descrição
            8,   // C
            8,   // D  
            8,   // E
            10,  // F - NCM
            6,   // G - Class
            6,   // H - CFO
            6,   // I - UNI
            8,   // J - Quant
            12,  // K - Vl Unit
            12,  // L - Vl Total
            12,  // M - BASE ICMS
            10,  // N - Vl ICMS
            10,  // O - Vl IPI
            12,  // P - BASE PIS/Cofins
            10,  // Q - Vl PIS
            10,  // R - Vl Cofins
            10,  // S - CIF
            10   // T - Vl II
        ];
        
        ws['!cols'] = widths.map(width => ({ wch: width }));
    }

    /**
     * Adiciona cabeçalho profissional da DI conforme template
     * @param {Object} ws Worksheet
     * @param {Object} header Dados do cabeçalho
     * @param {number} row Linha atual
     * @returns {number} Próxima linha
     */
    addHeader(ws, header, row) {
        // Linha 1: Logo/Empresa Expertzy
        this.addCell(ws, 'A' + row, header.empresa, this.styles.expertzyHeader);
        this.addMergedCell(ws, 'A' + row, 'T' + row); // Merge across full width
        row++;
        
        // Linha 2: Título do documento
        this.addCell(ws, 'A' + row, 'RASCUNHO NOTA FISCAL DE ENTRADA', this.styles.title);
        this.addMergedCell(ws, 'A' + row, 'T' + row);
        row++;
        
        // Linha 3: Informações da DI
        this.addCell(ws, 'A' + row, `DI: ${header.di_numero}`);
        this.addCell(ws, 'H' + row, `DATA: ${header.data_registro}`);
        this.addCell(ws, 'N' + row, `IMPORTADOR: ${header.importador.nome}`);
        row++;
        
        // Linha 4: Informações de câmbio e CNPJ
        this.addCell(ws, 'A' + row, `CÂMBIO: ${header.moedas_utilizadas}`);
        this.addCell(ws, 'N' + row, `CNPJ: ${header.importador.cnpj}`);
        row++;
        
        // Linha 5: Estado e ICMS aplicável
        const estado = this.detectarEstadoImportador();
        const icmsRate = this.getICMSRateDecimal();
        this.addCell(ws, 'A' + row, `ESTADO: ${estado} - ICMS: ${(icmsRate * 100).toFixed(0)}%`);
        row++;
        
        return row + 1; // Espaçamento adicional
    }

    /**
     * Adiciona cabeçalhos da tabela de produtos conforme template PDF
     * @param {Object} ws Worksheet
     * @param {number} row Linha atual
     * @returns {number} Próxima linha
     */
    addTableHeaders(ws, row) {
        // Primeira linha de headers (principal)
        const headers1 = [
            'Adição', 'ITEM', 'PRODUTO', 'NCM', 'PESO', 'MVA', 'BC ST', 'ST', 'FP', 
            'QUANT CX', 'QUANT P/CX', 'TOTAL UN', 'VALOR DA MERCADORIA', '', 
            'BC ICMS', 'V.ICMS', 'BC IPI', 'V.IPI', 'ALIQ ICMS', 'ALIQ IPI'
        ];

        // Segunda linha de headers (sub-headers)
        const headers2 = [
            '', '', '', '', '', '', '', '', '', '', '', '', 
            'V. UNIT Real R$', 'V. TOTAL', '', '', '', '', '', ''
        ];

        // Adicionar primeira linha de headers
        headers1.forEach((header, index) => {
            const col = this.numberToColumn(index + 1);
            this.addCell(ws, col + row, header, this.styles.tableHeader);
        });

        // Adicionar segunda linha de headers
        headers2.forEach((header, index) => {
            if (header) {
                const col = this.numberToColumn(index + 1);
                this.addCell(ws, col + (row + 1), header, this.styles.tableHeader);
            }
        });

        return row + 2; // Duas linhas de headers
    }

    /**
     * Adiciona produtos à tabela conforme template PDF
     * @param {Object} ws Worksheet
     * @param {Array} produtos Lista de produtos
     * @param {number} startRow Linha inicial
     * @returns {number} Próxima linha
     */
    addProducts(ws, produtos, startRow) {
        let currentRow = startRow;

        produtos.forEach(produto => {
            // Ordem das colunas conforme template PDF
            this.addCell(ws, 'A' + currentRow, produto.adicao);                                    // Adição
            this.addCell(ws, 'B' + currentRow, produto.item);                                      // ITEM
            this.addCell(ws, 'C' + currentRow, produto.produto);                                   // PRODUTO
            this.addCell(ws, 'D' + currentRow, produto.ncm);                                       // NCM
            this.addCell(ws, 'E' + currentRow, produto.peso_kg, { numFmt: '0.000' });              // PESO
            this.addCell(ws, 'F' + currentRow, '-');                                               // MVA (não aplicável)
            this.addCell(ws, 'G' + currentRow, '-');                                               // BC ST (não aplicável)
            this.addCell(ws, 'H' + currentRow, '-');                                               // ST (não aplicável)
            this.addCell(ws, 'I' + currentRow, '-');                                               // FP (não aplicável)
            this.addCell(ws, 'J' + currentRow, this.extractQuantityBoxes(produto));                // QUANT CX
            this.addCell(ws, 'K' + currentRow, this.extractQuantityPerBox(produto));               // QUANT P/CX
            this.addCell(ws, 'L' + currentRow, produto.quantidade);                                 // TOTAL UN
            this.addCell(ws, 'M' + currentRow, produto.valor_unitario_brl, this.styles.currency); // V. UNIT Real R$
            this.addCell(ws, 'N' + currentRow, produto.valor_total_brl, this.styles.currency);     // V. TOTAL
            this.addCell(ws, 'O' + currentRow, produto.base_icms_brl, this.styles.currency);       // BC ICMS
            this.addCell(ws, 'P' + currentRow, produto.valor_icms_brl, this.styles.currency);      // V.ICMS
            this.addCell(ws, 'Q' + currentRow, produto.base_ipi_brl, this.styles.currency);        // BC IPI
            this.addCell(ws, 'R' + currentRow, produto.valor_ipi_brl, this.styles.currency);       // V.IPI
            this.addCell(ws, 'S' + currentRow, produto.aliq_icms_pct);                             // ALIQ ICMS
            this.addCell(ws, 'T' + currentRow, produto.aliq_ipi_pct);                              // ALIQ IPI

            currentRow++;
        });

        return currentRow;
    }

    /**
     * Adiciona seção de cálculos tributários conforme template PDF
     * @param {Object} ws Worksheet
     * @param {Object} totais Dados dos totais
     * @param {number} startRow Linha inicial
     * @returns {number} Próxima linha
     */
    addTaxCalculations(ws, totais, startRow) {
        let currentRow = startRow;
        
        // Título da seção
        this.addCell(ws, 'A' + currentRow, 'CÁLCULO DO IMPOSTO', this.styles.tableHeader);
        currentRow += 2;

        // Layout conforme template PDF
        // Primeira linha: Base de Cálculo do ICMS | VALOR DO ICMS | BC ST | ICMS ST | VALOR TOTAL DOS PRODUTOS | Total do Frete | Valor do Seguro | Total do Desconto | VALOR DO II | Outras Despesas Acessórias
        this.addCell(ws, 'A' + currentRow, 'Base de Cálculo do ICMS');
        this.addCell(ws, 'B' + currentRow, 'VALOR DO ICMS');
        this.addCell(ws, 'C' + currentRow, 'BC ST');
        this.addCell(ws, 'D' + currentRow, 'ICMS ST');
        this.addCell(ws, 'E' + currentRow, 'VALOR TOTAL DOS PRODUTOS');
        this.addCell(ws, 'F' + currentRow, 'Total do Frete');
        this.addCell(ws, 'G' + currentRow, 'Valor do Seguro');
        this.addCell(ws, 'H' + currentRow, 'Total do Desconto');
        this.addCell(ws, 'I' + currentRow, 'VALOR DO II');
        this.addCell(ws, 'J' + currentRow, 'Outras Despesas Acessórias');
        currentRow++;

        // Segunda linha: Valores correspondentes
        this.addCell(ws, 'A' + currentRow, totais.base_calculo_icms, this.styles.currency);
        this.addCell(ws, 'B' + currentRow, totais.valor_icms, this.styles.currency);
        this.addCell(ws, 'C' + currentRow, '-'); // BC ST não aplicável em importação
        this.addCell(ws, 'D' + currentRow, '-'); // ICMS ST não aplicável em importação
        this.addCell(ws, 'E' + currentRow, totais.valor_total_produtos, this.styles.currency);
        this.addCell(ws, 'F' + currentRow, totais.total_frete, this.styles.currency);
        this.addCell(ws, 'G' + currentRow, totais.valor_seguro, this.styles.currency);
        this.addCell(ws, 'H' + currentRow, totais.total_desconto, this.styles.currency);
        this.addCell(ws, 'I' + currentRow, totais.valor_ii, this.styles.currency);
        this.addCell(ws, 'J' + currentRow, totais.outras_despesas, this.styles.currency);
        currentRow += 2;

        // Terceira linha: PIS | COFINS | VALOR DO IPI | VALOR TOTAL DA NOTA
        this.addCell(ws, 'A' + currentRow, 'PIS');
        this.addCell(ws, 'B' + currentRow, 'COFINS');
        this.addCell(ws, 'I' + currentRow, 'VALOR DO IPI');
        this.addCell(ws, 'J' + currentRow, 'VALOR TOTAL DA NOTA');
        currentRow++;

        // Quarta linha: Valores PIS/COFINS/IPI/Total
        this.addCell(ws, 'A' + currentRow, totais.pis, this.styles.currency);
        this.addCell(ws, 'B' + currentRow, totais.cofins, this.styles.currency);
        this.addCell(ws, 'I' + currentRow, totais.valor_ipi, this.styles.currency);
        this.addCell(ws, 'J' + currentRow, this.calculateTotalNota(), this.styles.currency);

        return currentRow + 1;
    }

    // ========== MÉTODOS AUXILIARES ==========

    /**
     * Adiciona célula com valor e estilo
     * @param {Object} ws Worksheet
     * @param {string} address Endereço da célula (ex: 'A1')
     * @param {*} value Valor
     * @param {Object} style Estilo opcional
     */
    addCell(ws, address, value, style = null) {
        if (!ws[address]) {
            ws[address] = {};
        }
        
        // Tratar valores nulos/undefined
        if (value === null || value === undefined) {
            value = '';
        }
        
        ws[address].v = value;
        
        // Definir tipo da célula baseado no valor
        if (typeof value === 'number' && !isNaN(value)) {
            ws[address].t = 'n';
        } else if (typeof value === 'boolean') {
            ws[address].t = 'b';
        } else {
            ws[address].t = 's';
            // Converter para string se não for
            ws[address].v = String(value);
        }
        
        if (style) {
            ws[address].s = style;
        }
        
        // Aplicar bordas padrão
        if (!ws[address].s) {
            ws[address].s = {};
        }
        ws[address].s = { ...ws[address].s, ...this.styles.bordered };
    }

    /**
     * Adiciona célula mesclada
     * @param {Object} ws Worksheet
     * @param {string} startCell Célula inicial (ex: 'A1')
     * @param {string} endCell Célula final (ex: 'T1')
     */
    addMergedCell(ws, startCell, endCell) {
        if (!ws['!merges']) {
            ws['!merges'] = [];
        }
        
        // Extrair coordenadas
        const startMatch = startCell.match(/^([A-Z]+)(\d+)$/);
        const endMatch = endCell.match(/^([A-Z]+)(\d+)$/);
        
        if (startMatch && endMatch) {
            const startCol = this.columnToNumber(startMatch[1]) - 1;
            const startRow = parseInt(startMatch[2]) - 1;
            const endCol = this.columnToNumber(endMatch[1]) - 1;
            const endRow = parseInt(endMatch[2]) - 1;
            
            ws['!merges'].push({
                s: { r: startRow, c: startCol },
                e: { r: endRow, c: endCol }
            });
        }
    }

    /**
     * Gera código do item (IC0001, IC0002, etc.)
     * @param {number} counter Contador
     * @returns {string} Código do item
     */
    generateItemCode(counter) {
        return `IC${counter.toString().padStart(4, '0')}`;
    }

    /**
     * Formata descrição do produto
     * @param {string} descricao Descrição original
     * @returns {string} Descrição formatada
     */
    formatProductDescription(descricao) {
        if (!descricao) return '';
        
        // Limitar a 80 caracteres e converter para maiúsculas
        return descricao.toUpperCase().substring(0, 80);
    }

    /**
     * Converte valor USD para Real usando taxa de câmbio
     * @param {number} valorUSD Valor em USD
     * @returns {number} Valor em Real
     */
    convertToReal(valorUSD) {
        if (!valorUSD) return 0;
        
        const taxaCambio = this.diData.informacoes_complementares?.dados_extraidos?.taxa_cambio_fob || 5.3339;
        return valorUSD * taxaCambio;
    }

    /**
     * Formata data brasileira
     * @param {string} dateString Data no formato DDMMAAAA
     * @returns {string} Data formatada DD/MM/AA
     */
    formatDateBR(dateString) {
        if (!dateString) return '';
        
        if (dateString.includes('/')) {
            // Já está formatada como DD/MM/AAAA, converter para DD/MM/AA
            const parts = dateString.split('/');
            if (parts.length === 3) {
                return `${parts[0]}/${parts[1]}/${parts[2].substring(2)}`;
            }
        }
        
        return dateString;
    }

    /**
     * Converte número para letra da coluna (1=A, 2=B, etc.)
     * @param {number} num Número da coluna
     * @returns {string} Letra da coluna
     */
    numberToColumn(num) {
        let result = '';
        while (num > 0) {
            num--;
            result = String.fromCharCode(65 + (num % 26)) + result;
            num = Math.floor(num / 26);
        }
        return result;
    }

    /**
     * Define larguras das colunas
     * @param {Object} ws Worksheet
     */
    setColumnWidths(ws) {
        ws['!cols'] = this.columnWidths.map(width => ({ wch: width }));
    }

    /**
     * Calcula o range da planilha baseado nas células existentes
     * @param {Object} ws Worksheet
     * @returns {string} Range no formato 'A1:T10'
     */
    calculateWorksheetRange(ws) {
        const cellAddresses = Object.keys(ws).filter(key => !key.startsWith('!'));
        
        if (cellAddresses.length === 0) {
            return 'A1:A1'; // Range mínimo se não houver células
        }

        let minRow = Infinity, maxRow = -Infinity;
        let minCol = Infinity, maxCol = -Infinity;

        cellAddresses.forEach(address => {
            const match = address.match(/^([A-Z]+)(\d+)$/);
            if (match) {
                const colStr = match[1];
                const row = parseInt(match[2]);
                const col = this.columnToNumber(colStr);

                minRow = Math.min(minRow, row);
                maxRow = Math.max(maxRow, row);
                minCol = Math.min(minCol, col);
                maxCol = Math.max(maxCol, col);
            }
        });

        const startCell = this.numberToColumn(minCol) + minRow;
        const endCell = this.numberToColumn(maxCol) + maxRow;
        
        return `${startCell}:${endCell}`;
    }

    /**
     * Converte letra da coluna para número (A=1, B=2, etc.)
     * @param {string} col Letra da coluna
     * @returns {number} Número da coluna
     */
    columnToNumber(col) {
        let result = 0;
        for (let i = 0; i < col.length; i++) {
            result = result * 26 + (col.charCodeAt(i) - 65 + 1);
        }
        return result;
    }

    /**
     * Aplica formatação geral
     */
    applyFormatting() {
        // Formatação será aplicada durante a criação das células
        // Este método pode ser expandido para formatações adicionais
    }

    // ========== MÉTODOS DE CÁLCULO ==========

    /**
     * Extrai quantidade de caixas do produto
     * @param {Object} produto Dados do produto
     * @returns {number} Quantidade de caixas
     */
    extractQuantityBoxes(produto) {
        // Lógica para extrair quantidade de caixas
        // Por simplicidade, assumindo 1 caixa por padrão
        return 1;
    }

    /**
     * Extrai quantidade por caixa
     * @param {Object} produto Dados do produto
     * @returns {number} Quantidade por caixa
     */
    extractQuantityPerBox(produto) {
        // Por simplicidade, assumindo quantidade total = quantidade por caixa
        return produto.quantidade || 0;
    }

    /**
     * ===== CORREÇÃO CRÍTICA: Calcula Base de Cálculo do ICMS conforme legislação =====
     * Inclui despesas aduaneiras e aplica fórmula "por dentro"
     * @param {Object} adicao Dados da adição
     * @param {Object} produto Dados do produto
     * @returns {number} BC ICMS em BRL
     */
    calculateBCICMS(adicao, produto) {
        // Base antes ICMS = Valor FOB + II + IPI + PIS + COFINS + Despesas Aduaneiras
        const codigoMoeda = adicao.moeda_negociacao_codigo || '220';
        const valorFOB = this.converterParaReais(produto.valor_total_item || adicao.valor_moeda_negociacao || 0, codigoMoeda);
        const ii = this.calculateProductII(adicao, produto);
        const ipi = this.calculateProductIPI(adicao, produto);
        const pis = this.calculateProductPIS(adicao, produto);
        const cofins = this.calculateProductCOFINS(adicao, produto);
        
        let baseAntesICMS = valorFOB + ii + ipi + pis + cofins;
        
        // ===== CORREÇÃO CRÍTICA: Adicionar despesas aduaneiras rateadas =====
        if (this.diData.despesas_aduaneiras?.total_despesas_aduaneiras) {
            const rateioDespesas = this.ratearDespesasPorProduto(adicao, produto);
            baseAntesICMS += rateioDespesas;
            console.log(`💰 Despesas aduaneiras rateadas incluídas: R$ ${rateioDespesas.toFixed(2)}`);
        }
        
        // ===== APLICAR FÓRMULA "POR DENTRO" CONFORME LEGISLAÇÃO =====
        const aliquotaICMS = this.getICMSRateDecimal(adicao);
        const fatorDivisao = 1 - aliquotaICMS;
        const baseICMSFinal = baseAntesICMS / fatorDivisao;
        
        console.log(`📊 Cálculo Base ICMS (ExportNF):
        - Valor FOB: R$ ${valorFOB.toFixed(2)}
        - II: R$ ${ii.toFixed(2)}
        - IPI: R$ ${ipi.toFixed(2)}
        - PIS: R$ ${pis.toFixed(2)}
        - COFINS: R$ ${cofins.toFixed(2)}
        - Despesas: R$ ${(this.diData.despesas_aduaneiras?.total_despesas_aduaneiras ? this.ratearDespesasPorProduto(adicao, produto) : 0).toFixed(2)}
        - Base antes ICMS: R$ ${baseAntesICMS.toFixed(2)}
        - Alíquota ICMS: ${(aliquotaICMS * 100).toFixed(2)}%
        - Fator divisão: ${fatorDivisao.toFixed(4)}
        - Base ICMS final: R$ ${baseICMSFinal.toFixed(2)}`);
        
        return baseICMSFinal;
    }

    /**
     * Calcula valor do ICMS para o produto
     * @param {Object} adicao Dados da adição
     * @param {Object} produto Dados do produto
     * @returns {number} Valor ICMS
     */
    calculateICMSValue(adicao, produto) {
        const bcICMS = this.calculateBCICMS(adicao, produto);
        const aliquota = this.getICMSRateDecimal(adicao);
        
        return bcICMS * aliquota;
    }

    /**
     * Calcula Base de Cálculo do IPI para o produto em reais
     * @param {Object} adicao Dados da adição
     * @param {Object} produto Dados do produto
     * @returns {number} BC IPI em BRL
     */
    calculateBCIPI(adicao, produto) {
        // BC IPI = Valor FOB + II
        const codigoMoeda = adicao.moeda_negociacao_codigo || '220';
        const valorFOB = this.converterParaReais(produto.valor_total_item || adicao.valor_moeda_negociacao || 0, codigoMoeda);
        const ii = this.calculateProductII(adicao, produto);
        
        return valorFOB + ii;
    }

    /**
     * Calcula valor do IPI para o produto
     * @param {Object} adicao Dados da adição
     * @param {Object} produto Dados do produto
     * @returns {number} Valor IPI
     */
    calculateIPIValue(adicao, produto) {
        const bcIPI = this.calculateBCIPI(adicao, produto);
        const aliquota = this.getIPIRateDecimal(adicao);
        
        return bcIPI * aliquota;
    }

    /**
     * Calcula II do produto aplicando alíquota sobre base de cálculo
     * @param {Object} adicao Dados da adição
     * @param {Object} produto Dados do produto
     * @returns {number} Valor II calculado
     */
    calculateProductII(adicao, produto) {
        // Base II = Valor Aduaneiro (FOB)
        const codigoMoeda = adicao.moeda_negociacao_codigo || '220';
        const baseII = this.converterParaReais(produto.valor_total_item || adicao.valor_moeda_negociacao || 0, codigoMoeda);
        
        // Alíquota II da adição
        const aliquotaII = (adicao.tributos?.ii_aliquota_ad_valorem || 0) / 100;
        
        const valorII = baseII * aliquotaII;
        
        console.log(`💰 Cálculo II produto:
        - Base II (FOB): R$ ${baseII.toFixed(2)}
        - Alíquota II: ${(aliquotaII * 100).toFixed(2)}%
        - Valor II: R$ ${valorII.toFixed(2)}`);
        
        return valorII;
    }

    /**
     * Calcula IPI do produto aplicando alíquota sobre base de cálculo
     * @param {Object} adicao Dados da adição
     * @param {Object} produto Dados do produto
     * @returns {number} Valor IPI calculado
     */
    calculateProductIPI(adicao, produto) {
        // Base IPI = Valor Aduaneiro (FOB) + II
        const codigoMoeda = adicao.moeda_negociacao_codigo || '220';
        const valorFOB = this.converterParaReais(produto.valor_total_item || adicao.valor_moeda_negociacao || 0, codigoMoeda);
        const valorII = this.calculateProductII(adicao, produto);
        const baseIPI = valorFOB + valorII;
        
        // Alíquota IPI da adição
        const aliquotaIPI = (adicao.tributos?.ipi_aliquota_ad_valorem || 0) / 100;
        
        const valorIPI = baseIPI * aliquotaIPI;
        
        console.log(`💰 Cálculo IPI produto:
        - Valor FOB: R$ ${valorFOB.toFixed(2)}
        - Valor II: R$ ${valorII.toFixed(2)}
        - Base IPI: R$ ${baseIPI.toFixed(2)}
        - Alíquota IPI: ${(aliquotaIPI * 100).toFixed(2)}%
        - Valor IPI: R$ ${valorIPI.toFixed(2)}`);
        
        return valorIPI;
    }

    /**
     * Calcula PIS do produto aplicando alíquota sobre base de cálculo
     * Conforme legislação: Base PIS = Valor Aduaneiro (desde 2014)
     * @param {Object} adicao Dados da adição
     * @param {Object} produto Dados do produto
     * @returns {number} Valor PIS calculado
     */
    calculateProductPIS(adicao, produto) {
        // Base PIS = Valor Aduaneiro (VMLD) - Exclusivamente desde out/2014
        const codigoMoeda = adicao.moeda_negociacao_codigo || '220';
        const valorAduaneiro = this.converterParaReais(produto.valor_total_item || adicao.valor_moeda_negociacao || 0, codigoMoeda);
        
        // Alíquota PIS padrão para importação: 1,65%
        const aliquotaPIS = (adicao.tributos?.pis_aliquota_ad_valorem || 1.65) / 100;
        
        const valorPIS = valorAduaneiro * aliquotaPIS;
        
        console.log(`💰 Cálculo PIS produto:
        - Valor Aduaneiro: R$ ${valorAduaneiro.toFixed(2)}
        - Alíquota PIS: ${(aliquotaPIS * 100).toFixed(2)}%
        - Valor PIS: R$ ${valorPIS.toFixed(2)}`);
        
        return valorPIS;
    }

    /**
     * Calcula COFINS do produto aplicando alíquota sobre base de cálculo
     * Conforme legislação: Base COFINS = Valor Aduaneiro (desde 2014)
     * @param {Object} adicao Dados da adição
     * @param {Object} produto Dados do produto
     * @returns {number} Valor COFINS calculado
     */
    calculateProductCOFINS(adicao, produto) {
        // Base COFINS = Valor Aduaneiro (VMLD) - Exclusivamente desde out/2014
        const codigoMoeda = adicao.moeda_negociacao_codigo || '220';
        const valorAduaneiro = this.converterParaReais(produto.valor_total_item || adicao.valor_moeda_negociacao || 0, codigoMoeda);
        
        // Alíquota COFINS padrão para importação: 7,60%
        const aliquotaCOFINS = (adicao.tributos?.cofins_aliquota_ad_valorem || 7.60) / 100;
        
        const valorCOFINS = valorAduaneiro * aliquotaCOFINS;
        
        console.log(`💰 Cálculo COFINS produto:
        - Valor Aduaneiro: R$ ${valorAduaneiro.toFixed(2)}
        - Alíquota COFINS: ${(aliquotaCOFINS * 100).toFixed(2)}%
        - Valor COFINS: R$ ${valorCOFINS.toFixed(2)}`);
        
        return valorCOFINS;
    }

    /**
     * Rateia despesas aduaneiras por produto baseado no valor FOB
     * @param {Object} adicao Dados da adição
     * @param {Object} produto Dados do produto
     * @returns {number} Valor das despesas rateadas para o produto
     */
    ratearDespesasPorProduto(adicao, produto) {
        const despesasTotal = this.diData.despesas_aduaneiras?.total_despesas_aduaneiras || 0;
        
        if (despesasTotal === 0) {
            return 0;
        }
        
        // Calcular valor FOB total da DI para rateio
        const valorFOBTotalDI = this.diData.totais?.valor_total_fob_brl || 0;
        
        if (valorFOBTotalDI === 0) {
            console.warn('⚠️ Valor FOB total da DI é zero, não é possível ratear despesas');
            return 0;
        }
        
        // Valor FOB do produto específico
        const codigoMoeda = adicao.moeda_negociacao_codigo || '220';
        const valorFOBProduto = this.converterParaReais(produto.valor_total_item || adicao.valor_moeda_negociacao || 0, codigoMoeda);
        
        // Calcular proporção
        const proporcao = valorFOBProduto / valorFOBTotalDI;
        const despesasRateadas = despesasTotal * proporcao;
        
        console.log(`📊 Rateio despesas aduaneiras:
        - Despesas total: R$ ${despesasTotal.toFixed(2)}
        - Valor FOB produto: R$ ${valorFOBProduto.toFixed(2)}
        - Valor FOB total DI: R$ ${valorFOBTotalDI.toFixed(2)}
        - Proporção: ${(proporcao * 100).toFixed(2)}%
        - Despesas rateadas: R$ ${despesasRateadas.toFixed(2)}`);
        
        return despesasRateadas;
    }

    /**
     * Obtém alíquota de ICMS formatada baseada no estado do importador
     * @param {Object} adicao Dados da adição
     * @returns {string} Alíquota formatada (ex: "19%" para Goiás)
     */
    getICMSRate(adicao) {
        const aliquotaDecimal = this.getICMSRateDecimal(adicao);
        return `${(aliquotaDecimal * 100).toFixed(0)}%`;
    }

    /**
     * Obtém alíquota de ICMS como decimal baseada no estado do importador
     * @param {Object} adicao Dados da adição
     * @returns {number} Alíquota decimal
     */
    getICMSRateDecimal(adicao) {
        const estado = this.detectarEstadoImportador();
        
        // Alíquotas de ICMS por estado para importação
        const aliquotasICMS = {
            'GO': 0.19,  // Goiás: 19%
            'SP': 0.18,  // São Paulo: 18%
            'RJ': 0.18,  // Rio de Janeiro: 18%
            'MG': 0.18,  // Minas Gerais: 18%
            'SC': 0.17,  // Santa Catarina: 17%
            'ES': 0.17,  // Espírito Santo: 17%
            'PR': 0.18,  // Paraná: 18%
            'RS': 0.18,  // Rio Grande do Sul: 18%
            'default': 0.18  // Padrão: 18%
        };
        
        return aliquotasICMS[estado] || aliquotasICMS['default'];
    }

    /**
     * Detecta estado do importador baseado nos dados da DI
     * @returns {string} Código do estado (ex: 'GO', 'SP')
     */
    detectarEstadoImportador() {
        const importador = this.diData.importador;
        
        console.log('🔍 DEBUG ICMS - Dados do importador:', importador);
        
        if (!importador) {
            console.warn('Dados do importador não encontrados, usando ICMS padrão');
            return 'default';
        }
        
        // CORREÇÃO: Buscar UF no campo correto (endereco_uf)
        const uf = importador.endereco_uf || importador.uf;
        if (uf) {
            console.log(`✅ Estado detectado por UF: ${uf}`);
            return uf.toUpperCase();
        }
        
        // Detectar por CEP se disponível
        const cep = importador.endereco_cep || importador.cep;
        if (cep) {
            const estado = this.detectarEstadoPorCEP(cep);
            if (estado) {
                console.log(`✅ Estado detectado por CEP: ${estado}`);
                return estado;
            }
        }
        
        // Detectar por cidade/endereço se disponível
        const cidade = importador.endereco_cidade || importador.cidade;
        if (cidade) {
            const estado = this.detectarEstadoPorCidade(cidade);
            if (estado) {
                console.log(`✅ Estado detectado por cidade: ${estado}`);
                return estado;
            }
        }
        
        console.warn('❌ Não foi possível detectar estado do importador, usando ICMS padrão');
        console.log('🔍 Dados disponíveis:', {
            endereco_uf: importador.endereco_uf,
            uf: importador.uf,
            endereco_cep: importador.endereco_cep,
            cep: importador.cep,
            endereco_cidade: importador.endereco_cidade,
            cidade: importador.cidade
        });
        return 'default';
    }

    /**
     * Detecta estado por CEP
     * @param {string} cep CEP do importador
     * @returns {string|null} Código do estado ou null
     */
    detectarEstadoPorCEP(cep) {
        if (!cep) return null;
        
        const cepNumerico = cep.replace(/\D/g, '');
        const prefixo = parseInt(cepNumerico.substring(0, 2));
        
        // Faixas de CEP por estado (principais)
        if (prefixo >= 72 && prefixo <= 73) return 'GO'; // Goiás
        if (prefixo >= 1 && prefixo <= 19) return 'SP';   // São Paulo
        if (prefixo >= 20 && prefixo <= 28) return 'RJ';  // Rio de Janeiro
        if (prefixo >= 30 && prefixo <= 39) return 'MG';  // Minas Gerais
        if (prefixo >= 88 && prefixo <= 89) return 'SC';  // Santa Catarina
        if (prefixo >= 29 && prefixo <= 29) return 'ES';  // Espírito Santo
        
        return null;
    }

    /**
     * Detecta estado por cidade (fallback)
     * @param {string} cidade Cidade do importador
     * @returns {string|null} Código do estado ou null
     */
    detectarEstadoPorCidade(cidade) {
        if (!cidade) return null;
        
        const cidadeUpper = cidade.toUpperCase();
        
        // Principais cidades por estado
        const cidadesPorEstado = {
            'GO': ['GOIANIA', 'GOIÂNIA', 'ANAPOLIS', 'ANÁPOLIS', 'APARECIDA DE GOIANIA'],
            'SP': ['SAO PAULO', 'SÃO PAULO', 'CAMPINAS', 'SANTOS', 'GUARULHOS'],
            'RJ': ['RIO DE JANEIRO', 'NITEROI', 'NITERÓI', 'DUQUE DE CAXIAS'],
            'MG': ['BELO HORIZONTE', 'UBERLANDIA', 'UBERLÂNDIA', 'CONTAGEM'],
            'SC': ['FLORIANOPOLIS', 'FLORIANÓPOLIS', 'JOINVILLE', 'BLUMENAU'],
            'ES': ['VITORIA', 'VITÓRIA', 'VILA VELHA', 'CARIACICA']
        };
        
        for (const [estado, cidades] of Object.entries(cidadesPorEstado)) {
            if (cidades.some(c => cidadeUpper.includes(c))) {
                return estado;
            }
        }
        
        return null;
    }

    /**
     * Obtém alíquota de IPI formatada
     * @param {Object} adicao Dados da adição
     * @returns {string} Alíquota formatada
     */
    getIPIRate(adicao) {
        // CORREÇÃO: XML já vem com valor em %, não precisa multiplicar por 100
        const aliquota = adicao.tributos?.ipi_aliquota_ad_valorem || 0;
        return `${aliquota.toFixed(2)}%`;
    }

    /**
     * Obtém alíquota de IPI como decimal
     * @param {Object} adicao Dados da adição
     * @returns {number} Alíquota decimal
     */
    getIPIRateDecimal(adicao) {
        // CORREÇÃO: Converter % para decimal (6.5% -> 0.065)
        const aliquota = adicao.tributos?.ipi_aliquota_ad_valorem || 0;
        return aliquota / 100;
    }

    /**
     * Calcula total da Base de Cálculo do ICMS
     * @returns {number} Total BC ICMS
     */
    calculateTotalBCICMS() {
        let total = 0;
        
        this.diData.adicoes?.forEach(adicao => {
            adicao.produtos?.forEach(produto => {
                total += this.calculateBCICMS(adicao, produto);
            });
        });
        
        return total;
    }

    /**
     * Calcula total do ICMS
     * @returns {number} Total ICMS
     */
    calculateTotalICMS() {
        let total = 0;
        
        this.diData.adicoes?.forEach(adicao => {
            adicao.produtos?.forEach(produto => {
                total += this.calculateICMSValue(adicao, produto);
            });
        });
        
        return total;
    }

    /**
     * ===== CORREÇÃO CRÍTICA: Calcula valor total da nota conforme cálculo correto =====
     * Soma todos os componentes: produtos + tributos + ICMS + despesas
     * @returns {number} Valor total da nota em BRL
     */
    calculateTotalNota() {
        const totais = this.diData.totais || {};
        
        // Converter valores base para reais usando sistema de múltiplas moedas
        const valorProdutos = this.convertTotalToReais(totais.valor_total_fob || 0, totais.moeda_fob || '220');
        const frete = this.convertTotalToReais(totais.valor_total_frete || 0, totais.moeda_frete || '220');
        const seguro = this.convertTotalToReais(totais.valor_total_seguro || 0, totais.moeda_seguro || '220');
        
        // Tributos federais
        const tributosFederais = (totais.tributos_totais?.ii_total || 0) +
                                (totais.tributos_totais?.ipi_total || 0) +
                                (totais.tributos_totais?.pis_total || 0) +
                                (totais.tributos_totais?.cofins_total || 0);
        
        // ICMS calculado
        const icms = this.calculateTotalICMS();
        
        // Despesas aduaneiras
        const despesasAduaneiras = this.diData.despesas_aduaneiras?.total_despesas_aduaneiras || 0;
        
        const totalNota = valorProdutos + tributosFederais + icms + frete + seguro + despesasAduaneiras;
        
        console.log(`📊 Cálculo Total Nota (ExportNF):
        - Valor produtos: R$ ${valorProdutos.toFixed(2)}
        - Tributos federais: R$ ${tributosFederais.toFixed(2)}
        - ICMS: R$ ${icms.toFixed(2)}
        - Frete: R$ ${frete.toFixed(2)}
        - Seguro: R$ ${seguro.toFixed(2)}
        - Despesas aduaneiras: R$ ${despesasAduaneiras.toFixed(2)}
        - VALOR TOTAL DA NOTA: R$ ${totalNota.toFixed(2)}`);
        
        // Validação: comparar com base ICMS total
        const baseICMSTotal = this.calculateTotalBCICMS();
        const diferenca = Math.abs(totalNota - baseICMSTotal);
        
        if (diferenca > 0.01) {
            console.warn(`⚠️ DIVERGÊNCIA detectada:
            - Total Nota: R$ ${totalNota.toFixed(2)}
            - Base ICMS: R$ ${baseICMSTotal.toFixed(2)}
            - Diferença: R$ ${diferenca.toFixed(2)}`);
        } else {
            console.log(`✅ Validação OK: Total Nota = Base ICMS (diferença: R$ ${diferenca.toFixed(2)})`);
        }
        
        return totalNota;
    }

    /**
     * Calcula outras despesas acessórias
     * @returns {number} Outras despesas
     */
    calculateOutrasDespesas() {
        // Outras despesas podem incluir SISCOMEX, AFRMM, etc.
        const info = this.diData.informacoes_complementares?.dados_extraidos || {};
        
        return (info.siscomex_valor || 0) + (info.afrmm_valor || 0);
    }

    /**
     * Inicia download do arquivo
     * @param {Buffer} buffer Buffer do arquivo
     * @param {string} filename Nome do arquivo
     * @param {string} mimeType Tipo MIME do arquivo
     */
    downloadFile(buffer, filename, mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const blob = new Blob([buffer], { type: mimeType });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        // Limpar URL
        window.URL.revokeObjectURL(url);
    }
}

// Função global para gerar croqui Excel (renomeada para evitar conflito com globals.js)
async function gerarCroquisNF(diData) {
    return gerarCroquisExcel(diData);
}

// Função para gerar croqui Excel
async function gerarCroquisExcel(diData) {
    try {
        console.log('Iniciando geração do croqui NF Excel...');
        console.log('Dados da DI recebidos:', diData ? `DI ${diData.numero_di}` : 'undefined');
        
        if (!diData) {
            throw new Error('Dados da DI não fornecidos');
        }
        
        const exporter = new NFExporter(diData);
        const buffer = await exporter.generateExcel();
        
        // Gerar nome do arquivo
        const diNumero = diData.numero_di || 'DI';
        const dataAtual = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const filename = `Croqui_NF_${diNumero}_${dataAtual}.xlsx`;
        
        // Fazer download
        exporter.downloadFile(buffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        console.log('Croqui NF Excel exportado com sucesso:', filename);
        return true;
        
    } catch (error) {
        console.error('Erro na exportação do croqui Excel:', error);
        alert(`Erro ao exportar croqui Excel: ${error.message}`);
        return false;
    }
}

// Função para gerar croqui PDF
async function gerarCroquisPDF(diData) {
    try {
        console.log('Iniciando geração do croqui NF PDF...');
        console.log('Dados da DI recebidos:', diData ? `DI ${diData.numero_di}` : 'undefined');
        
        if (!diData) {
            throw new Error('Dados da DI não fornecidos');
        }
        
        const exporter = new NFExporter(diData);
        const buffer = await exporter.generatePDF();
        
        // Gerar nome do arquivo
        const diNumero = diData.numero_di || 'DI';
        const dataAtual = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const filename = `Croqui_NF_${diNumero}_${dataAtual}.pdf`;
        
        // Fazer download
        exporter.downloadFile(buffer, filename, 'application/pdf');
        
        console.log('Croqui NF PDF exportado com sucesso:', filename);
        return true;
        
    } catch (error) {
        console.error('Erro na exportação do croqui PDF:', error);
        alert(`Erro ao exportar croqui PDF: ${error.message}`);
        return false;
    }
}