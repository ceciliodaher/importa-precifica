/**
 * DataLoader - Carregador de DIs do Banco de Dados
 * Substitui DIProcessor.js - trabalha apenas com dados processados da API
 * Não processa XML - apenas carrega dados já processados
 */
class DataLoader {
    constructor() {
        this.diData = null;
        this.databaseConnector = null;
        this.configLoader = new ConfigLoader();
        this.configsLoaded = false;
    }

    /**
     * Inicializa o carregador com conexão ao banco
     */
    async init() {
        if (!this.databaseConnector) {
            this.databaseConnector = new DatabaseConnector();
        }
        
        if (!this.configsLoaded) {
            await this.configLoader.loadAll();
            this.configsLoaded = true;
        }
    }

    /**
     * Carrega DI específica do banco via API
     * @param {string} numeroDI - Número da DI
     * @returns {object} Dados da DI já processados
     */
    async loadDI(numeroDI) {
        await this.init();
        
        try {
            console.log(`📥 DataLoader: Carregando DI ${numeroDI} da API...`);
            
            const response = await this.databaseConnector.buscarDI(numeroDI);
            
            if (!response || !response.data) {
                throw new Error(`DI ${numeroDI} não encontrada no banco`);
            }
            
            // Dados já vêm processados da API - usar diretamente
            this.diData = response.data;
            
            // Carregar despesas aduaneiras da DI
            await this.carregarDespesasAduaneiras();
            
            console.log('✅ DataLoader: DI carregada com sucesso', {
                numero_di: this.diData.numero_di,
                total_adicoes: this.diData.total_adicoes,
                valor_total: this.diData.resumo?.valor_total_adicoes
            });
            
            return this.diData;
            
        } catch (error) {
            console.error('❌ DataLoader: Erro ao carregar DI', error);
            throw error;
        }
    }

    /**
     * Lista DIs disponíveis no banco
     * @param {number} page - Página
     * @param {number} limit - Limite por página  
     * @param {object} filters - Filtros de busca
     * @returns {object} Lista paginada de DIs
     */
    async listDIs(page = 1, limit = 10, filters = {}) {
        await this.init();
        
        try {
            console.log('📋 DataLoader: Listando DIs disponíveis...', { page, limit, filters });
            
            const response = await this.databaseConnector.listarDIs(page, limit, filters);
            
            console.log(`✅ DataLoader: ${response?.data?.length || 0} DIs encontradas`);
            
            return response;
            
        } catch (error) {
            console.error('❌ DataLoader: Erro ao listar DIs', error);
            throw error;
        }
    }

    /**
     * Obtém estatísticas do banco
     * @returns {object} Estatísticas gerais
     */
    async getStats() {
        await this.init();
        
        try {
            // Usar endpoint de status que já existe
            const response = await this.databaseConnector.checkAPIStatus();
            
            if (response && response.stats) {
                return response.stats;
            }
            
            return {
                total_dis: 0,
                total_adicoes: 0,
                total_mercadorias: 0,
                last_import: null
            };
            
        } catch (error) {
            console.error('❌ DataLoader: Erro ao obter estatísticas', error);
            return {
                total_dis: 0,
                total_adicoes: 0, 
                total_mercadorias: 0,
                last_import: null
            };
        }
    }

    /**
     * Valida se DI carregada tem dados necessários para cálculos
     * @returns {boolean} Se DI é válida
     */
    validateLoadedDI() {
        if (!this.diData) {
            throw new Error('Nenhuma DI carregada');
        }
        
        if (!this.diData.numero_di) {
            throw new Error('Número da DI não encontrado');
        }
        
        if (!this.diData.adicoes || this.diData.adicoes.length === 0) {
            throw new Error('DI sem adições - não é possível calcular impostos');
        }
        
        if (!this.diData.importador_uf) {
            throw new Error('Estado do importador não encontrado - necessário para cálculo ICMS');
        }
        
        console.log('✅ DataLoader: DI validada com sucesso');
        return true;
    }

    /**
     * Obtém dados da DI atualmente carregada
     * @returns {object} Dados da DI
     */
    getCurrentDI() {
        return this.diData;
    }

    /**
     * Limpa dados carregados
     */
    clear() {
        this.diData = null;
        console.log('🧹 DataLoader: Dados limpos');
    }

    /**
     * Formata dados para compatibilidade com ComplianceCalculator
     * @returns {object} Dados formatados
     */
    getFormattedData() {
        if (!this.diData) {
            throw new Error('Nenhuma DI carregada');
        }
        
        // Os dados da API já estão no formato correto
        // Apenas garantir alguns campos necessários e calcular taxa de câmbio
        const taxaCambio = this.calcularTaxaCambio();
        
        const formatted = {
            ...this.diData,
            
            // Garantir campo importador estruturado
            importador: {
                nome: this.diData.importador_nome,
                cnpj: this.diData.importador_cnpj,
                endereco_uf: this.diData.importador_uf,
                cidade: this.diData.importador_cidade
            },
            
            // Garantir totais calculados
            totais: this.diData.resumo || {},
            
            // CRÍTICO: Adicionar taxa de câmbio na DI e em cada adição
            taxa_cambio: taxaCambio,
            adicoes: this.diData.adicoes?.map(adicao => ({
                ...adicao,
                taxa_cambio: taxaCambio,
                // Garantir conversão numérica de valores críticos
                valor_reais: parseFloat(adicao.valor_reais),
                valor_moeda_negociacao: parseFloat(adicao.valor_moeda_negociacao),
                peso_liquido: parseFloat(adicao.peso_liquido),
                quantidade_estatistica: parseFloat(adicao.quantidade_estatistica),
                // Garantir tributos também sejam numéricos
                tributos: adicao.tributos ? {
                    ...adicao.tributos,
                    ii_aliquota_ad_valorem: parseFloat(adicao.tributos.ii_aliquota_ad_valorem),
                    ii_valor_devido: parseFloat(adicao.tributos.ii_valor_devido),
                    ipi_aliquota_ad_valorem: parseFloat(adicao.tributos.ipi_aliquota_ad_valorem),
                    ipi_valor_devido: parseFloat(adicao.tributos.ipi_valor_devido),
                    pis_aliquota_ad_valorem: parseFloat(adicao.tributos.pis_aliquota_ad_valorem),
                    pis_valor_devido: parseFloat(adicao.tributos.pis_valor_devido),
                    cofins_aliquota_ad_valorem: parseFloat(adicao.tributos.cofins_aliquota_ad_valorem),
                    cofins_valor_devido: parseFloat(adicao.tributos.cofins_valor_devido)
                } : null
            }))
        };
        
        return formatted;
    }

    /**
     * Calcula taxa de câmbio da DI baseada nos totais da DI
     * @returns {number} Taxa de câmbio calculada
     */
    calcularTaxaCambio() {
        if (!this.diData.adicoes || this.diData.adicoes.length === 0) {
            throw new Error('Sem adições para calcular taxa de câmbio');
        }
        
        // Calcular totais de toda a DI (não por adição individual)
        let totalReais = 0;
        let totalMoedaEstrangeira = 0;
        
        for (const adicao of this.diData.adicoes) {
            const valorReais = parseFloat(adicao.valor_reais);
            const valorMoedaNegociacao = parseFloat(adicao.valor_moeda_negociacao);
            
            if (!isNaN(valorReais)) {
                totalReais += valorReais;
            }
            
            if (!isNaN(valorMoedaNegociacao)) {
                totalMoedaEstrangeira += valorMoedaNegociacao;
            }
        }
        
        if (totalMoedaEstrangeira <= 0 || totalReais <= 0) {
            throw new Error(`Taxa de câmbio não pode ser calculada - totais inválidos: totalReais=${totalReais}, totalMoedaEstrangeira=${totalMoedaEstrangeira}`);
        }
        
        // Taxa única da DI = Total em Reais / Total em Moeda Estrangeira
        const taxa = totalReais / totalMoedaEstrangeira;
        console.log(`💱 Taxa de câmbio DI calculada: ${taxa.toFixed(4)} (Total R$ ${totalReais} / Total $ ${totalMoedaEstrangeira})`);
        
        return taxa;
    }

    /**
     * Consolidar despesas automáticas + extras (migrado do DIProcessor)
     * @param {Object} despesasExtras - Despesas extras informadas pelo usuário
     * @returns {Object} Despesas consolidadas com classificação tributária
     */
    consolidarDespesasCompletas(despesasExtras = {}) {
        console.log('🔄 Consolidando despesas automáticas + extras...');
        
        const despesasAutomaticas = this.diData.despesas_aduaneiras || {};
        
        const despesasConsolidadas = {
            // Despesas automáticas da DI (sempre tributáveis para ICMS)
            automaticas: {
                siscomex: despesasAutomaticas.calculadas?.siscomex || 0,
                afrmm: despesasAutomaticas.calculadas?.afrmm || 0,
                capatazia: despesasAutomaticas.calculadas?.capatazia || 0,
                total: (despesasAutomaticas.calculadas?.siscomex || 0) + 
                       (despesasAutomaticas.calculadas?.afrmm || 0) + 
                       (despesasAutomaticas.calculadas?.capatazia || 0)
            },
            
            // Despesas extras informadas pelo usuário
            extras: {
                armazenagem_extra: despesasExtras.armazenagem_extra || 0,
                transporte_interno: despesasExtras.transporte_interno || 0,
                despachante: despesasExtras.despachante || 0,
                outros_portuarios: despesasExtras.outros_portuarios || 0,
                bancarios: despesasExtras.bancarios || 0,
                administrativos: despesasExtras.administrativos || 0,
                outros_extras: despesasExtras.outros_extras || 0
            },
            
            // Classificação tributária (definida pelo usuário)
            classificacao: {
                tributaveis_icms: despesasExtras.tributaveis_icms || {},
                apenas_custeio: despesasExtras.apenas_custeio || {}
            }
        };
        
        // Calcular totais por classificação
        let totalTributavel = despesasConsolidadas.automaticas.total; // DI sempre tributável
        let totalCusteio = 0;
        
        // Processar despesas extras conforme classificação
        Object.keys(despesasConsolidadas.extras).forEach(key => {
            const valor = despesasConsolidadas.extras[key];
            if (valor > 0) {
                if (despesasConsolidadas.classificacao.tributaveis_icms[key]) {
                    totalTributavel += valor;
                } else {
                    totalCusteio += valor;
                }
            }
        });
        
        despesasConsolidadas.totais = {
            automaticas: despesasConsolidadas.automaticas.total,
            extras: Object.values(despesasConsolidadas.extras).reduce((sum, val) => sum + val, 0),
            tributavel_icms: totalTributavel,
            apenas_custeio: totalCusteio,
            geral: totalTributavel + totalCusteio
        };
        
        console.log('✅ Despesas consolidadas:', despesasConsolidadas);
        return despesasConsolidadas;
    }

    /**
     * Carregar despesas aduaneiras da API
     * Mapeia a estrutura da API para o formato esperado pelo sistema
     */
    async carregarDespesasAduaneiras() {
        if (!this.diData?.numero_di) {
            console.warn('⚠️ Número da DI não disponível para carregar despesas');
            return;
        }
        
        try {
            console.log(`🔍 Carregando despesas aduaneiras da DI ${this.diData.numero_di}...`);
            
            const response = await fetch(`../../api/endpoints/buscar-despesas.php?numero_di=${this.diData.numero_di}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const despesasData = await response.json();
            
            if (!despesasData.success) {
                throw new Error(`API error: ${despesasData.message || 'Erro desconhecido'}`);
            }
            
            // Mapear estrutura da API para formato esperado
            const despesasCalculadas = {
                siscomex: 0,
                afrmm: 0,
                capatazia: 0
            };
            
            // Processar despesas retornadas pela API
            if (despesasData.despesas && Array.isArray(despesasData.despesas)) {
                despesasData.despesas.forEach(despesa => {
                    const tipo = despesa.tipo_despesa.toLowerCase();
                    const valor = parseFloat(despesa.valor) || 0;
                    
                    if (despesasCalculadas.hasOwnProperty(tipo)) {
                        despesasCalculadas[tipo] = valor;
                    }
                });
            }
            
            // Estruturar no formato esperado pelo sistema
            this.diData.despesas_aduaneiras = {
                calculadas: despesasCalculadas,
                total_despesas_aduaneiras: despesasData.total_valor || 0,
                fonte: 'php_parser',
                extraido_de: 'informacaoComplementar',
                timestamp: new Date().toISOString()
            };
            
            console.log(`✅ Despesas aduaneiras carregadas: ${this.diData.despesas_aduaneiras.total_despesas_aduaneiras}`, despesasCalculadas);
            
        } catch (error) {
            console.error('❌ Erro ao carregar despesas aduaneiras:', error);
            // Fallback: definir estrutura vazia
            this.diData.despesas_aduaneiras = {
                calculadas: { siscomex: 0, afrmm: 0, capatazia: 0 },
                total_despesas_aduaneiras: 0,
                fonte: 'fallback',
                erro: error.message
            };
        }
    }

    /**
     * Obtém despesas automáticas já extraídas da DI
     * @returns {Object} Despesas automáticas da DI
     */
    getDespesasAutomaticas() {
        return this.diData.despesas_aduaneiras || {};
    }

    /**
     * Retorna dados da DI processados
     * @returns {Object} Dados da DI
     */
    getData() {
        return this.diData;
    }

    /**
     * Formata data AAAAMMDD para DD/MM/AAAA
     * @param {string} dateString - Data no formato AAAAMMDD
     * @returns {string} Data formatada DD/MM/AAAA
     */
    formatDate(dateString) {
        if (!dateString || dateString.length !== 8) return dateString;
        return `${dateString.substring(6,8)}/${dateString.substring(4,6)}/${dateString.substring(0,4)}`;
    }

    /**
     * Formata CNPJ com máscara brasileira
     * @param {string} cnpj - CNPJ sem formatação
     * @returns {string} CNPJ formatado XX.XXX.XXX/XXXX-XX
     */
    formatCNPJ(cnpj) {
        if (!cnpj) return '';
        const clean = cnpj.replace(/\D/g, '');
        return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }

    /**
     * Formata CPF com máscara brasileira
     * @param {string} cpf - CPF sem formatação
     * @returns {string} CPF formatado XXX.XXX.XXX-XX
     */
    formatCPF(cpf) {
        if (!cpf) return '';
        const clean = cpf.replace(/\D/g, '');
        return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }

    /**
     * Formata CEP com máscara brasileira
     * @param {string} cep - CEP sem formatação
     * @returns {string} CEP formatado XXXXX-XXX
     */
    formatCEP(cep) {
        if (!cep) return '';
        const clean = cep.replace(/\D/g, '');
        return clean.replace(/^(\d{5})(\d{3})$/, '$1-$2');
    }

    /**
     * Monta endereço completo formatado
     * @param {Object} endereco - Objeto com dados do endereço
     * @returns {string} Endereço completo formatado
     */
    buildEnderecoCompleto(endereco) {
        const partes = [
            endereco.endereco_logradouro,
            endereco.endereco_numero,
            endereco.endereco_complemento,
            endereco.endereco_bairro,
            endereco.endereco_cidade,
            endereco.endereco_uf,
            endereco.endereco_cep
        ].filter(parte => parte && parte.trim());

        return partes.join(', ');
    }

    /**
     * Converte valores por tipo (migrado do DIProcessor)
     * @param {string} rawValue - Valor bruto
     * @param {string} type - Tipo de conversão
     * @returns {number} Valor convertido
     */
    convertValue(rawValue, type = 'integer') {
        if (!rawValue || rawValue === '0'.repeat(rawValue.length)) {
            return 0;
        }
        
        const value = parseInt(rawValue);
        
        switch(type) {
            case 'monetary':
                // Valores monetários em centavos: 10120 → 101.20
                return value / 100;
                
            case 'weight':
                // Pesos com 5 decimais: 20000 → 0.20000 kg (conforme DI oficial)
                return value / 100000;
                
            case 'unit_value':
                // Valor unitário com 7 decimais: 44682000000 → 4468.20
                return value / 10000000;
                
            case 'percentage':
                // Alíquotas em centésimos: 650 → 6.50%
                return value / 100;
                
            case 'integer':
            default:
                return value;
        }
    }

    /**
     * Parse de número com divisor específico
     * @param {string} value - Valor a ser parseado
     * @param {number} divisor - Divisor a aplicar
     * @returns {number} Valor parseado
     */
    parseNumber(value, divisor = 1) {
        if (!value || value === '0'.repeat(value.length)) return 0;
        return parseInt(value) / divisor;
    }

    /**
     * Parse de valor monetário de string
     * @param {string} valueString - String com valor monetário
     * @returns {number} Valor numérico
     */
    parseValueFromString(valueString) {
        const cleanValue = valueString.replace(/\./g, '').replace(',', '.');
        return parseFloat(cleanValue);
    }

    /**
     * Retorna descrição do incoterm
     * @param {string} incoterm - Código do incoterm
     * @returns {string} Descrição do incoterm
     */
    getIncotermDescription(incoterm) {
        const incoterms = {
            'EXW': 'Ex Works - Na fábrica',
            'FCA': 'Free Carrier - Transportador livre',
            'CPT': 'Carriage Paid To - Transporte pago até',
            'CIP': 'Carriage and Insurance Paid - Transporte e seguro pagos',
            'DAT': 'Delivered at Terminal - Entregue no terminal',
            'DAP': 'Delivered at Place - Entregue no local',
            'DDP': 'Delivered Duty Paid - Entregue com direitos pagos',
            'FAS': 'Free Alongside Ship - Livre ao lado do navio',
            'FOB': 'Free on Board - Livre a bordo',
            'CFR': 'Cost and Freight - Custo e frete',
            'CIF': 'Cost, Insurance and Freight - Custo, seguro e frete'
        };
        
        return incoterms[incoterm] || `Incoterm ${incoterm}`;
    }

    /**
     * Verifica se o frete está incluído no incoterm
     * @param {string} incoterm - Código do incoterm
     * @returns {boolean} True se frete incluído
     */
    isFreteIncluidoIncoterm(incoterm) {
        const incotermComFrete = ['CPT', 'CIP', 'DAT', 'DAP', 'DDP', 'CFR', 'CIF'];
        return incotermComFrete.includes(incoterm);
    }

    /**
     * Verifica se o seguro está incluído no incoterm
     * @param {string} incoterm - Código do incoterm
     * @returns {boolean} True se seguro incluído
     */
    isSeguroIncluidoIncoterm(incoterm) {
        const incotermComSeguro = ['CIP', 'DDP', 'CIF'];
        return incotermComSeguro.includes(incoterm);
    }

    /**
     * Retorna responsabilidades do importador baseado no incoterm
     * @param {string} incoterm - Código do incoterm
     * @returns {string} Descrição das responsabilidades
     */
    getResponsabilidadeImportador(incoterm) {
        const responsabilidades = {
            'EXW': 'Máxima responsabilidade - Importador assume todos os custos e riscos',
            'FCA': 'Alta responsabilidade - Importador assume custos de transporte principal',
            'CPT': 'Responsabilidade moderada - Frete pago pelo exportador',
            'CIP': 'Responsabilidade moderada - Frete e seguro pagos pelo exportador',
            'DAT': 'Baixa responsabilidade - Entrega no terminal de destino',
            'DAP': 'Baixa responsabilidade - Entrega no local acordado',
            'DDP': 'Mínima responsabilidade - Exportador assume praticamente tudo',
            'FAS': 'Alta responsabilidade - Importador assume frete marítimo e seguros',
            'FOB': 'Responsabilidade moderada-alta - Importador assume frete e seguro marítimo',
            'CFR': 'Responsabilidade moderada - Frete pago pelo exportador, seguro por conta do importador',
            'CIF': 'Responsabilidade moderada - Frete e seguro básico pagos pelo exportador'
        };
        
        return responsabilidades[incoterm] || 'Responsabilidade conforme acordo';
    }
}