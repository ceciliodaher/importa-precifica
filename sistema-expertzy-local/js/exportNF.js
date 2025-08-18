/**
 * Módulo de Exportação de Croqui de Nota Fiscal
 * Gera arquivo Excel profissional seguindo padrões brasileiros
 * Baseado no template fornecido em /orientacoes/Croquis-NF.pdf
 */

class NFExporter {
    constructor(diData) {
        this.diData = diData;
        this.workbook = null;
        this.worksheet = null;
        
        // Configurações de formatação
        this.styles = {
            header: {
                font: { bold: true, size: 12, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "091A30" } },
                border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
                alignment: { horizontal: "center", vertical: "center" }
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
     * Método principal para gerar o croqui
     * @returns {Promise<Buffer>} Buffer do arquivo Excel
     */
    async generateCroqui() {
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
            console.error('Erro ao gerar croqui:', error);
            throw new Error(`Falha na geração do croqui: ${error.message}`);
        }
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
     * Prepara dados do cabeçalho
     * @returns {Object} Dados do cabeçalho
     */
    prepareHeader() {
        // Extrair taxa de câmbio das informações complementares se disponível
        let cotacaoUSD = 5.3339; // Valor padrão
        
        if (this.diData.informacoes_complementares?.dados_extraidos) {
            const taxaCambio = this.diData.informacoes_complementares.dados_extraidos.taxa_cambio_fob;
            if (taxaCambio) {
                cotacaoUSD = taxaCambio;
            }
        }

        return {
            di_numero: this.diData.numero_di || '',
            data_registro: this.formatDateBR(this.diData.data_registro) || '',
            cotacao_usd: cotacaoUSD
        };
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
                const produtoFormatado = {
                    adicao: adicao.numero_adicao,
                    item: this.generateItemCode(itemCounter),
                    produto: this.formatProductDescription(produto.descricao_mercadoria),
                    ncm: adicao.ncm || '',
                    peso: adicao.peso_liquido || 0,
                    quant_cx: this.extractQuantityBoxes(produto),
                    quant_p_cx: this.extractQuantityPerBox(produto),
                    total_un: produto.quantidade || 0,
                    valor_unit_real: this.convertToReal(produto.valor_unitario),
                    valor_total: produto.valor_total_item || 0,
                    bc_icms: this.calculateBCICMS(adicao, produto),
                    valor_icms: this.calculateICMSValue(adicao, produto),
                    bc_ipi: this.calculateBCIPI(adicao, produto),
                    valor_ipi: this.calculateIPIValue(adicao, produto),
                    aliq_icms: this.getICMSRate(adicao),
                    aliq_ipi: this.getIPIRate(adicao),
                    mva: "0,00%", // MVA geralmente não aplicável na importação
                    bc_st: 0.00,  // ST não aplicável na importação
                    st: 0.00,     // ST não aplicável na importação
                    fp: 0.00      // FP específico por caso
                };

                produtos.push(produtoFormatado);
                itemCounter++;
            });
        });

        return produtos;
    }

    /**
     * Prepara dados dos totais
     * @returns {Object} Totais calculados
     */
    prepareTotals() {
        const totais = this.diData.totais || {};
        
        return {
            base_calculo_icms: this.calculateTotalBCICMS(),
            valor_icms: this.calculateTotalICMS(),
            valor_total_produtos: totais.valor_total_fob_brl || 0,
            total_frete: totais.valor_total_frete_brl || 0,
            valor_seguro: totais.valor_total_seguro_brl || 0,
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

        // Adicionar cabeçalho
        currentRow = this.addHeader(ws, data.header, currentRow);
        currentRow += 2; // Espaçamento

        // Adicionar título principal
        this.addCell(ws, 'A' + currentRow, 'CROQUI NOTA FISCAL DE ENTRADA', this.styles.title);
        currentRow += 2;

        // Adicionar cabeçalhos da tabela
        currentRow = this.addTableHeaders(ws, currentRow);

        // Adicionar produtos
        currentRow = this.addProducts(ws, data.produtos, currentRow);
        currentRow += 1;

        // Adicionar seção de cálculos
        const finalRow = this.addTaxCalculations(ws, data.totais, currentRow);

        // CORREÇÃO: Definir o range válido da planilha (!ref)
        // Isso é obrigatório para que o Excel reconheça a área de dados
        // Calcula automaticamente baseado nas células existentes
        const range = this.calculateWorksheetRange(ws);
        ws['!ref'] = range;
        
        // Debug: Log do range calculado
        console.log(`Range da planilha definido: ${range}`);

        // Definir larguras das colunas
        this.setColumnWidths(ws);

        return ws;
    }

    /**
     * Adiciona cabeçalho da DI
     * @param {Object} ws Worksheet
     * @param {Object} header Dados do cabeçalho
     * @param {number} row Linha atual
     * @returns {number} Próxima linha
     */
    addHeader(ws, header, row) {
        this.addCell(ws, 'A' + row, `DI: ${header.di_numero}`);
        this.addCell(ws, 'E' + row, `DATA DO REGISTRO: ${header.data_registro}`);
        this.addCell(ws, 'M' + row, `Cotação US$ ${header.cotacao_usd.toFixed(11)}`);
        
        return row + 1;
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
            this.addCell(ws, col + row, header, this.styles.header);
        });

        // Adicionar segunda linha de headers
        headers2.forEach((header, index) => {
            if (header) {
                const col = this.numberToColumn(index + 1);
                this.addCell(ws, col + (row + 1), header, this.styles.header);
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
            this.addCell(ws, 'A' + currentRow, produto.adicao);                    // Adição
            this.addCell(ws, 'B' + currentRow, produto.item);                      // ITEM
            this.addCell(ws, 'C' + currentRow, produto.produto);                   // PRODUTO
            this.addCell(ws, 'D' + currentRow, produto.ncm);                       // NCM
            this.addCell(ws, 'E' + currentRow, produto.peso);                      // PESO
            this.addCell(ws, 'F' + currentRow, produto.mva);                       // MVA
            this.addCell(ws, 'G' + currentRow, produto.bc_st, this.styles.currency); // BC ST
            this.addCell(ws, 'H' + currentRow, produto.st, this.styles.currency);  // ST
            this.addCell(ws, 'I' + currentRow, produto.fp, this.styles.currency);  // FP
            this.addCell(ws, 'J' + currentRow, produto.quant_cx);                  // QUANT CX
            this.addCell(ws, 'K' + currentRow, produto.quant_p_cx);                // QUANT P/CX
            this.addCell(ws, 'L' + currentRow, produto.total_un);                  // TOTAL UN
            this.addCell(ws, 'M' + currentRow, produto.valor_unit_real, this.styles.currency); // V. UNIT Real R$
            this.addCell(ws, 'N' + currentRow, produto.valor_total, this.styles.currency);     // V. TOTAL
            this.addCell(ws, 'O' + currentRow, produto.bc_icms, this.styles.currency);        // BC ICMS
            this.addCell(ws, 'P' + currentRow, produto.valor_icms, this.styles.currency);     // V.ICMS
            this.addCell(ws, 'Q' + currentRow, produto.bc_ipi, this.styles.currency);         // BC IPI
            this.addCell(ws, 'R' + currentRow, produto.valor_ipi, this.styles.currency);      // V.IPI
            this.addCell(ws, 'S' + currentRow, produto.aliq_icms, this.styles.percentage);    // ALIQ ICMS
            this.addCell(ws, 'T' + currentRow, produto.aliq_ipi, this.styles.percentage);     // ALIQ IPI

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
        this.addCell(ws, 'A' + currentRow, 'CÁLCULO DO IMPOSTO', this.styles.header);
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
        this.addCell(ws, 'J' + currentRow, totais.valor_total_nota, this.styles.currency);

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
     * Calcula Base de Cálculo do ICMS para o produto
     * @param {Object} adicao Dados da adição
     * @param {Object} produto Dados do produto
     * @returns {number} BC ICMS
     */
    calculateBCICMS(adicao, produto) {
        // BC ICMS = Valor FOB + II + IPI + Despesas Aduaneiras
        const valorFOB = produto.valor_total_item || 0;
        const ii = this.calculateProductII(adicao, produto);
        const ipi = this.calculateProductIPI(adicao, produto);
        
        return valorFOB + ii + ipi;
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
     * Calcula Base de Cálculo do IPI para o produto
     * @param {Object} adicao Dados da adição
     * @param {Object} produto Dados do produto
     * @returns {number} BC IPI
     */
    calculateBCIPI(adicao, produto) {
        // BC IPI = Valor FOB + II
        const valorFOB = produto.valor_total_item || 0;
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
     * Calcula II proporcional do produto
     * @param {Object} adicao Dados da adição
     * @param {Object} produto Dados do produto
     * @returns {number} Valor II proporcional
     */
    calculateProductII(adicao, produto) {
        const totalQuantidadeAdicao = adicao.produtos?.reduce((sum, p) => sum + (p.quantidade || 0), 0) || 1;
        const proporcao = (produto.quantidade || 0) / totalQuantidadeAdicao;
        
        return (adicao.tributos?.ii_valor_devido || 0) * proporcao;
    }

    /**
     * Calcula IPI proporcional do produto
     * @param {Object} adicao Dados da adição
     * @param {Object} produto Dados do produto
     * @returns {number} Valor IPI proporcional
     */
    calculateProductIPI(adicao, produto) {
        const totalQuantidadeAdicao = adicao.produtos?.reduce((sum, p) => sum + (p.quantidade || 0), 0) || 1;
        const proporcao = (produto.quantidade || 0) / totalQuantidadeAdicao;
        
        return (adicao.tributos?.ipi_valor_devido || 0) * proporcao;
    }

    /**
     * Obtém alíquota de ICMS formatada
     * @param {Object} adicao Dados da adição
     * @returns {string} Alíquota formatada (ex: "18%")
     */
    getICMSRate(adicao) {
        // Alíquota padrão de ICMS para importação (18%)
        return "18%";
    }

    /**
     * Obtém alíquota de ICMS como decimal
     * @param {Object} adicao Dados da adição
     * @returns {number} Alíquota decimal
     */
    getICMSRateDecimal(adicao) {
        return 0.18; // 18%
    }

    /**
     * Obtém alíquota de IPI formatada
     * @param {Object} adicao Dados da adição
     * @returns {string} Alíquota formatada
     */
    getIPIRate(adicao) {
        const aliquota = adicao.tributos?.ipi_aliquota_ad_valorem || 0;
        return `${(aliquota * 100).toFixed(2)}%`;
    }

    /**
     * Obtém alíquota de IPI como decimal
     * @param {Object} adicao Dados da adição
     * @returns {number} Alíquota decimal
     */
    getIPIRateDecimal(adicao) {
        return adicao.tributos?.ipi_aliquota_ad_valorem || 0;
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
     * Calcula valor total da nota
     * @returns {number} Valor total da nota
     */
    calculateTotalNota() {
        const totais = this.diData.totais || {};
        
        const valorProdutos = totais.valor_total_fob_brl || 0;
        const tributos = (totais.tributos_totais?.ii_total || 0) +
                        (totais.tributos_totais?.ipi_total || 0) +
                        (totais.tributos_totais?.pis_total || 0) +
                        (totais.tributos_totais?.cofins_total || 0);
        const icms = this.calculateTotalICMS();
        const frete = totais.valor_total_frete_brl || 0;
        const seguro = totais.valor_total_seguro_brl || 0;
        
        return valorProdutos + tributos + icms + frete + seguro;
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
     */
    downloadFile(buffer, filename) {
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        // Limpar URL
        window.URL.revokeObjectURL(url);
    }
}

// Função global para exportar croqui
async function exportarCroquisNF(diData) {
    try {
        console.log('Iniciando exportação do croqui NF...');
        
        const exporter = new NFExporter(diData);
        const buffer = await exporter.generateCroqui();
        
        // Gerar nome do arquivo
        const diNumero = diData.numero_di || 'DI';
        const dataAtual = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const filename = `Croqui_NF_${diNumero}_${dataAtual}.xlsx`;
        
        // Fazer download
        exporter.downloadFile(buffer, filename);
        
        console.log('Croqui NF exportado com sucesso:', filename);
        return true;
        
    } catch (error) {
        console.error('Erro na exportação do croqui:', error);
        alert(`Erro ao exportar croqui: ${error.message}`);
        return false;
    }
}