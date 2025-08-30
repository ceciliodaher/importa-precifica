/**
 * Módulo de Exportação de Croqui de Nota Fiscal
 * Sistema Expertzy - Importação e Precificação
 * 
 * @author Sistema Expertzy
 * @version 2.0.0
 * @description Gera croqui de NF em Excel e PDF seguindo padrão brasileiro
 */

class CroquiNFExporter {
    constructor(diData) {
        this.di = diData;
        this.empresa = 'EXPERTZY';
        this.subtitulo = 'SISTEMA DE IMPORTAÇÃO E PRECIFICAÇÃO';
        this.versao = '2.0.0';
        
        // Instância do calculador de itens individuais
        this.itemCalculator = new ItemCalculator();
        
        // Configurações de impostos por estado
        this.aliquotasICMS = {
            'GO': 19.00,  // Goiás
            'SP': 18.00,  // São Paulo
            'RJ': 20.00,  // Rio de Janeiro
            'MG': 18.00,  // Minas Gerais
            'SC': 17.00,  // Santa Catarina
            'ES': 17.00,  // Espírito Santo
            'RS': 18.00,  // Rio Grande do Sul
            'PR': 18.00,  // Paraná
            'BA': 18.00,  // Bahia
            'PE': 18.00,  // Pernambuco
            'CE': 18.00,  // Ceará
            'DEFAULT': 18.00
        };
        
        console.log('🏭 CroquiNFExporter v2.0: Inicializando com DI:', diData.numero_di);
        
        this.initializeStyles();
        // Prepare data será chamado assincronamente pelos métodos de export
    }
    
    initializeStyles() {
        this.excelStyles = {
            header: {
                font: { bold: true, size: 14, color: { rgb: "003366" } },
                fill: { fgColor: { rgb: "E8F1F8" } },
                alignment: { horizontal: "center", vertical: "center" }
            },
            subtitle: {
                font: { bold: false, size: 11, color: { rgb: "003366" } },
                alignment: { horizontal: "center", vertical: "center" }
            },
            tableHeader: {
                font: { bold: true, size: 9, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "003366" } },
                border: { 
                    top: { style: "thin", color: { rgb: "000000" } }, 
                    bottom: { style: "thin", color: { rgb: "000000" } }, 
                    left: { style: "thin", color: { rgb: "000000" } }, 
                    right: { style: "thin", color: { rgb: "000000" } } 
                },
                alignment: { horizontal: "center", vertical: "center", wrapText: true }
            },
            cell: {
                border: { 
                    top: { style: "thin", color: { rgb: "CCCCCC" } }, 
                    bottom: { style: "thin", color: { rgb: "CCCCCC" } }, 
                    left: { style: "thin", color: { rgb: "CCCCCC" } }, 
                    right: { style: "thin", color: { rgb: "CCCCCC" } } 
                }
            },
            currency: {
                numFmt: '"R$" #,##0.00',
                alignment: { horizontal: "right" },
                border: { 
                    top: { style: "thin", color: { rgb: "CCCCCC" } }, 
                    bottom: { style: "thin", color: { rgb: "CCCCCC" } }, 
                    left: { style: "thin", color: { rgb: "CCCCCC" } }, 
                    right: { style: "thin", color: { rgb: "CCCCCC" } } 
                }
            },
            percentage: {
                numFmt: '0.00"%"',
                alignment: { horizontal: "center" },
                border: { 
                    top: { style: "thin", color: { rgb: "CCCCCC" } }, 
                    bottom: { style: "thin", color: { rgb: "CCCCCC" } }, 
                    left: { style: "thin", color: { rgb: "CCCCCC" } }, 
                    right: { style: "thin", color: { rgb: "CCCCCC" } } 
                }
            },
            totalsHeader: {
                font: { bold: true, size: 10, color: { rgb: "003366" } },
                fill: { fgColor: { rgb: "F0F0F0" } },
                border: { 
                    top: { style: "medium", color: { rgb: "000000" } }, 
                    bottom: { style: "thin", color: { rgb: "000000" } }, 
                    left: { style: "thin", color: { rgb: "000000" } }, 
                    right: { style: "thin", color: { rgb: "000000" } } 
                }
            },
            totalsValue: {
                font: { bold: true, size: 10 },
                numFmt: '"R$" #,##0.00',
                alignment: { horizontal: "right" },
                border: { 
                    top: { style: "thin", color: { rgb: "000000" } }, 
                    bottom: { style: "medium", color: { rgb: "000000" } }, 
                    left: { style: "thin", color: { rgb: "000000" } }, 
                    right: { style: "thin", color: { rgb: "000000" } } 
                }
            }
        };
    }
    
    // ========== PREPARAÇÃO DE DADOS ==========
    
    async prepareAllData() {
        console.log('📊 Preparando dados do croqui...');
        this.header = this.prepareHeader();
        this.produtos = await this.prepareProdutos();
        this.totais = this.prepareTotais();
        console.log('✅ Dados preparados:', { 
            produtos: this.produtos.length, 
            totais: this.totais 
        });
        
    }
    
    prepareHeader() {
        const importador = this.di.importador || {};
        const fornecedor = this.extractFornecedor();
        
        // Taxa de câmbio
        let taxaCambio = 5.3928; // Default
        if (this.di.moedas?.lista?.length > 0) {
            const moedaPrincipal = this.di.moedas.lista[0];
            if (moedaPrincipal.taxa_conversao) {
                taxaCambio = moedaPrincipal.taxa_conversao;
            }
        }
        
        return {
            empresa: this.empresa,
            subtitulo: this.subtitulo,
            di_numero: this.di.numero_di,
            data_registro: this.formatDate(this.di.data_registro),
            data_hora: new Date().toLocaleString('pt-BR'),
            
            importador: {
                nome: importador.nome,
                cnpj: this.formatCNPJ(importador.cnpj),
                endereco: importador.endereco_completo || `${importador.endereco_logradouro || ''}, ${importador.endereco_numero || ''}`.trim(),
                complemento: importador.endereco_complemento || '',
                bairro: importador.endereco_bairro || '',
                municipio: importador.endereco_municipio,
                uf: importador.endereco_uf || '',
                cep: this.formatCEP(importador.endereco_cep),
                ie: importador.inscricao_estadual || ''
            },
            
            fornecedor: fornecedor,
            
            // Referências
            referencia_twa: this.extractReferenciaTWA(),
            referencia_importador: this.extractReferenciaImportador(),
            
            // Taxa de câmbio
            moedas: this.di.moedas,
            taxa_cambio: taxaCambio.toFixed(8)
        };
    }
    
    async prepareProdutos() {
        const produtos = [];
        let itemCounter = 1;
        
        // Sincronizar configurações ICMS com interface se disponível
        if (window.icmsConfig) {
            this.itemCalculator.atualizarConfigICMS(window.icmsConfig);
        }
        
        // Processar cada adição usando ItemCalculator
        for (const adicao of this.di.adicoes) {
            console.log(`📊 Processando adição ${adicao.numero_adicao} com ItemCalculator...`);
            
            // Processar itens da adição
            const resultadoAdicao = this.itemCalculator.processarItensAdicao(
                adicao,
                this.di.despesas_aduaneiras,
                this.di.despesasExtras
            );
            
            // Mostrar resultado da validação
            if (!resultadoAdicao.validacao.ok) {
                console.warn(`⚠️ Validação falhou para adição ${adicao.numero_adicao}:`, resultadoAdicao.validacao.diferencas);
            }
            
            // Converter para formato do croqui
            resultadoAdicao.itens.forEach(itemCalculado => {
                const produto = itemCalculado.produto;
                const tributos = itemCalculado.tributos;
                
                const produtoProcessado = {
                    // Identificação
                    adicao: adicao.numero_adicao || '001',
                    item: this.generateItemCode(itemCounter),
                    descricao: this.formatDescription(produto.descricao),
                    ncm: produto.ncm || '',
                    
                    // Quantidades
                    peso_kg: produto.peso_kg,
                    quant_cx: 1, // Default
                    quant_por_cx: produto.quantidade,
                    total_un: produto.quantidade,
                    
                    // Valores em R$
                    valor_unitario: produto.valor_unitario,
                    valor_total: itemCalculado.valorItem,
                    
                    // Base de Cálculo e Impostos (INDIVIDUAIS)
                    bc_icms: itemCalculado.baseICMS,
                    valor_icms: itemCalculado.valorICMS,
                    bc_ipi: itemCalculado.valorItem + tributos.ii.valor, // Base IPI
                    valor_ipi: tributos.ipi.valor,
                    
                    // ALÍQUOTAS
                    aliq_icms: itemCalculado.aliquotaICMS,
                    aliq_ipi: tributos.ipi.aliquota,
                    
                    // Substituição Tributária
                    mva: '-',
                    bc_st: 0,
                    valor_st: 0,
                    fp: '-',
                    
                    // PIS/COFINS (INDIVIDUAIS)
                    valor_pis: tributos.pis.valor,
                    valor_cofins: tributos.cofins.valor,
                    
                    // Valores II individuais
                    valor_ii: tributos.ii.valor,
                    aliq_ii: tributos.ii.aliquota,
                    
                    // Dados do rateio de despesas
                    rateio_despesas: itemCalculado.rateio,
                    custo_total_item: itemCalculado.custoTotalItem
                };
                
                produtos.push(produtoProcessado);
                itemCounter++;
            });
            
            console.log(`✅ Adição ${adicao.numero_adicao} processada: ${resultadoAdicao.itens.length} itens`);
        }
        
        return produtos;
    }
    
    prepareTotais() {
        // Calcular totais a partir dos produtos processados
        const totais = {
            base_calculo_icms: 0,
            valor_icms: 0,
            base_calculo_icms_st: 0,
            valor_icms_st: 0,
            valor_total_produtos: 0,
            valor_frete: this.di.totais?.valor_frete || 0,
            valor_seguro: this.di.totais?.valor_seguro || 0,
            valor_desconto: 0,
            outras_despesas: this.di.totais?.despesas_aduaneiras || 0,
            valor_ii: this.di.totais?.valor_total_ii || 0,
            valor_ipi: 0,
            valor_pis: 0,
            valor_cofins: 0,
            valor_total_nota: 0
        };
        
        // Somar valores dos produtos
        this.produtos.forEach(produto => {
            totais.base_calculo_icms += produto.bc_icms;
            totais.valor_icms += produto.valor_icms;
            totais.valor_total_produtos += produto.valor_total;
            totais.valor_ipi += produto.valor_ipi;
            totais.valor_pis += produto.valor_pis;
            totais.valor_cofins += produto.valor_cofins;
        });
        
        // ===== CALCULAR TOTAL DA NOTA CONFORME LEGISLAÇÃO =====
        // Para importação, total da nota = Base ICMS (que já inclui mercadoria + tributos + despesas)
        // O ICMS não é cobrado na importação (fica exonerado), mas a base é usada para o total
        totais.valor_total_nota = totais.base_calculo_icms;
        
        return totais;
    }
    
    // ========== MÉTODOS DE CÁLCULO ==========
    
    getAliquotaICMS() {
        const uf = this.di.importador?.endereco_uf || 'DEFAULT';
        const aliquota = this.aliquotasICMS[uf] || this.aliquotasICMS.DEFAULT;
        console.log(`📊 Alíquota ICMS para ${uf}: ${aliquota}%`);
        return aliquota;
    }
    
    getAliquotaIPI(adicao) {
        // IPI já vem convertido pelo XMLParser (6.50%)
        const aliquota = adicao.tributos?.ipi_aliquota_ad_valorem || 0;
        console.log(`📊 Alíquota IPI da adição ${adicao.numero_adicao}: ${aliquota}%`);
        return aliquota;
    }
    
    calculateBaseICMS(adicao, valorMercadoria) {
        // ===== FÓRMULA OFICIAL CONFORME LEGISLAÇÃO =====
        // Base ICMS = (VMLD + II + IPI + PIS + COFINS + Rateio Despesas) / (1 - alíquota ICMS)
        
        let baseAntesICMS = valorMercadoria;
        
        // Adicionar tributos (já convertidos pelo XMLParser)
        if (adicao.tributos?.ii_valor_devido) {
            baseAntesICMS += adicao.tributos.ii_valor_devido;
        }
        
        if (adicao.tributos?.ipi_valor_devido) {
            baseAntesICMS += adicao.tributos.ipi_valor_devido;
        }
        
        if (adicao.tributos?.pis_valor_devido) {
            baseAntesICMS += adicao.tributos.pis_valor_devido;
        }
        
        if (adicao.tributos?.cofins_valor_devido) {
            baseAntesICMS += adicao.tributos.cofins_valor_devido;
        }
        
        // ===== RATEIO PROPORCIONAL DE DESPESAS (CORREÇÃO CRÍTICA) =====
        const rateioAduaneiras = this.calcularRateioDespesasAduaneiras(adicao);
        const rateioExtras = this.calcularRateioDespesasExtras(adicao);
        
        baseAntesICMS += rateioAduaneiras + rateioExtras;
        
        console.log(`📊 Cálculo Base ICMS para adição ${adicao.numero_adicao}:
        - Valor mercadoria: R$ ${valorMercadoria.toFixed(2)}
        - Rateio despesas aduaneiras: R$ ${rateioAduaneiras.toFixed(2)}
        - Rateio despesas extras: R$ ${rateioExtras.toFixed(2)}
        - Base antes ICMS: R$ ${baseAntesICMS.toFixed(2)}`);
        
        // ===== APLICAR FÓRMULA "POR DENTRO" =====
        const aliquotaICMS = this.getAliquotaICMS();
        const fatorDivisao = 1 - (aliquotaICMS / 100);
        const baseICMS = baseAntesICMS / fatorDivisao;
        
        return baseICMS;
    }
    
    calcularRateioDespesasAduaneiras(adicao) {
        // Ratear despesas aduaneiras proporcionalmente ao valor CIF da adição
        if (!this.di.despesas_aduaneiras?.total_despesas_aduaneiras) {
            return 0;
        }
        
        const valorAdicao = adicao.valor_reais || 0;
        const valorTotalDI = this.calcularValorTotalDI();
        
        if (valorTotalDI === 0) return 0;
        
        const percentualAdicao = valorAdicao / valorTotalDI;
        const rateio = this.di.despesas_aduaneiras.total_despesas_aduaneiras * percentualAdicao;
        
        console.log(`📊 Rateio despesas aduaneiras - Adição ${adicao.numero_adicao}:
        - Valor adição: R$ ${valorAdicao.toFixed(2)}
        - Total DI: R$ ${valorTotalDI.toFixed(2)}
        - Percentual: ${(percentualAdicao * 100).toFixed(4)}%
        - Rateio: R$ ${rateio.toFixed(2)}`);
        
        return rateio;
    }
    
    calcularRateioDespesasExtras(adicao) {
        // Ratear despesas extras que compõem base ICMS
        if (!this.di.despesasExtras) {
            return 0;
        }
        
        const despesasICMS = this.di.despesasExtras.filter(d => d.includeInICMS);
        const totalDespesasICMS = despesasICMS.reduce((sum, d) => sum + d.value, 0);
        
        if (totalDespesasICMS === 0) return 0;
        
        const valorAdicao = adicao.valor_reais || 0;
        const valorTotalDI = this.calcularValorTotalDI();
        
        if (valorTotalDI === 0) return 0;
        
        const percentualAdicao = valorAdicao / valorTotalDI;
        const rateio = totalDespesasICMS * percentualAdicao;
        
        console.log(`📊 Rateio despesas extras - Adição ${adicao.numero_adicao}:
        - Total despesas ICMS: R$ ${totalDespesasICMS.toFixed(2)}
        - Percentual: ${(percentualAdicao * 100).toFixed(4)}%
        - Rateio: R$ ${rateio.toFixed(2)}`);
        
        return rateio;
    }
    
    calcularValorTotalDI() {
        // Somar valores de todas as adições para base do rateio
        if (!this.di.adicoes) return 0;
        
        return this.di.adicoes.reduce((total, adicao) => {
            return total + (adicao.valor_reais || 0);
        }, 0);
    }
    
    calculateBaseIPI(adicao, valorMercadoria) {
        // Base IPI = Valor da Mercadoria + II
        let base = valorMercadoria;
        
        // Adicionar II se houver (já convertido pelo XMLParser)
        if (adicao.tributos?.ii_valor_devido) {
            base += adicao.tributos.ii_valor_devido;
        }
        
        return base;
    }
    
    convertToReais(valor, adicao) {
        // Obter código da moeda e taxa de conversão
        const codigoMoeda = adicao.moeda_negociacao_codigo || '220'; // 220 = USD
        
        // Buscar taxa de conversão
        let taxa = 5.3928; // Default
        if (this.di.moedas?.lista) {
            const moeda = this.di.moedas.lista.find(m => m.codigo === codigoMoeda);
            if (moeda?.taxa_conversao) {
                taxa = moeda.taxa_conversao;
            }
        }
        
        return valor * taxa;
    }
    
    // ========== MÉTODOS AUXILIARES ==========
    
    generateItemCode(counter) {
        return `IC${String(counter).padStart(4, '0')}`;
    }
    
    formatDescription(descricao) {
        if (!descricao) return '';
        // Limpar e formatar descrição
        return descricao
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase()
            .substring(0, 100);
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        
        // Se já está formatada DD/MM/AAAA
        if (dateString.includes('/')) {
            return dateString;
        }
        
        // Se está em formato AAAAMMDD
        if (dateString.length === 8) {
            const ano = dateString.substring(0, 4);
            const mes = dateString.substring(4, 6);
            const dia = dateString.substring(6, 8);
            return `${dia}/${mes}/${ano}`;
        }
        
        return dateString;
    }
    
    formatCNPJ(cnpj) {
        if (!cnpj) return '';
        const numbers = cnpj.replace(/\D/g, '');
        if (numbers.length !== 14) return cnpj;
        return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    formatCEP(cep) {
        if (!cep) return '';
        const numbers = cep.replace(/\D/g, '');
        if (numbers.length !== 8) return cep;
        return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
    
    extractFornecedor() {
        // Extrair dados do fornecedor das adições (baseado na análise XML)
        if (this.di.adicoes && this.di.adicoes.length > 0) {
            const primeiraAdicao = this.di.adicoes[0];
            const fornecedor = primeiraAdicao.fornecedor;
            return {
                nome: fornecedor?.nome || '',
                endereco: `${fornecedor?.logradouro || ''}, ${fornecedor?.cidade || ''}`.trim(),
                pais: primeiraAdicao.pais_aquisicao_nome || '',
                cnpj: ''
            };
        }
        return { nome: '', endereco: '', pais: '', cnpj: '' };
    }
    
    extractReferenciaTWA() {
        // Buscar referência TWA nas informações complementares
        if (this.di.informacao_complementar) {
            const match = this.di.informacao_complementar.match(/Nossa Referência[.:]+\s*([^\s\n]+)/i);
            if (match) return match[1];
        }
        return '';
    }
    
    extractReferenciaImportador() {
        // Buscar referência do importador nas informações complementares
        if (this.di.informacao_complementar) {
            const match = this.di.informacao_complementar.match(/REF\.IMPORTADOR[.:]+\s*([^\s\n]+)/i);
            if (match) return match[1];
        }
        return '';
    }
    
    getDespesaAduaneira(tipo) {
        // Extrair despesas aduaneiras das informações complementares
        if (!this.di.informacao_complementar) return '0,00';
        
        const info = this.di.informacao_complementar;
        let pattern;
        
        switch(tipo) {
            case 'siscomex':
                pattern = /Taxa Siscomex[.:]+\s*([\d,]+)/i;
                break;
            case 'afrmm':
                pattern = /VALOR AFRMM[.:]+\s*R\$\s*([\d,]+)/i;
                break;
            case 'capatazia':
                pattern = /CAPATAZIA[.:]+\s*R\$\s*([\d,]+)/i;
                break;
            default:
                return '0,00';
        }
        
        const match = info.match(pattern);
        return match ? match[1] : '0,00';
    }
    
    // ========== GERAÇÃO EXCEL ==========
    
    async generateExcel() {
        try {
            console.log('📝 Iniciando geração do Excel...');
            
            // Preparar dados usando ItemCalculator
            await this.prepareAllData();
            
            if (typeof XLSX === 'undefined') {
                throw new Error('Biblioteca SheetJS não encontrada');
            }
            
            const wb = XLSX.utils.book_new();
            const ws = this.createExcelWorksheet();
            
            XLSX.utils.book_append_sheet(wb, ws, "Croqui NF");
            
            // Configurações do workbook
            wb.Props = {
                Title: `Croqui NF - DI ${this.di.numero_di}`,
                Author: 'Sistema Expertzy',
                CreatedDate: new Date()
            };
            
            const buffer = XLSX.write(wb, {
                bookType: 'xlsx',
                type: 'array',
                cellStyles: true,
                bookSST: false
            });
            
            console.log('✅ Excel gerado com sucesso');
            return buffer;
            
        } catch (error) {
            console.error('❌ Erro ao gerar Excel:', error);
            throw error;
        }
    }
    
    createExcelWorksheet() {
        const ws = {};
        let row = 1;
        
        // CABEÇALHO EXPERTZY
        this.addCell(ws, 'A1', this.empresa, this.excelStyles.header);
        this.mergeCells(ws, 'A1:T1');
        
        this.addCell(ws, 'A2', this.subtitulo, this.excelStyles.subtitle);
        this.mergeCells(ws, 'A2:T2');
        
        row = 4;
        
        // TÍTULO DO DOCUMENTO
        this.addCell(ws, `A${row}`, 'CROQUI NOTA FISCAL DE ENTRADA', this.excelStyles.header);
        this.mergeCells(ws, `A${row}:T${row}`);
        row += 2;
        
        // INFORMAÇÕES DA DI
        this.addCell(ws, `A${row}`, `DI: ${this.header.di_numero}`, this.excelStyles.cell);
        this.mergeCells(ws, `A${row}:D${row}`);
        
        this.addCell(ws, `E${row}`, `DATA DO REGISTRO: ${this.header.data_registro}`, this.excelStyles.cell);
        this.mergeCells(ws, `E${row}:J${row}`);
        
        this.addCell(ws, `K${row}`, `Cotação US$ ${this.header.taxa_cambio}`, this.excelStyles.cell);
        this.mergeCells(ws, `K${row}:T${row}`);
        row += 2;
        
        // CABEÇALHOS DA TABELA DE PRODUTOS
        const headers = [
            'Adição', 'ITEM', 'PRODUTO', 'NCM', 'PESO',
            'QUANT CX', 'QUANT\nP/CX', 'TOTAL UN',
            'V. UNIT\nReal R$', 'V. TOTAL\nReal R$',
            'BC ICMS', 'V.ICMS', 'BC IPI', 'V.IPI',
            'ALIQ ICMS', 'ALIQ IPI',
            'MVA', 'BC ST', 'ST', 'FP'
        ];
        
        headers.forEach((header, index) => {
            const col = String.fromCharCode(65 + index); // A, B, C...
            this.addCell(ws, `${col}${row}`, header, this.excelStyles.tableHeader);
        });
        row++;
        
        // DADOS DOS PRODUTOS
        this.produtos.forEach(produto => {
            this.addCell(ws, `A${row}`, produto.adicao, this.excelStyles.cell);
            this.addCell(ws, `B${row}`, produto.item, this.excelStyles.cell);
            this.addCell(ws, `C${row}`, produto.descricao, this.excelStyles.cell);
            this.addCell(ws, `D${row}`, produto.ncm, this.excelStyles.cell);
            this.addCell(ws, `E${row}`, produto.peso_kg.toFixed(2), this.excelStyles.cell);
            this.addCell(ws, `F${row}`, produto.quant_cx, this.excelStyles.cell);
            this.addCell(ws, `G${row}`, produto.quant_por_cx, this.excelStyles.cell);
            this.addCell(ws, `H${row}`, produto.total_un, this.excelStyles.cell);
            this.addCell(ws, `I${row}`, produto.valor_unitario, this.excelStyles.currency);
            this.addCell(ws, `J${row}`, produto.valor_total, this.excelStyles.currency);
            this.addCell(ws, `K${row}`, produto.bc_icms, this.excelStyles.currency);
            this.addCell(ws, `L${row}`, produto.valor_icms, this.excelStyles.currency);
            this.addCell(ws, `M${row}`, produto.bc_ipi, this.excelStyles.currency);
            this.addCell(ws, `N${row}`, produto.valor_ipi, this.excelStyles.currency);
            
            // ALÍQUOTAS FORMATADAS COMO PERCENTUAL
            this.addCell(ws, `O${row}`, produto.aliq_icms, this.excelStyles.percentage);
            this.addCell(ws, `P${row}`, produto.aliq_ipi, this.excelStyles.percentage);
            
            this.addCell(ws, `Q${row}`, produto.mva, this.excelStyles.cell);
            this.addCell(ws, `R${row}`, produto.bc_st, this.excelStyles.currency);
            this.addCell(ws, `S${row}`, produto.valor_st, this.excelStyles.currency);
            this.addCell(ws, `T${row}`, produto.fp, this.excelStyles.cell);
            
            row++;
        });
        
        // LINHA DE TOTAL
        row++;
        this.addCell(ws, `A${row}`, 'TOTAL', this.excelStyles.totalsHeader);
        this.mergeCells(ws, `A${row}:H${row}`);
        
        // Somar totais
        let totalValor = 0;
        let totalICMS = 0;
        let totalIPI = 0;
        this.produtos.forEach(p => {
            totalValor += p.valor_total;
            totalICMS += p.valor_icms;
            totalIPI += p.valor_ipi;
        });
        
        this.addCell(ws, `I${row}`, '', this.excelStyles.totalsHeader);
        this.addCell(ws, `J${row}`, totalValor, this.excelStyles.totalsValue);
        this.addCell(ws, `K${row}`, '', this.excelStyles.totalsHeader);
        this.addCell(ws, `L${row}`, totalICMS, this.excelStyles.totalsValue);
        this.addCell(ws, `M${row}`, '', this.excelStyles.totalsHeader);
        this.addCell(ws, `N${row}`, totalIPI, this.excelStyles.totalsValue);
        this.addCell(ws, `O${row}`, '', this.excelStyles.totalsHeader);
        this.addCell(ws, `P${row}`, '', this.excelStyles.totalsHeader);
        this.addCell(ws, `Q${row}`, '', this.excelStyles.totalsHeader);
        this.addCell(ws, `R${row}`, '', this.excelStyles.totalsHeader);
        this.addCell(ws, `S${row}`, '', this.excelStyles.totalsHeader);
        this.addCell(ws, `T${row}`, '', this.excelStyles.totalsHeader);
        
        row += 3;
        
        // SEÇÃO DE CÁLCULO DO IMPOSTO
        this.addCell(ws, `A${row}`, 'CÁLCULO DO IMPOSTO', this.excelStyles.header);
        this.mergeCells(ws, `A${row}:T${row}`);
        row += 2;
        
        // Primeira linha de totais
        this.addCell(ws, `A${row}`, 'Base de Cálculo do ICMS', this.excelStyles.cell);
        this.mergeCells(ws, `A${row}:B${row}`);
        this.addCell(ws, `C${row}`, this.totais.base_calculo_icms, this.excelStyles.currency);
        
        this.addCell(ws, `D${row}`, 'VALOR DO ICMS', this.excelStyles.cell);
        this.mergeCells(ws, `D${row}:E${row}`);
        this.addCell(ws, `F${row}`, this.totais.valor_icms, this.excelStyles.currency);
        
        this.addCell(ws, `G${row}`, 'BC ST', this.excelStyles.cell);
        this.addCell(ws, `H${row}`, this.totais.base_calculo_icms_st, this.excelStyles.currency);
        
        this.addCell(ws, `I${row}`, 'ICMS ST', this.excelStyles.cell);
        this.addCell(ws, `J${row}`, this.totais.valor_icms_st, this.excelStyles.currency);
        
        this.addCell(ws, `K${row}`, 'VALOR TOTAL DOS PRODUTOS', this.excelStyles.cell);
        this.mergeCells(ws, `K${row}:M${row}`);
        this.addCell(ws, `N${row}`, this.totais.valor_total_produtos, this.excelStyles.currency);
        row++;
        
        // Segunda linha de totais
        this.addCell(ws, `A${row}`, 'Total do Frete', this.excelStyles.cell);
        this.addCell(ws, `B${row}`, this.totais.valor_frete, this.excelStyles.currency);
        
        this.addCell(ws, `C${row}`, 'Valor do Seguro', this.excelStyles.cell);
        this.addCell(ws, `D${row}`, this.totais.valor_seguro, this.excelStyles.currency);
        
        this.addCell(ws, `E${row}`, 'Total do Desconto', this.excelStyles.cell);
        this.addCell(ws, `F${row}`, this.totais.valor_desconto, this.excelStyles.currency);
        
        this.addCell(ws, `G${row}`, 'Outras Despesas', this.excelStyles.cell);
        this.mergeCells(ws, `G${row}:H${row}`);
        this.addCell(ws, `I${row}`, this.totais.outras_despesas, this.excelStyles.currency);
        
        this.addCell(ws, `J${row}`, 'Valor do II', this.excelStyles.cell);
        this.addCell(ws, `K${row}`, this.totais.valor_ii, this.excelStyles.currency);
        
        this.addCell(ws, `L${row}`, 'VALOR DO IPI', this.excelStyles.cell);
        this.addCell(ws, `M${row}`, this.totais.valor_ipi, this.excelStyles.currency);
        row++;
        
        // Terceira linha de totais
        this.addCell(ws, `A${row}`, 'PIS', this.excelStyles.cell);
        this.addCell(ws, `B${row}`, this.totais.valor_pis, this.excelStyles.currency);
        
        this.addCell(ws, `C${row}`, 'COFINS', this.excelStyles.cell);
        this.addCell(ws, `D${row}`, this.totais.valor_cofins, this.excelStyles.currency);
        
        this.addCell(ws, `K${row}`, 'VALOR TOTAL DA NOTA', this.excelStyles.totalsHeader);
        this.mergeCells(ws, `K${row}:M${row}`);
        this.addCell(ws, `N${row}`, this.totais.valor_total_nota, this.excelStyles.totalsValue);
        
        // Definir range e larguras
        ws['!ref'] = `A1:T${row + 2}`;
        this.setColumnWidths(ws);
        
        // Adicionar merges ao worksheet
        if (!ws['!merges']) {
            ws['!merges'] = [];
        }
        
        return ws;
    }
    
    // ========== GERAÇÃO PDF ==========
    
    async generatePDF() {
        try {
            console.log('📝 Iniciando geração do PDF...');
            
            // Preparar dados usando ItemCalculator
            await this.prepareAllData();
            
            // Verificação correta do jsPDF
            if (typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined') {
                throw new Error('Biblioteca jsPDF não encontrada');
            }
            
            const { jsPDF } = window.jspdf || jspdf;
            const doc = new jsPDF('landscape', 'mm', 'a4');
            
            // Configurar fontes
            doc.setFont('helvetica');
            
            // LOGO E CABEÇALHO EXPERTZY (now async)
            await this.addLogoAndHeader(doc);
            
            // SEÇÃO DESTINATÁRIO/REMETENTE
            this.addDestinatarioSection(doc);
            
            // DADOS DOS PRODUTOS
            this.addProdutosSection(doc);
            
            // CÁLCULO DO IMPOSTO
            this.addCalculoImpostoSection(doc);
            
            // INFORMAÇÕES COMPLEMENTARES
            this.addInformacoesComplementares(doc);
            
            // Gerar buffer
            const pdfBuffer = doc.output('arraybuffer');
            
            console.log('✅ PDF gerado com sucesso');
            return pdfBuffer;
            
        } catch (error) {
            console.error('❌ Erro ao gerar PDF:', error);
            throw error;
        }
    }
    
    
    createManualPDFTable(doc) {
        // Implementação de fallback caso autoTable não esteja disponível
        let y = 55;
        const lineHeight = 7;
        
        // Cabeçalhos
        doc.setFontSize(8);
        doc.setFillColor(0, 51, 102);
        doc.rect(20, y, 257, lineHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('Adição | Item | Produto | NCM | Peso | Valores...', 22, y + 5);
        
        // Resetar cor do texto
        doc.setTextColor(0, 0, 0);
        y += lineHeight;
        
        // Produtos
        doc.setFontSize(7);
        this.produtos.forEach(produto => {
            doc.text(`${produto.adicao} | ${produto.item} | ${produto.descricao.substring(0, 20)}...`, 22, y + 5);
            y += lineHeight;
        });
    }
    
    async addLogoAndHeader(doc) {
        // ===== LAYOUT PAISAGEM (297mm x 210mm) =====
        
        // Try to add the actual Expertzy logo if available
        try {
            // Check if logo exists and can be loaded
            // Using the correct path to assets/images
            const logoPath = 'assets/images/logo-expertzy.png';
            const response = await fetch(logoPath);
            if (response.ok) {
                const blob = await response.blob();
                const reader = new FileReader();
                await new Promise((resolve, reject) => {
                    reader.onload = resolve;
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                const logoData = reader.result;
                // Add logo image (adjust dimensions as needed)
                doc.addImage(logoData, 'PNG', 15, 10, 50, 30);
                console.log('✅ Logo Expertzy adicionado ao PDF');
            } else {
                console.warn('Logo not found at path, using text fallback');
                // Fallback to text logo if image not available
                this.addTextLogo(doc);
            }
        } catch (error) {
            console.warn('Could not load logo image, using text fallback:', error);
            // Fallback to text logo
            this.addTextLogo(doc);
        }
        
        // TÍTULO PRINCIPAL (centro)
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('CROQUI NOTA FISCAL DE ENTRADA', 148, 20, { align: 'center' });
        
        // INFORMAÇÕES DA DI (distribuídas horizontalmente)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`DI: ${this.header.di_numero}`, 80, 45);
        doc.text(`DATA REGISTRO: ${this.header.data_registro}`, 140, 45);
        doc.text(`CÂMBIO USD: ${this.header.taxa_cambio}`, 210, 45);
        
        // Linha separadora (mais larga para paisagem)
        doc.setLineWidth(0.5);
        doc.line(15, 50, 282, 50);
    }
    
    addTextLogo(doc) {
        // Text-based logo fallback
        doc.setFillColor(0, 51, 102);
        doc.rect(15, 10, 50, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('EXPERTZY', 40, 20, { align: 'center' });
        doc.setFontSize(9);
        doc.text('SISTEMA DE IMPORTAÇÃO', 40, 27, { align: 'center' });
        doc.text('E PRECIFICAÇÃO', 40, 33, { align: 'center' });
    }
    
    addDestinatarioSection(doc) {
        let y = 55;
        
        // SEÇÃO DESTINATÁRIO (IMPORTADOR BRASILEIRO)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('DESTINATÁRIO (IMPORTADOR)', 15, y);
        
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        
        // Dados do importador (destinatário)
        doc.text(`NOME: ${this.header.importador.nome}`, 15, y);
        y += 4;
        doc.text(`CNPJ: ${this.header.importador.cnpj}`, 15, y);
        y += 4;
        doc.text(`ENDEREÇO: ${this.header.importador.endereco}`, 15, y);
        y += 4;
        doc.text(`MUNICÍPIO: ${this.header.importador.municipio} - ${this.header.importador.uf}`, 15, y);
        y += 4;
        doc.text(`CEP: ${this.header.importador.cep}`, 15, y);
        
        // SEÇÃO REMETENTE (FORNECEDOR/EXPORTADOR)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('REMETENTE (EXPORTADOR)', 160, y - 16);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        
        // Dados do fornecedor (remetente)
        doc.text(`FORNECEDOR: ${this.header.fornecedor.nome}`, 160, y - 12);
        doc.text(`PAÍS: ${this.header.fornecedor.pais}`, 160, y - 8);
        doc.text(`ENDEREÇO: ${this.header.fornecedor.endereco}`, 160, y - 4);
        
        return y + 8;
    }
    
    addProdutosSection(doc) {
        const startY = 90;
        
        // DADOS DOS PRODUTOS
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('DADOS DOS PRODUTOS / SERVIÇOS', 15, startY);
        
        if (doc.autoTable) {
            const tableData = this.produtos.map(p => [
                p.adicao,
                p.descricao.substring(0, 35),
                p.ncm,
                'KG', // Unidade original da DI
                p.total_un.toFixed(2),
                p.valor_unitario.toFixed(4),
                p.valor_total.toFixed(2),
                p.bc_icms.toFixed(2),
                p.valor_icms.toFixed(2),
                p.valor_ipi.toFixed(2),
                p.aliq_icms.toFixed(2),
                p.aliq_ipi.toFixed(2)
            ]);
            
            // Usar dados diretos do XMLParser (já convertidos corretamente)
            const tableDataCorrected = this.produtos.map(p => [
                p.adicao,
                p.descricao.substring(0, 40),
                p.ncm,
                'KG', // Unidade original da DI
                p.total_un.toFixed(2), // Quantidade 
                this.formatCurrency(p.valor_unitario), // Valor unitário formatado
                this.formatCurrency(p.valor_total), // Valor total formatado
                this.formatCurrency(p.bc_icms), // BC ICMS formatado
                this.formatCurrency(p.valor_icms), // Valor ICMS formatado
                this.formatCurrency(p.valor_ipi), // Valor IPI formatado
                p.aliq_icms.toFixed(2), // Alíquota ICMS
                p.aliq_ipi.toFixed(2) // Alíquota IPI
            ]);

            doc.autoTable({
                startY: startY + 5,
                head: [[
                    'CÓDIGO',
                    'DESCRIÇÃO PRODUTO / SERVIÇO',
                    'NCM/SH',
                    'UN',
                    'QUANT.',
                    'VALOR UNIT.',
                    'VALOR TOTAL',
                    'B.CALC. ICMS',
                    'VALOR ICMS',
                    'VALOR IPI',
                    'ALIQ ICMS',
                    'ALIQ IPI'
                ]],
                body: tableDataCorrected,
                theme: 'grid',
                headStyles: {
                    fillColor: [0, 51, 102],
                    textColor: 255,
                    fontSize: 8,
                    halign: 'center',
                    cellPadding: 2
                },
                bodyStyles: {
                    fontSize: 7,
                    cellPadding: 2
                },
                columnStyles: {
                    0: { cellWidth: 15 },      // Código (-3)
                    1: { cellWidth: 65 },      // Descrição (-5)
                    2: { cellWidth: 20 },      // NCM (-2)
                    3: { cellWidth: 10, halign: 'center' },   // UN (-2)
                    4: { cellWidth: 16, halign: 'right' },    // Quantidade (-2)
                    5: { cellWidth: 20, halign: 'right' },    // Valor Unit (-2)
                    6: { cellWidth: 20, halign: 'right' },    // Valor Total (-2)
                    7: { cellWidth: 20, halign: 'right' },    // BC ICMS (-2)
                    8: { cellWidth: 18, halign: 'right' },    // Valor ICMS (-2)
                    9: { cellWidth: 16, halign: 'right' },    // Valor IPI (-2)
                    10: { cellWidth: 16, halign: 'center' },  // Aliq ICMS (-2)
                    11: { cellWidth: 13, halign: 'center' }   // Aliq IPI (-2)
                },
                margin: { left: 15, right: 15 }
            });
        }
        
        return doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : startY + 40;
    }
    
    addCalculoImpostoSection(doc) {
        const startY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 140;
        
        // CÁLCULO DO IMPOSTO
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('CÁLCULO DO IMPOSTO', 15, startY);
        
        // Criar tabela de cálculo do imposto
        const impostoData = [
            [
                'BASE DE CÁLCULO DO ICMS',
                this.formatCurrency(this.totais.base_calculo_icms),
                'VALOR DO ICMS',
                this.formatCurrency(this.totais.valor_icms),
                'VALOR TOTAL DOS PRODUTOS',
                this.formatCurrency(this.totais.valor_total_produtos)
            ],
            [
                'VALOR DO FRETE',
                this.formatCurrency(this.totais.valor_frete),
                'VALOR DO SEGURO',
                this.formatCurrency(this.totais.valor_seguro),
                'VALOR DO DESCONTO',
                this.formatCurrency(this.totais.valor_desconto)
            ],
            [
                'OUTRAS DESPESAS',
                this.formatCurrency(this.totais.outras_despesas),
                'VALOR DO IPI',
                this.formatCurrency(this.totais.valor_ipi),
                'VALOR TOTAL DA NOTA',
                this.formatCurrency(this.totais.valor_total_nota)
            ]
        ];
        
        if (doc.autoTable) {
            doc.autoTable({
                startY: startY + 5,
                body: impostoData,
                theme: 'grid',
                bodyStyles: {
                    fontSize: 7
                },
                columnStyles: {
                    0: { cellWidth: 40, fontStyle: 'bold' },   // Reduced width
                    1: { cellWidth: 34, halign: 'right' },
                    2: { cellWidth: 40, fontStyle: 'bold' },
                    3: { cellWidth: 34, halign: 'right' },
                    4: { cellWidth: 40, fontStyle: 'bold' },
                    5: { cellWidth: 34, halign: 'right' }
                },
                margin: { left: 15, right: 15 }
            });
        }
        
        return doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : startY + 30;
    }
    
    addInformacoesComplementares(doc) {
        const startY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 180;
        
        // INFORMAÇÕES COMPLEMENTARES
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMAÇÕES COMPLEMENTARES', 15, startY);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        
        let y = startY + 5;
        
        // Informações dos tributos e despesas aduaneiras
        const infoLines = [
            `II R$ ${this.totais.valor_ii.toFixed(2)} IPI R$ ${this.totais.valor_ipi.toFixed(2)} PIS R$ ${this.totais.valor_pis.toFixed(2)} COFINS R$ ${this.totais.valor_cofins.toFixed(2)}`,
            `SISCOMEX R$ ${this.getDespesaAduaneira('siscomex')} CAPATAZIA R$ ${this.getDespesaAduaneira('capatazia')} AFRMM R$ ${this.getDespesaAduaneira('afrmm')}`
        ];
        
        // Adicionar despesas extras se existirem
        if (this.di.despesasExtras && this.di.despesasExtras.length > 0) {
            const despesasICMS = this.di.despesasExtras.filter(d => d.includeInICMS);
            if (despesasICMS.length > 0) {
                const despesasTexto = despesasICMS.map(d => `${d.name.toUpperCase()}: R$ ${d.value.toFixed(2)}`).join(' ');
                infoLines.push(`DESPESAS EXTRAS NA BASE ICMS: ${despesasTexto}`);
            }
            
            const despesasNaoICMS = this.di.despesasExtras.filter(d => !d.includeInICMS);
            if (despesasNaoICMS.length > 0) {
                const despesasTexto = despesasNaoICMS.map(d => `${d.name.toUpperCase()}: R$ ${d.value.toFixed(2)}`).join(' ');
                infoLines.push(`OUTRAS DESPESAS: ${despesasTexto}`);
            }
        }
        
        // Informações padrão
        infoLines.push(
            `Nossa Referência: ${this.header.referencia_twa || 'N/A'}`,
            `REF.IMPORTADOR: ${this.header.referencia_importador || 'N/A'}`,
            `NOTA FISCAL DE IMPORTAÇÃO DE ACORDO COM A DI ${this.header.di_numero}`,
            `DESCRIÇÃO DA MERCADORIA CONFORME DI ${this.header.di_numero}`,
            'GERADO PELO SISTEMA EXPERTZY - www.expertzy.com.br'
        );
        
        infoLines.forEach(line => {
            doc.text(line, 15, y);
            y += 4;
        });
        
        return y;
    }
    
    // ========== MÉTODOS AUXILIARES DO EXCEL ==========
    
    addCell(ws, address, value, style = null) {
        if (!ws[address]) {
            ws[address] = {};
        }
        
        // Tratar valores nulos/undefined
        if (value === null || value === undefined) {
            value = '';
        }
        
        ws[address].v = value;
        
        // Definir tipo da célula
        if (typeof value === 'number' && !isNaN(value)) {
            ws[address].t = 'n';
        } else if (typeof value === 'boolean') {
            ws[address].t = 'b';
        } else {
            ws[address].t = 's';
            ws[address].v = String(value);
        }
        
        // Aplicar estilo se fornecido
        if (style) {
            ws[address].s = style;
        }
    }
    
    mergeCells(ws, range) {
        if (!ws['!merges']) {
            ws['!merges'] = [];
        }
        
        // Parse range (ex: A1:D1)
        const [start, end] = range.split(':');
        const startCol = start.charCodeAt(0) - 65;
        const startRow = parseInt(start.substring(1)) - 1;
        const endCol = end.charCodeAt(0) - 65;
        const endRow = parseInt(end.substring(1)) - 1;
        
        ws['!merges'].push({
            s: { r: startRow, c: startCol },
            e: { r: endRow, c: endCol }
        });
    }
    
    setColumnWidths(ws) {
        const widths = [
            6,   // A - Adição
            8,   // B - Item
            30,  // C - Produto
            10,  // D - NCM
            8,   // E - Peso
            8,   // F - Quant CX
            8,   // G - Quant P/CX
            8,   // H - Total UN
            12,  // I - V. Unit
            12,  // J - V. Total
            12,  // K - BC ICMS
            12,  // L - V. ICMS
            12,  // M - BC IPI
            12,  // N - V. IPI
            10,  // O - ALIQ ICMS
            10,  // P - ALIQ IPI
            6,   // Q - MVA
            10,  // R - BC ST
            10,  // S - ST
            6    // T - FP
        ];
        
        ws['!cols'] = widths.map(width => ({ wch: width }));
    }
}

// ========== FUNÇÕES GLOBAIS PARA INTEGRAÇÃO ==========


window.gerarCroquiPDFNovo = async function(diData) {
    try {
        console.log('🚀 Iniciando geração do Croqui NF PDF (v2.0)...');
        
        if (!diData) {
            // Tentar obter do app global
            if (window.app && window.app.currentDI) {
                diData = window.app.currentDI;
            } else {
                throw new Error('Dados da DI não fornecidos. Carregue uma DI primeiro.');
            }
        }
        
        const exporter = new CroquiNFExporter(diData);
        const buffer = await exporter.generatePDF();
        
        // Download do arquivo
        const blob = new Blob([buffer], {
            type: 'application/pdf'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Nome do arquivo com data
        const hoje = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.download = `Croqui_NF_${diData.numero_di}_${hoje}.pdf`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        console.log('✅ Croqui NF PDF gerado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao gerar Croqui NF PDF:', error);
        alert(`Erro ao gerar Croqui NF PDF: ${error.message}`);
    }
};

// Exportar classe para uso em testes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CroquiNFExporter;
}