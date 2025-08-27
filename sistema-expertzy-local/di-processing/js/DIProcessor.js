/**
 * DIProcessor.js - Phase 1: DI Compliance Processor
 * 
 * Pure DI data extraction and validation for import compliance
 * Focuses ONLY on DI processing, tax-related data extraction, and compliance
 * NO pricing logic, NO business strategy - purely compliance-focused
 */

class DIProcessor {
    constructor() {
        this.diData = {};
        this.originalXmlContent = null;
        this.incotermIdentificado = null;
        this.despesasAutomaticas = {};
        this.despesasExtras = {};
        this.status = 'ready'; // ready, processing, processed, error
    }

    /**
     * Converte valores do XML respeitando formato específico de cada tipo
     */
    convertValue(rawValue, type = 'integer') {
        if (!rawValue || rawValue === '0'.repeat(rawValue.length)) {
            return 0;
        }
        
        const value = parseInt(rawValue);
        
        switch(type) {
            case 'monetary':
                return value / 100;
            case 'weight':
                return value / 100000;
            case 'unit_value':
                return value / 10000000;
            case 'percentage':
                return value / 100;
            case 'integer':
            default:
                return value;
        }
    }

    /**
     * Processa o XML da DI - entrada principal do sistema
     * @param {string} xmlContent - Conteúdo XML da DI
     * @param {string} fileName - Nome do arquivo
     * @returns {Object} Dados extraídos da DI
     */
    async processarXML(xmlContent, fileName) {
        console.log('🔄 DIProcessor: Iniciando processamento da DI...');
        
        try {
            this.status = 'processing';
            this.originalXmlContent = xmlContent;
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
            
            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                throw new Error('XML inválido');
            }

            // Extrair dados básicos da DI
            await this.extrairDadosBasicos(xmlDoc);
            
            // Extrair despesas aduaneiras automáticas
            await this.extrairDespesasAduaneiras(xmlDoc);
            
            // Identificar Incoterm
            this.identificarIncoterm();
            
            // Processar adições e produtos
            await this.processarAdicoes(xmlDoc);
            
            this.status = 'processed';
            console.log('✅ DIProcessor: DI processada com sucesso');
            
            return this.getDadosProcessados();
            
        } catch (error) {
            this.status = 'error';
            console.error('❌ DIProcessor: Erro no processamento:', error);
            throw error;
        }
    }

    /**
     * Extrai dados básicos da DI
     */
    async extrairDadosBasicos(xmlDoc) {
        console.log('📋 Extraindo dados básicos da DI...');
        
        const declaration = xmlDoc.getElementsByTagName('ns2:TDeclaracaoImportacao')[0];
        if (!declaration) {
            throw new Error('Estrutura de DI não encontrada no XML');
        }

        // Número da DI
        const numeroElement = declaration.getElementsByTagName('ns2:numeroDeclaracao')[0];
        this.diData.di_numero = numeroElement ? numeroElement.textContent : '';

        // Data de registro
        const dataElement = declaration.getElementsByTagName('ns2:dataRegistro')[0];
        this.diData.data_registro = dataElement ? dataElement.textContent : '';

        // Canal de conferência
        const canalElement = declaration.getElementsByTagName('ns2:canalConferencia')[0];
        this.diData.canal_conferencia = canalElement ? canalElement.textContent : '';

        console.log(`📄 DI Número: ${this.diData.di_numero}`);
    }

    /**
     * Extrai despesas aduaneiras automáticas (SISCOMEX, AFRMM, etc.)
     */
    async extrairDespesasAduaneiras(xmlDoc) {
        console.log('🔍 Extraindo despesas aduaneiras...');
        
        this.despesasAutomaticas = {
            siscomex: 0,
            afrmm: 0,
            capatazia: 0,
            outros: 0,
            total: 0
        };

        // Extrair pagamentos da DI
        const pagamentos = xmlDoc.getElementsByTagName('ns2:pagamento');
        
        for (let i = 0; i < pagamentos.length; i++) {
            const pagamento = pagamentos[i];
            const codigoElement = pagamento.getElementsByTagName('ns2:codigo')[0];
            const valorElement = pagamento.getElementsByTagName('ns2:valorRecolhido')[0];
            
            if (codigoElement && valorElement) {
                const codigo = codigoElement.textContent;
                const valor = this.convertValue(valorElement.textContent, 'monetary');
                
                console.log(`📋 Pagamento extraído: ${this.getDescricaoPagamento(codigo)} (${codigo}) = R$ ${valor.toFixed(2)}`);
                
                // Mapear códigos para despesas
                switch (codigo) {
                    case '7811': // SISCOMEX
                        this.despesasAutomaticas.siscomex = valor;
                        break;
                    case '7850': // AFRMM
                        this.despesasAutomaticas.afrmm = valor;
                        break;
                    case '7801': // Capatazia
                    case '7802': // Armazenagem
                        this.despesasAutomaticas.capatazia += valor;
                        break;
                    default:
                        this.despesasAutomaticas.outros += valor;
                        break;
                }
            }
        }

        // Calcular total das despesas que compõem base ICMS
        this.despesasAutomaticas.total = 
            this.despesasAutomaticas.siscomex + 
            this.despesasAutomaticas.afrmm + 
            this.despesasAutomaticas.capatazia;

        console.log(`💰 Total despesas aduaneiras para base ICMS: R$ ${this.despesasAutomaticas.total.toFixed(2)}`);
        console.log('✅ Despesas aduaneiras extraídas:', this.despesasAutomaticas);
    }

    /**
     * Retorna descrição do código de pagamento
     */
    getDescricaoPagamento(codigo) {
        const descricoes = {
            '5602': 'PIS',
            '5629': 'COFINS', 
            '7811': 'SISCOMEX',
            '7850': 'AFRMM',
            '7801': 'Capatazia',
            '7802': 'Armazenagem'
        };
        return descricoes[codigo] || `Código ${codigo}`;
    }

    /**
     * Identifica e processa Incoterm
     */
    identificarIncoterm() {
        // Identificação básica - pode ser expandida
        const incotermsCIF = ['CIF', 'CIP', 'CFR', 'CPT'];
        const incotermsComFrete = ['CIF', 'CIP', 'CFR', 'CPT'];
        const incotermsComSeguro = ['CIF', 'CIP'];

        // Por enquanto, usar dados de exemplo - deve ser extraído do XML
        this.incotermIdentificado = {
            codigo: 'CPT',
            descricao: 'Carriage Paid To - Transporte pago até',
            frete_incluido: true,
            seguro_incluido: false
        };

        console.log(`Incoterm identificado: ${this.incotermIdentificado.codigo} - ${this.incotermIdentificado.descricao}`);
    }

    /**
     * Processa adições da DI
     */
    async processarAdicoes(xmlDoc) {
        console.log('🔄 Processando adições da DI...');
        
        const adicoes = xmlDoc.getElementsByTagName('ns2:adicao');
        this.diData.adicoes = [];

        for (let i = 0; i < adicoes.length; i++) {
            const adicao = adicoes[i];
            const dadosAdicao = await this.extrairDadosAdicao(adicao);
            this.diData.adicoes.push(dadosAdicao);
        }

        console.log(`✅ ${adicoes.length} adição(ões) processada(s)`);
    }

    /**
     * Extrai dados de uma adição específica
     */
    async extrairDadosAdicao(adicaoElement) {
        const adicao = {
            numero_adicao: this.getElementText(adicaoElement, 'ns2:numeroAdicao'),
            ncm: this.getElementText(adicaoElement, 'ns2:codigoNcm'),
            descricao_ncm: this.getElementText(adicaoElement, 'ns2:nomeNcm'),
            peso_liquido: this.convertValue(this.getElementText(adicaoElement, 'ns2:pesoLiquido'), 'weight'),
            quantidade_estatistica: this.convertValue(this.getElementText(adicaoElement, 'ns2:qtdUnidadeEstatistica'), 'weight'),
            unidade_estatistica: this.getElementText(adicaoElement, 'ns2:unidadeEstatistica'),
            aplicacao_mercadoria: this.getElementText(adicaoElement, 'ns2:utilizacaoMercadoria'),
            condicao_mercadoria: this.getElementText(adicaoElement, 'ns2:condicaoMercadoria'),
            
            // Valores monetários
            moeda_negociacao_codigo: this.getElementText(adicaoElement, 'ns2:codigoMoedaNegociada'),
            moeda_negociacao_nome: this.getElementText(adicaoElement, 'ns2:nomeMoedaNegociada'),
            valor_moeda_negociacao: this.convertValue(this.getElementText(adicaoElement, 'ns2:valorMoedaNegociada'), 'monetary'),
            valor_reais: this.convertValue(this.getElementText(adicaoElement, 'ns2:valorMercadoriaReais'), 'monetary'),

            // Incoterm específico da adição
            condicao_venda_incoterm: this.getElementText(adicaoElement, 'ns2:condicaoVendaIncoterm'),
            condicao_venda_local: this.getElementText(adicaoElement, 'ns2:localCondicaoVenda'),

            // Método de valoração
            metodo_valoracao_codigo: this.getElementText(adicaoElement, 'ns2:codigoMetodoValoracaoMercadoria'),
            metodo_valoracao_nome: this.getElementText(adicaoElement, 'ns2:nomeMetodoValoracaoMercadoria'),

            // Tributos
            tributos: this.extrairTributosAdicao(adicaoElement),
            
            // Fornecedor e fabricante
            fornecedor: this.extrairFornecedor(adicaoElement),
            fabricante: this.extrairFabricante(adicaoElement),
            
            // Produtos da adição
            produtos: this.extrairProdutos(adicaoElement)
        };

        // Calcular taxa de câmbio
        if (adicao.valor_reais && adicao.valor_moeda_negociacao && adicao.valor_moeda_negociacao > 0) {
            adicao.taxa_cambio = adicao.valor_reais / adicao.valor_moeda_negociacao;
        }

        return adicao;
    }

    /**
     * Extrai tributos da adição
     */
    extrairTributosAdicao(adicaoElement) {
        const tributosElement = adicaoElement.getElementsByTagName('ns2:tributo')[0];
        
        if (!tributosElement) {
            return {};
        }

        return {
            // II - Imposto de Importação
            ii_regime_codigo: this.getElementText(tributosElement, 'ns2:codigoTipoTributacaoII'),
            ii_regime_nome: this.getElementText(tributosElement, 'ns2:nomeTipoTributacaoII'),
            ii_aliquota_ad_valorem: this.convertValue(this.getElementText(tributosElement, 'ns2:aliquotaAdValoremII'), 'percentage'),
            ii_base_calculo: this.convertValue(this.getElementText(tributosElement, 'ns2:baseCalculoII'), 'monetary'),
            ii_valor_calculado: this.convertValue(this.getElementText(tributosElement, 'ns2:valorCalculadoII'), 'monetary'),
            ii_valor_devido: this.convertValue(this.getElementText(tributosElement, 'ns2:valorDevidoII'), 'monetary'),
            ii_valor_recolher: this.convertValue(this.getElementText(tributosElement, 'ns2:valorARecolherII'), 'monetary'),

            // IPI
            ipi_regime_codigo: this.getElementText(tributosElement, 'ns2:codigoTipoTributacaoIPI'),
            ipi_regime_nome: this.getElementText(tributosElement, 'ns2:nomeTipoTributacaoIPI'),
            ipi_aliquota_ad_valorem: this.convertValue(this.getElementText(tributosElement, 'ns2:aliquotaAdValoremIPI'), 'percentage'),
            ipi_valor_devido: this.convertValue(this.getElementText(tributosElement, 'ns2:valorDevidoIPI'), 'monetary'),
            ipi_valor_recolher: this.convertValue(this.getElementText(tributosElement, 'ns2:valorARecolherIPI'), 'monetary'),

            // PIS
            pis_aliquota_ad_valorem: this.convertValue(this.getElementText(tributosElement, 'ns2:aliquotaAdValoremPIS'), 'percentage'),
            pis_valor_devido: this.convertValue(this.getElementText(tributosElement, 'ns2:valorDevidoPIS'), 'monetary'),
            pis_valor_recolher: this.convertValue(this.getElementText(tributosElement, 'ns2:valorARecolherPIS'), 'monetary'),

            // COFINS
            cofins_aliquota_ad_valorem: this.convertValue(this.getElementText(tributosElement, 'ns2:aliquotaAdValoremCOFINS'), 'percentage'),
            cofins_valor_devido: this.convertValue(this.getElementText(tributosElement, 'ns2:valorDevidoCOFINS'), 'monetary'),
            cofins_valor_recolher: this.convertValue(this.getElementText(tributosElement, 'ns2:valorARecolherCOFINS'), 'monetary')
        };
    }

    /**
     * Extrai dados do fornecedor
     */
    extrairFornecedor(adicaoElement) {
        const fornecedorElement = adicaoElement.getElementsByTagName('ns2:fornecedor')[0];
        
        if (!fornecedorElement) {
            return {};
        }

        return {
            nome: this.getElementText(fornecedorElement, 'ns2:nome'),
            logradouro: this.getElementText(fornecedorElement, 'ns2:logradouro'),
            numero: this.getElementText(fornecedorElement, 'ns2:numero'),
            complemento: this.getElementText(fornecedorElement, 'ns2:complemento'),
            cidade: this.getElementText(fornecedorElement, 'ns2:cidade'),
            estado: this.getElementText(fornecedorElement, 'ns2:estado'),
            endereco_completo: this.montarEnderecoCompleto(fornecedorElement)
        };
    }

    /**
     * Extrai dados do fabricante
     */
    extrairFabricante(adicaoElement) {
        const fabricanteElement = adicaoElement.getElementsByTagName('ns2:fabricante')[0];
        
        if (!fabricanteElement) {
            return {};
        }

        return {
            nome: this.getElementText(fabricanteElement, 'ns2:nome'),
            logradouro: this.getElementText(fabricanteElement, 'ns2:logradouro'),
            numero: this.getElementText(fabricanteElement, 'ns2:numero'),
            cidade: this.getElementText(fabricanteElement, 'ns2:cidade'),
            estado: this.getElementText(fabricanteElement, 'ns2:estado'),
            endereco_completo: this.montarEnderecoCompleto(fabricanteElement)
        };
    }

    /**
     * Extrai produtos da adição
     */
    extrairProdutos(adicaoElement) {
        const produtos = [];
        const produtosElements = adicaoElement.getElementsByTagName('ns2:mercadoria');

        for (let i = 0; i < produtosElements.length; i++) {
            const produtoElement = produtosElements[i];
            
            const produto = {
                adicao_numero: this.getElementText(adicaoElement, 'ns2:numeroAdicao'),
                numero_sequencial_item: this.getElementText(produtoElement, 'ns2:numeroSequencial'),
                descricao_mercadoria: this.getElementText(produtoElement, 'ns2:descricao'),
                quantidade: this.convertValue(this.getElementText(produtoElement, 'ns2:quantidade'), 'weight'),
                unidade_medida: this.getElementText(produtoElement, 'ns2:unidadeMedida'),
                valor_unitario: this.convertValue(this.getElementText(produtoElement, 'ns2:valorUnitario'), 'unit_value'),
                valor_total_item: this.convertValue(this.getElementText(produtoElement, 'ns2:valorTotal'), 'monetary')
            };

            // Calcular valores USD e BRL baseados na taxa de câmbio da adição
            const adicaoValorUSD = this.convertValue(this.getElementText(adicaoElement, 'ns2:valorMoedaNegociada'), 'monetary');
            const adicaoValorBRL = this.convertValue(this.getElementText(adicaoElement, 'ns2:valorMercadoriaReais'), 'monetary');
            const taxaCambio = adicaoValorBRL / adicaoValorUSD;

            produto.valor_unitario_usd = produto.valor_unitario;
            produto.valor_unitario_brl = produto.valor_unitario * taxaCambio;
            produto.valor_total_usd = produto.valor_total_item;
            produto.valor_total_brl = produto.valor_total_item * taxaCambio;
            produto.taxa_cambio = taxaCambio;

            produtos.push(produto);
        }

        return produtos;
    }

    /**
     * Utilitário para extrair texto de elemento XML
     */
    getElementText(parent, tagName) {
        const element = parent.getElementsByTagName(tagName)[0];
        return element ? element.textContent.trim() : '';
    }

    /**
     * Monta endereço completo
     */
    montarEnderecoCompleto(element) {
        const logradouro = this.getElementText(element, 'ns2:logradouro');
        const numero = this.getElementText(element, 'ns2:numero');
        const complemento = this.getElementText(element, 'ns2:complemento');
        const cidade = this.getElementText(element, 'ns2:cidade');
        const estado = this.getElementText(element, 'ns2:estado');

        let endereco = logradouro;
        if (numero && numero !== '000') endereco += ', ' + numero;
        if (complemento) endereco += ' - ' + complemento;
        if (cidade) endereco += ' - ' + cidade;
        if (estado) endereco += ', ' + estado;

        return endereco;
    }

    /**
     * Configura despesas extras do usuário
     */
    configurarDespesasExtras(despesas) {
        console.log('⚙️ Configurando despesas extras...');
        
        this.despesasExtras = {
            armazenagem: despesas.armazenagem || 0,
            transporte_interno: despesas.transporte_interno || 0,
            despachante: despesas.despachante || 0,
            taxas_portuarias: despesas.taxas_portuarias || 0,
            outros: despesas.outros || 0,
            
            // Classificação para base ICMS
            armazenagem_icms: despesas.armazenagem_icms || false,
            transporte_interno_icms: despesas.transporte_interno_icms || false,
            despachante_icms: despesas.despachante_icms || false,
            taxas_portuarias_icms: despesas.taxas_portuarias_icms || false,
            outros_icms: despesas.outros_icms || false
        };

        // Calcular totais
        this.despesasExtras.total = 
            this.despesasExtras.armazenagem +
            this.despesasExtras.transporte_interno +
            this.despesasExtras.despachante +
            this.despesasExtras.taxas_portuarias +
            this.despesasExtras.outros;

        this.despesasExtras.total_icms = 0;
        if (this.despesasExtras.armazenagem_icms) this.despesasExtras.total_icms += this.despesasExtras.armazenagem;
        if (this.despesasExtras.transporte_interno_icms) this.despesasExtras.total_icms += this.despesasExtras.transporte_interno;
        if (this.despesasExtras.despachante_icms) this.despesasExtras.total_icms += this.despesasExtras.despachante;
        if (this.despesasExtras.taxas_portuarias_icms) this.despesasExtras.total_icms += this.despesasExtras.taxas_portuarias;
        if (this.despesasExtras.outros_icms) this.despesasExtras.total_icms += this.despesasExtras.outros;

        console.log('✅ Despesas extras configuradas:', this.despesasExtras);
    }

    /**
     * Consolida todas as despesas (automáticas + extras)
     */
    consolidarDespesas() {
        const consolidacao = {
            automaticas: { ...this.despesasAutomaticas },
            extras: { ...this.despesasExtras },
            totais: {
                total_despesas: this.despesasAutomaticas.total + (this.despesasExtras.total || 0),
                total_icms: this.despesasAutomaticas.total + (this.despesasExtras.total_icms || 0)
            }
        };

        console.log('📊 Consolidação de despesas:', consolidacao);
        return consolidacao;
    }

    /**
     * Retorna dados processados da DI
     */
    getDadosProcessados() {
        return {
            status: this.status,
            di_numero: this.diData.di_numero,
            data_registro: this.diData.data_registro,
            canal_conferencia: this.diData.canal_conferencia,
            incoterm: this.incotermIdentificado,
            despesas_automaticas: this.despesasAutomaticas,
            despesas_extras: this.despesasExtras,
            adicoes: this.diData.adicoes,
            consolidacao_despesas: this.consolidarDespesas(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Valida se a DI foi processada corretamente
     */
    validarProcessamento() {
        const erros = [];

        if (!this.diData.di_numero) {
            erros.push('Número da DI não encontrado');
        }

        if (!this.diData.adicoes || this.diData.adicoes.length === 0) {
            erros.push('Nenhuma adição encontrada na DI');
        }

        if (this.despesasAutomaticas.total === 0) {
            erros.push('Nenhuma despesa aduaneira encontrada');
        }

        return {
            valido: erros.length === 0,
            erros: erros
        };
    }
}

// Export para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DIProcessor;
}