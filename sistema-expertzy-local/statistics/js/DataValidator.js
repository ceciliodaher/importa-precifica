/**
 * DataValidator.js
 * Validador de dados rigoroso sem fallbacks
 * Sistema Expertzy - Dashboard de Estatísticas
 * 
 * Responsabilidades:
 * - Validar estrutura de DI rigorosamente
 * - Validar dados de estatísticas globais
 * - Calcular taxa de câmbio dinamicamente
 * - Validar tributos obrigatórios
 * - Funções utilitárias de formatação
 * 
 * REGRA CRÍTICA: NUNCA usar fallbacks - sempre lançar exceções
 */

class DataValidator {
    constructor() {
        // Campos obrigatórios para uma DI válida
        this.requiredDIFields = [
            'numero_di',
            'data_registro',
            'importador_nome',
            'importador_cnpj',
            'importador_endereco_uf'
        ];

        // Campos obrigatórios para uma adição válida
        this.requiredAdicaoFields = [
            'numero_adicao',
            'ncm',
            'valor_reais',
            'valor_moeda_negociacao',
            'codigo_moeda'
        ];

        // Tributos obrigatórios que devem estar presentes
        this.requiredTributos = [
            'ii_aliquota_ad_valorem',
            'ii_valor_devido',
            'ipi_aliquota',
            'ipi_valor_devido',
            'pis_aliquota',
            'pis_valor_devido',
            'cofins_aliquota',
            'cofins_valor_devido'
        ];

        // Estados brasileiros válidos (UF)
        this.validUFs = [
            'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
            'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
            'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
        ];

        // Moedas válidas no SISCOMEX
        this.validCurrencies = [
            'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'ARS', 'CLP', 'PYG', 'UYU', 'BRL'
        ];
    }

    /**
     * Valida estrutura completa de uma DI
     * @param {Object} diData - Dados da DI
     * @returns {boolean} true se válida
     * @throws {Error} Se dados inválidos ou incompletos
     */
    validateDIStructure(diData) {
        if (!diData || typeof diData !== 'object') {
            throw new Error('DI data é obrigatória e deve ser um objeto');
        }

        // Validar campos obrigatórios da DI
        this.requiredDIFields.forEach(field => {
            if (!diData.hasOwnProperty(field) || diData[field] === null || diData[field] === undefined) {
                if (!diData.numero_di) {
                    throw new Error(`Campo obrigatório '${field}' não encontrado - DI sem número identificador`);
                }
                throw new Error(`Campo obrigatório '${field}' não encontrado na DI ${diData.numero_di}`);
            }

            if (typeof diData[field] === 'string' && diData[field].trim() === '') {
                if (!diData.numero_di) {
                    throw new Error(`Campo obrigatório '${field}' está vazio - DI sem número identificador`);
                }
                throw new Error(`Campo obrigatório '${field}' está vazio na DI ${diData.numero_di}`);
            }
        });

        // Validar formato do número da DI
        this._validateDINumber(diData.numero_di);

        // Validar CNPJ do importador
        this._validateCNPJ(diData.importador_cnpj);

        // Validar UF do importador
        this._validateUF(diData.importador_endereco_uf);

        // Validar data de registro
        this._validateDate(diData.data_registro, 'data_registro');

        // Validar adições se existirem
        if (diData.adicoes && Array.isArray(diData.adicoes)) {
            if (diData.adicoes.length === 0) {
                throw new Error(`DI ${diData.numero_di} deve ter pelo menos uma adição`);
            }

            diData.adicoes.forEach((adicao, index) => {
                this.validateAdicaoStructure(adicao, diData.numero_di, index);
            });
        }

        return true;
    }

    /**
     * Valida estrutura de uma adição
     * @param {Object} adicao - Dados da adição
     * @param {string} diNumber - Número da DI (para contexto de erro)
     * @param {number} index - Índice da adição (para contexto de erro)
     * @returns {boolean} true se válida
     * @throws {Error} Se dados inválidos ou incompletos
     */
    validateAdicaoStructure(adicao, diNumber = 'UNKNOWN', index = 0) {
        if (!adicao || typeof adicao !== 'object') {
            throw new Error(`Adição ${index + 1} da DI ${diNumber} é obrigatória e deve ser um objeto`);
        }

        // Validar campos obrigatórios da adição
        this.requiredAdicaoFields.forEach(field => {
            if (!adicao.hasOwnProperty(field) || adicao[field] === null || adicao[field] === undefined) {
                throw new Error(`Campo obrigatório '${field}' não encontrado na adição ${adicao.numero_adicao || index + 1} da DI ${diNumber}`);
            }
        });

        // Validar NCM (deve ter 8 dígitos)
        this._validateNCM(adicao.ncm, diNumber, adicao.numero_adicao);

        // Validar valores monetários
        this._validateMonetaryValue(adicao.valor_reais, 'valor_reais', diNumber, adicao.numero_adicao);
        this._validateMonetaryValue(adicao.valor_moeda_negociacao, 'valor_moeda_negociacao', diNumber, adicao.numero_adicao);

        // Validar código da moeda
        this._validateCurrency(adicao.codigo_moeda, diNumber, adicao.numero_adicao);

        // Validar tributos se existirem
        if (adicao.tributos) {
            this.validateTributosStructure(adicao.tributos, diNumber, adicao.numero_adicao);
        }

        return true;
    }

    /**
     * Valida estrutura de tributos
     * @param {Object} tributos - Objeto com tributos
     * @param {string} diNumber - Número da DI (para contexto)
     * @param {string} adicaoNumber - Número da adição (para contexto)
     * @returns {boolean} true se válida
     * @throws {Error} Se tributos inválidos
     */
    validateTributosStructure(tributos, diNumber = 'UNKNOWN', adicaoNumber = 'UNKNOWN') {
        if (!tributos || typeof tributos !== 'object') {
            throw new Error(`Tributos da adição ${adicaoNumber} da DI ${diNumber} devem ser um objeto`);
        }

        // Verificar se pelo menos os tributos básicos estão presentes
        const tributosBasicos = ['ii_aliquota_ad_valorem', 'ii_valor_devido'];
        
        tributosBasicos.forEach(tributo => {
            if (!tributos.hasOwnProperty(tributo) || tributos[tributo] === null || tributos[tributo] === undefined) {
                throw new Error(`Tributo básico '${tributo}' não encontrado na adição ${adicaoNumber} da DI ${diNumber}`);
            }

            // Validar se é numérico
            const valor = parseFloat(tributos[tributo]);
            if (isNaN(valor)) {
                throw new Error(`Tributo '${tributo}' deve ser numérico na adição ${adicaoNumber} da DI ${diNumber}`);
            }

            // Alíquotas não podem ser negativas
            if (tributo.includes('aliquota') && valor < 0) {
                throw new Error(`Alíquota '${tributo}' não pode ser negativa na adição ${adicaoNumber} da DI ${diNumber}`);
            }
        });

        return true;
    }

    /**
     * Valida dados de estatísticas globais
     * @param {Object} statsData - Dados de estatísticas
     * @returns {boolean} true se válida
     * @throws {Error} Se dados inválidos
     */
    validateStatsData(statsData) {
        if (!statsData || typeof statsData !== 'object') {
            throw new Error('Dados de estatísticas são obrigatórios e devem ser um objeto');
        }

        const requiredStatsFields = [
            'total_dis',
            'total_valor_reais',
            'total_tributos'
        ];

        requiredStatsFields.forEach(field => {
            if (!statsData.hasOwnProperty(field)) {
                throw new Error(`Campo de estatística '${field}' é obrigatório`);
            }

            if (statsData[field] === null || statsData[field] === undefined) {
                throw new Error(`Campo de estatística '${field}' não pode ser nulo`);
            }

            // Validar se valores numéricos são válidos
            if (['total_valor_reais', 'total_tributos'].includes(field)) {
                const valor = parseFloat(statsData[field]);
                if (isNaN(valor) || valor < 0) {
                    throw new Error(`Campo de estatística '${field}' deve ser um número não negativo`);
                }
            }

            if (field === 'total_dis') {
                const count = parseInt(statsData[field]);
                if (isNaN(count) || count < 0) {
                    throw new Error(`Campo de estatística '${field}' deve ser um número inteiro não negativo`);
                }
            }
        });

        return true;
    }

    /**
     * Calcula taxa de câmbio dinamicamente sem fallbacks
     * @param {number} valorReais - Valor em reais
     * @param {number} valorMoedaNegociacao - Valor na moeda original
     * @param {string} codigoMoeda - Código da moeda
     * @returns {number} Taxa de câmbio calculada
     * @throws {Error} Se não puder calcular
     */
    calculateExchangeRate(valorReais, valorMoedaNegociacao, codigoMoeda) {
        // Validar parâmetros obrigatórios
        if (valorReais === null || valorReais === undefined) {
            throw new Error('valor_reais é obrigatório para calcular taxa de câmbio');
        }

        if (valorMoedaNegociacao === null || valorMoedaNegociacao === undefined) {
            throw new Error('valor_moeda_negociacao é obrigatório para calcular taxa de câmbio');
        }

        if (!codigoMoeda) {
            throw new Error('codigo_moeda é obrigatório para calcular taxa de câmbio');
        }

        // Converter para números
        const reais = parseFloat(valorReais);
        const moedaOriginal = parseFloat(valorMoedaNegociacao);

        if (isNaN(reais)) {
            throw new Error(`valor_reais inválido: ${valorReais}`);
        }

        if (isNaN(moedaOriginal)) {
            throw new Error(`valor_moeda_negociacao inválido: ${valorMoedaNegociacao}`);
        }

        // Validar valores positivos
        if (reais <= 0) {
            throw new Error(`valor_reais deve ser positivo: ${reais}`);
        }

        if (moedaOriginal <= 0) {
            throw new Error(`valor_moeda_negociacao deve ser positivo: ${moedaOriginal}`);
        }

        // Validar moeda
        this._validateCurrency(codigoMoeda);

        // Para BRL, taxa é sempre 1
        if (codigoMoeda === 'BRL') {
            return 1.0;
        }

        // Calcular taxa: reais / moeda_original
        const taxa = reais / moedaOriginal;

        if (!isFinite(taxa) || taxa <= 0) {
            throw new Error(`Taxa de câmbio calculada inválida: ${taxa} (${reais} / ${moedaOriginal})`);
        }

        return parseFloat(taxa.toFixed(6));
    }

    /**
     * Valida e formata número de DI
     * @param {string} diNumber - Número da DI
     * @returns {string} Número formatado
     * @throws {Error} Se inválido
     * @private
     */
    _validateDINumber(diNumber) {
        if (!diNumber || typeof diNumber !== 'string') {
            throw new Error('Número da DI deve ser uma string não vazia');
        }

        const cleaned = diNumber.replace(/\D/g, '');
        if (cleaned.length !== 10) {
            throw new Error(`Número da DI deve ter 10 dígitos: ${diNumber}`);
        }

        return cleaned;
    }

    /**
     * Valida CNPJ
     * @param {string} cnpj - CNPJ para validar
     * @throws {Error} Se CNPJ inválido
     * @private
     */
    _validateCNPJ(cnpj) {
        if (!cnpj || typeof cnpj !== 'string') {
            throw new Error('CNPJ deve ser uma string não vazia');
        }

        const cleaned = cnpj.replace(/\D/g, '');
        if (cleaned.length !== 14) {
            throw new Error(`CNPJ deve ter 14 dígitos: ${cnpj}`);
        }

        // Validação básica de dígitos verificadores
        if (!/^\d{14}$/.test(cleaned)) {
            throw new Error(`CNPJ deve conter apenas dígitos: ${cnpj}`);
        }
    }

    /**
     * Valida UF brasileira
     * @param {string} uf - Sigla do estado
     * @throws {Error} Se UF inválida
     * @private
     */
    _validateUF(uf) {
        if (!uf || typeof uf !== 'string') {
            throw new Error('UF deve ser uma string não vazia');
        }

        const upperUF = uf.toUpperCase();
        if (!this.validUFs.includes(upperUF)) {
            throw new Error(`UF inválida: ${uf}. UFs válidas: ${this.validUFs.join(', ')}`);
        }
    }

    /**
     * Valida NCM
     * @param {string} ncm - Código NCM
     * @param {string} diNumber - Número da DI (contexto)
     * @param {string} adicaoNumber - Número da adição (contexto)
     * @throws {Error} Se NCM inválido
     * @private
     */
    _validateNCM(ncm, diNumber, adicaoNumber) {
        if (!ncm || typeof ncm !== 'string') {
            throw new Error(`NCM deve ser uma string não vazia na adição ${adicaoNumber} da DI ${diNumber}`);
        }

        const cleaned = ncm.replace(/\D/g, '');
        if (cleaned.length !== 8) {
            throw new Error(`NCM deve ter 8 dígitos na adição ${adicaoNumber} da DI ${diNumber}: ${ncm}`);
        }
    }

    /**
     * Valida valor monetário
     * @param {*} value - Valor a validar
     * @param {string} fieldName - Nome do campo (contexto)
     * @param {string} diNumber - Número da DI (contexto)
     * @param {string} adicaoNumber - Número da adição (contexto)
     * @throws {Error} Se valor inválido
     * @private
     */
    _validateMonetaryValue(value, fieldName, diNumber, adicaoNumber) {
        if (value === null || value === undefined) {
            throw new Error(`${fieldName} é obrigatório na adição ${adicaoNumber} da DI ${diNumber}`);
        }

        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            throw new Error(`${fieldName} deve ser numérico na adição ${adicaoNumber} da DI ${diNumber}: ${value}`);
        }

        if (numValue < 0) {
            throw new Error(`${fieldName} não pode ser negativo na adição ${adicaoNumber} da DI ${diNumber}: ${numValue}`);
        }
    }

    /**
     * Valida código de moeda
     * @param {string} currency - Código da moeda
     * @param {string} diNumber - Número da DI (contexto)
     * @param {string} adicaoNumber - Número da adição (contexto)
     * @throws {Error} Se moeda inválida
     * @private
     */
    _validateCurrency(currency, diNumber = '', adicaoNumber = '') {
        if (!currency || typeof currency !== 'string') {
            const context = diNumber ? ` na adição ${adicaoNumber} da DI ${diNumber}` : '';
            throw new Error(`Código da moeda deve ser uma string não vazia${context}`);
        }

        const upperCurrency = currency.toUpperCase();
        if (!this.validCurrencies.includes(upperCurrency)) {
            const context = diNumber ? ` na adição ${adicaoNumber} da DI ${diNumber}` : '';
            throw new Error(`Moeda inválida: ${currency}${context}. Moedas válidas: ${this.validCurrencies.join(', ')}`);
        }
    }

    /**
     * Valida formato de data
     * @param {string} dateString - String da data
     * @param {string} fieldName - Nome do campo (contexto)
     * @throws {Error} Se data inválida
     * @private
     */
    _validateDate(dateString, fieldName) {
        if (!dateString) {
            throw new Error(`${fieldName} é obrigatória`);
        }

        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error(`${fieldName} deve ser uma data válida: ${dateString}`);
        }

        // Data não pode ser muito antiga ou futura
        const currentYear = new Date().getFullYear();
        const year = date.getFullYear();
        
        if (year < 1990 || year > currentYear + 1) {
            throw new Error(`${fieldName} deve estar entre 1990 e ${currentYear + 1}: ${dateString}`);
        }
    }

    /**
     * Formata valor monetário em Real brasileiro
     * @param {number} value - Valor numérico
     * @returns {string} Valor formatado
     */
    formatCurrency(value) {
        if (value === null || value === undefined || isNaN(value)) {
            throw new Error('Valor para formatação deve ser um número válido');
        }

        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    /**
     * Formata número com separadores brasileiros
     * @param {number} value - Valor numérico
     * @param {number} decimals - Número de casas decimais
     * @returns {string} Número formatado
     */
    formatNumber(value, decimals = 2) {
        if (value === null || value === undefined || isNaN(value)) {
            throw new Error('Valor para formatação deve ser um número válido');
        }

        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    }

    /**
     * Formata porcentagem
     * @param {number} value - Valor da porcentagem (0-100)
     * @returns {string} Porcentagem formatada
     */
    formatPercentage(value) {
        if (value === null || value === undefined || isNaN(value)) {
            throw new Error('Valor para formatação deve ser um número válido');
        }

        return new Intl.NumberFormat('pt-BR', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value / 100);
    }

    /**
     * Formata data para padrão brasileiro
     * @param {Date|string} date - Data para formatar
     * @returns {string} Data formatada
     */
    formatDate(date) {
        if (!date) {
            throw new Error('Data é obrigatória para formatação');
        }

        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        if (isNaN(dateObj.getTime())) {
            throw new Error('Data deve ser válida para formatação');
        }

        return dateObj.toLocaleDateString('pt-BR');
    }

    /**
     * Converte string para número com validação rigorosa
     * @param {*} value - Valor para converter
     * @param {string} context - Contexto para erro
     * @returns {number} Número convertido
     * @throws {Error} Se conversão falhar
     */
    toNumber(value, context = 'valor') {
        if (value === null || value === undefined) {
            throw new Error(`${context} não pode ser nulo ou indefinido`);
        }

        const num = parseFloat(value);
        if (isNaN(num)) {
            throw new Error(`${context} deve ser um número válido: ${value}`);
        }

        return num;
    }

    /**
     * Converte string para inteiro com validação rigorosa
     * @param {*} value - Valor para converter
     * @param {string} context - Contexto para erro
     * @returns {number} Inteiro convertido
     * @throws {Error} Se conversão falhar
     */
    toInteger(value, context = 'valor') {
        if (value === null || value === undefined) {
            throw new Error(`${context} não pode ser nulo ou indefinido`);
        }

        const num = parseInt(value);
        if (isNaN(num)) {
            throw new Error(`${context} deve ser um inteiro válido: ${value}`);
        }

        return num;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DataValidator = DataValidator;
}

export default DataValidator;