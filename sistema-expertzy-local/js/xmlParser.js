/**
 * Parser XML para Declarações de Importação (DI)
 * Baseado na estrutura real do XML 2300120746
 * Segue nomenclaturas definidas na documentação
 */
class DiParser {
    constructor() {
        this.diData = {};
        this.originalXmlContent = null;
        this.incotermIdentificado = null;
    }

    /**
     * Método principal para parsing do XML
     * @param {string} xmlContent - Conteúdo do arquivo XML
     * @returns {Object} Dados estruturados da DI
     */
    parseXML(xmlContent) {
        try {
            this.originalXmlContent = xmlContent;
            
            // Parse do XML usando DOMParser
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
            
            // Verificar se houve erros no parsing
            const parseError = xmlDoc.querySelector("parsererror");
            if (parseError) {
                throw new Error("Erro ao fazer parse do XML: " + parseError.textContent);
            }

            // Identificar incoterm automaticamente
            this.identifyIncoterm(xmlDoc);

            // Extrair dados gerais da DI
            this.extractDadosGerais(xmlDoc);
            
            // Extrair informações do importador
            this.extractImportador(xmlDoc);
            
            // Extrair dados da carga
            this.extractDadosCarga(xmlDoc);
            
            // Extrair adições
            this.extractAdicoes(xmlDoc);
            
            // Extrair informações complementares
            this.extractInformacoesComplementares(xmlDoc);
            
            // Calcular totais
            this.calculateTotals();
            
            // Adicionar incoterm identificado aos dados gerais
            this.diData.incoterm_identificado = this.incotermIdentificado;
            
            return this.diData;
            
        } catch (error) {
            console.error('Erro no parsing XML:', error);
            throw new Error(`Erro ao processar XML: ${error.message}`);
        }
    }

    /**
     * Identifica automaticamente o incoterm da DI
     * Verifica a primeira adição para determinar o incoterm padrão
     */
    identifyIncoterm(xmlDoc) {
        const primeiraAdicao = xmlDoc.querySelector('adicao');
        
        if (primeiraAdicao) {
            const incoterm = this.getTextContent(primeiraAdicao, 'condicaoVendaIncoterm');
            
            if (incoterm) {
                this.incotermIdentificado = {
                    codigo: incoterm,
                    descricao: this.getIncotermDescription(incoterm),
                    frete_incluido: this.isFreteIncluidoIncoterm(incoterm),
                    seguro_incluido: this.isSeguroIncluidoIncoterm(incoterm),
                    responsabilidade_importador: this.getResponsabilidadeImportador(incoterm)
                };
                
                console.log(`Incoterm identificado: ${incoterm} - ${this.incotermIdentificado.descricao}`);
            }
        }
    }

    /**
     * Retorna descrição do incoterm
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
     */
    isFreteIncluidoIncoterm(incoterm) {
        const incotermComFrete = ['CPT', 'CIP', 'DAT', 'DAP', 'DDP', 'CFR', 'CIF'];
        return incotermComFrete.includes(incoterm);
    }

    /**
     * Verifica se o seguro está incluído no incoterm
     */
    isSeguroIncluidoIncoterm(incoterm) {
        const incotermComSeguro = ['CIP', 'DDP', 'CIF'];
        return incotermComSeguro.includes(incoterm);
    }

    /**
     * Retorna responsabilidades do importador baseado no incoterm
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

    /**
     * Extrai dados gerais da DI
     */
    extractDadosGerais(xmlDoc) {
        const diNode = xmlDoc.querySelector('declaracaoImportacao');
        
        if (!diNode) {
            throw new Error('Estrutura XML inválida: não foi encontrado o nó declaracaoImportacao');
        }

        this.diData.numero_di = this.getTextContent(diNode, 'numeroDI');
        this.diData.data_registro = this.formatDate(this.getTextContent(diNode, 'dataRegistro'));
        this.diData.urf_despacho_codigo = this.getTextContent(diNode, 'urfDespachoCodigo');
        this.diData.urf_despacho_nome = this.getTextContent(diNode, 'urfDespachoNome');
        this.diData.modalidade_codigo = this.getTextContent(diNode, 'modalidadeDespachoCodigo');
        this.diData.modalidade_nome = this.getTextContent(diNode, 'modalidadeDespachoNome');
        this.diData.situacao_entrega = this.getTextContent(diNode, 'situacaoEntregaCarga');
        this.diData.total_adicoes = parseInt(this.getTextContent(diNode, 'totalAdicoes')) || 0;
    }

    /**
     * Extrai dados do importador
     */
    extractImportador(xmlDoc) {
        const diNode = xmlDoc.querySelector('declaracaoImportacao');
        
        this.diData.importador = {
            nome: this.getTextContent(diNode, 'importadorNome'),
            cnpj: this.formatCNPJ(this.getTextContent(diNode, 'importadorNumero')),
            endereco_logradouro: this.getTextContent(diNode, 'importadorEnderecoLogradouro'),
            endereco_numero: this.getTextContent(diNode, 'importadorEnderecoNumero'),
            endereco_complemento: this.getTextContent(diNode, 'importadorEnderecoComplemento'),
            endereco_bairro: this.getTextContent(diNode, 'importadorEnderecoBairro'),
            endereco_cidade: this.getTextContent(diNode, 'importadorEnderecoCidade'),
            endereco_uf: this.getTextContent(diNode, 'importadorEnderecoUf'),
            endereco_cep: this.formatCEP(this.getTextContent(diNode, 'importadorEnderecoCep')),
            representante_nome: this.getTextContent(diNode, 'importadorNomeRepresentanteLegal'),
            representante_cpf: this.formatCPF(this.getTextContent(diNode, 'importadorCpfRepresentanteLegal')),
            telefone: this.getTextContent(diNode, 'importadorNumeroTelefone')
        };

        // Montar endereço completo
        this.diData.importador.endereco_completo = this.buildEnderecoCompleto(this.diData.importador);
    }

    /**
     * Extrai dados da carga
     */
    extractDadosCarga(xmlDoc) {
        const diNode = xmlDoc.querySelector('declaracaoImportacao');
        
        this.diData.carga = {
            peso_bruto: this.parseNumber(this.getTextContent(diNode, 'cargaPesoBruto'), 1000000),
            peso_liquido: this.parseNumber(this.getTextContent(diNode, 'cargaPesoLiquido'), 1000000),
            pais_procedencia_codigo: this.getTextContent(diNode, 'cargaPaisProcedenciaCodigo'),
            pais_procedencia_nome: this.getTextContent(diNode, 'cargaPaisProcedenciaNome'),
            urf_entrada_codigo: this.getTextContent(diNode, 'cargaUrfEntradaCodigo'),
            urf_entrada_nome: this.getTextContent(diNode, 'cargaUrfEntradaNome'),
            data_chegada: this.formatDate(this.getTextContent(diNode, 'cargaDataChegada')),
            via_transporte_codigo: this.getTextContent(diNode, 'viaTransporteCodigo'),
            via_transporte_nome: this.getTextContent(diNode, 'viaTransporteNome'),
            nome_veiculo: this.getTextContent(diNode, 'viaTransporteNomeVeiculo'),
            nome_transportador: this.getTextContent(diNode, 'viaTransporteNomeTransportador')
        };
    }

    /**
     * Extrai todas as adições
     */
    extractAdicoes(xmlDoc) {
        const adicaoNodes = xmlDoc.querySelectorAll('adicao');
        this.diData.adicoes = [];

        adicaoNodes.forEach((adicaoNode, index) => {
            const adicao = this.extractAdicao(adicaoNode, index + 1);
            this.diData.adicoes.push(adicao);
        });
    }

    /**
     * Extrai uma adição específica
     */
    extractAdicao(adicaoNode, numeroAdicao) {
        const incoterm = this.getTextContent(adicaoNode, 'condicaoVendaIncoterm');
        
        const adicao = {
            numero_adicao: numeroAdicao.toString().padStart(3, '0'),
            
            // Classificação fiscal
            ncm: this.getTextContent(adicaoNode, 'dadosMercadoriaCodigoNcm'),
            descricao_ncm: this.getTextContent(adicaoNode, 'dadosMercadoriaNomeNcm'),
            codigo_naladi_sh: this.getTextContent(adicaoNode, 'dadosMercadoriaCodigoNaladiSH'),
            codigo_naladi_ncca: this.getTextContent(adicaoNode, 'dadosMercadoriaCodigoNaladiNCCA'),
            
            // Medidas e quantidades
            peso_liquido: this.parseNumber(this.getTextContent(adicaoNode, 'dadosMercadoriaPesoLiquido'), 1000000),
            quantidade_estatistica: this.parseNumber(this.getTextContent(adicaoNode, 'dadosMercadoriaMedidaEstatisticaQuantidade'), 1000000),
            unidade_estatistica: this.getTextContent(adicaoNode, 'dadosMercadoriaMedidaEstatisticaUnidade'),
            aplicacao_mercadoria: this.getTextContent(adicaoNode, 'dadosMercadoriaAplicacao'),
            condicao_mercadoria: this.getTextContent(adicaoNode, 'dadosMercadoriaCondicao'),
            
            // Valores comerciais e incoterm
            condicao_venda_incoterm: incoterm,
            incoterm_detalhes: {
                codigo: incoterm,
                descricao: this.getIncotermDescription(incoterm),
                frete_incluido: this.isFreteIncluidoIncoterm(incoterm),
                seguro_incluido: this.isSeguroIncluidoIncoterm(incoterm)
            },
            condicao_venda_local: this.getTextContent(adicaoNode, 'condicaoVendaLocal'),
            moeda_negociacao_codigo: this.getTextContent(adicaoNode, 'condicaoVendaMoedaCodigo'),
            moeda_negociacao_nome: this.getTextContent(adicaoNode, 'condicaoVendaMoedaNome'),
            valor_moeda_negociacao: this.parseNumber(this.getTextContent(adicaoNode, 'condicaoVendaValorMoeda'), 10000000),
            valor_reais: this.parseNumber(this.getTextContent(adicaoNode, 'condicaoVendaValorReais'), 10000000),
            
            // Método de valoração
            metodo_valoracao_codigo: this.getTextContent(adicaoNode, 'condicaoVendaMetodoValoracaoCodigo'),
            metodo_valoracao_nome: this.getTextContent(adicaoNode, 'condicaoVendaMetodoValoracaoNome'),
            
            // Dados do fornecedor
            fornecedor: this.extractFornecedor(adicaoNode),
            
            // Dados do fabricante  
            fabricante: this.extractFabricante(adicaoNode),
            
            // Tributos federais
            tributos: this.extractTributos(adicaoNode),
            
            // Frete e seguro (com análise baseada no incoterm)
            frete_valor_moeda_negociada: this.parseNumber(this.getTextContent(adicaoNode, 'freteValorMoedaNegociada'), 10000000),
            frete_valor_reais: this.parseNumber(this.getTextContent(adicaoNode, 'freteValorReais'), 10000000),
            frete_responsabilidade: this.isFreteIncluidoIncoterm(incoterm) ? 'Exportador' : 'Importador',
            seguro_valor_moeda_negociada: this.parseNumber(this.getTextContent(adicaoNode, 'seguroValorMoedaNegociada'), 10000000),
            seguro_valor_reais: this.parseNumber(this.getTextContent(adicaoNode, 'seguroValorReais'), 10000000),
            seguro_responsabilidade: this.isSeguroIncluidoIncoterm(incoterm) ? 'Exportador' : 'Importador',
            
            // Relacionamento comercial
            codigo_relacao_comprador_vendedor: this.getTextContent(adicaoNode, 'codigoRelacaoCompradorVendedor'),
            codigo_vinculo_comprador_vendedor: this.getTextContent(adicaoNode, 'codigoVinculoCompradorVendedor'),
            
            // DCR (Drawback)
            dcr_identificacao: this.getTextContent(adicaoNode, 'dcrIdentificacao'),
            dcr_valor_devido: this.parseNumber(this.getTextContent(adicaoNode, 'dcrValorDevido'), 10000000),
            dcr_valor_recolher: this.parseNumber(this.getTextContent(adicaoNode, 'dcrValorRecolher'), 10000000),
            
            // Produtos
            produtos: this.extractProdutos(adicaoNode, numeroAdicao)
        };

        return adicao;
    }

    /**
     * Extrai dados do fornecedor
     */
    extractFornecedor(adicaoNode) {
        return {
            nome: this.getTextContent(adicaoNode, 'fornecedorNome'),
            logradouro: this.getTextContent(adicaoNode, 'fornecedorLogradouro'),
            numero: this.getTextContent(adicaoNode, 'fornecedorNumero'),
            complemento: this.getTextContent(adicaoNode, 'fornecedorComplemento'),
            cidade: this.getTextContent(adicaoNode, 'fornecedorCidade'),
            estado: this.getTextContent(adicaoNode, 'fornecedorEstado'),
            endereco_completo: `${this.getTextContent(adicaoNode, 'fornecedorLogradouro')}, ${this.getTextContent(adicaoNode, 'fornecedorNumero')} - ${this.getTextContent(adicaoNode, 'fornecedorCidade')}, ${this.getTextContent(adicaoNode, 'fornecedorEstado')}`
        };
    }

    /**
     * Extrai dados do fabricante
     */
    extractFabricante(adicaoNode) {
        return {
            nome: this.getTextContent(adicaoNode, 'fabricanteNome'),
            logradouro: this.getTextContent(adicaoNode, 'fabricanteLogradouro'),
            numero: this.getTextContent(adicaoNode, 'fabricanteNumero'),
            cidade: this.getTextContent(adicaoNode, 'fabricanteCidade'),
            estado: this.getTextContent(adicaoNode, 'fabricanteEstado'),
            endereco_completo: `${this.getTextContent(adicaoNode, 'fabricanteLogradouro')} - ${this.getTextContent(adicaoNode, 'fabricanteCidade')}, ${this.getTextContent(adicaoNode, 'fabricanteEstado')}`
        };
    }

    /**
     * Extrai tributos da adição
     */
    extractTributos(adicaoNode) {
        return {
            // Imposto de Importação (II)
            ii_regime_codigo: this.getTextContent(adicaoNode, 'iiRegimeTributacaoCodigo'),
            ii_regime_nome: this.getTextContent(adicaoNode, 'iiRegimeTributacaoNome'),
            ii_aliquota_ad_valorem: this.parseNumber(this.getTextContent(adicaoNode, 'iiAliquotaAdValorem'), 10000),
            ii_base_calculo: this.parseNumber(this.getTextContent(adicaoNode, 'iiBaseCalculo'), 10000000),
            ii_valor_calculado: this.parseNumber(this.getTextContent(adicaoNode, 'iiAliquotaValorCalculado'), 10000000),
            ii_valor_devido: this.parseNumber(this.getTextContent(adicaoNode, 'iiAliquotaValorDevido'), 10000000),
            ii_valor_recolher: this.parseNumber(this.getTextContent(adicaoNode, 'iiAliquotaValorRecolher'), 10000000),
            
            // IPI
            ipi_regime_codigo: this.getTextContent(adicaoNode, 'ipiRegimeTributacaoCodigo'),
            ipi_regime_nome: this.getTextContent(adicaoNode, 'ipiRegimeTributacaoNome'),
            ipi_aliquota_ad_valorem: this.parseNumber(this.getTextContent(adicaoNode, 'ipiAliquotaAdValorem'), 10000),
            ipi_valor_devido: this.parseNumber(this.getTextContent(adicaoNode, 'ipiAliquotaValorDevido'), 10000000),
            ipi_valor_recolher: this.parseNumber(this.getTextContent(adicaoNode, 'ipiAliquotaValorRecolher'), 10000000),
            
            // PIS
            pis_aliquota_ad_valorem: this.parseNumber(this.getTextContent(adicaoNode, 'pisAliquotaAdValorem'), 10000),
            pis_valor_devido: this.parseNumber(this.getTextContent(adicaoNode, 'pisAliquotaValorDevido'), 10000000),
            pis_valor_recolher: this.parseNumber(this.getTextContent(adicaoNode, 'pisAliquotaValorRecolher'), 10000000),
            
            // COFINS
            cofins_aliquota_ad_valorem: this.parseNumber(this.getTextContent(adicaoNode, 'cofinsAliquotaAdValorem'), 10000),
            cofins_valor_devido: this.parseNumber(this.getTextContent(adicaoNode, 'cofinsAliquotaValorDevido'), 10000000),
            cofins_valor_recolher: this.parseNumber(this.getTextContent(adicaoNode, 'cofinsAliquotaValorRecolher'), 10000000)
        };
    }

    /**
     * Extrai produtos de uma adição
     */
    extractProdutos(adicaoNode, numeroAdicao) {
        const produtoNodes = adicaoNode.querySelectorAll('mercadoria');
        const produtos = [];

        produtoNodes.forEach(produtoNode => {
            const produto = {
                adicao_numero: numeroAdicao.toString().padStart(3, '0'),
                numero_sequencial_item: this.getTextContent(produtoNode, 'numeroSequencialItem'),
                descricao_mercadoria: this.getTextContent(produtoNode, 'descricaoMercadoria').trim(),
                quantidade: this.parseNumber(this.getTextContent(produtoNode, 'quantidade'), 100000),
                unidade_medida: this.getTextContent(produtoNode, 'unidadeMedida').trim(),
                valor_unitario: this.parseNumber(this.getTextContent(produtoNode, 'valorUnitario'), 10000000)
            };

            // Calcular valor total do item
            produto.valor_total_item = produto.quantidade * produto.valor_unitario;

            produtos.push(produto);
        });

        return produtos;
    }

    /**
     * Extrai informações complementares
     */
    extractInformacoesComplementares(xmlDoc) {
        const infoComplementar = this.getTextContent(xmlDoc, 'informacaoComplementar');
        
        this.diData.informacoes_complementares = {
            texto_completo: infoComplementar,
            dados_extraidos: this.parseInformacoesComplementares(infoComplementar)
        };
    }

    /**
     * Faz parsing das informações complementares para extrair dados estruturados
     */
    parseInformacoesComplementares(texto) {
        const dados = {};

        if (!texto) return dados;

        // Extrair taxa SISCOMEX
        const siscomexMatch = texto.match(/TAXA DE UTILIZACAO DO SISCOMEX.*?R\$\s*([\d.,]+)/i);
        if (siscomexMatch) {
            dados.siscomex_valor = this.parseValueFromString(siscomexMatch[1]);
        }

        // Extrair AFRMM
        const afrmmMatch = texto.match(/AFRMM.*?R\$\s*([\d.,]+)/i);
        if (afrmmMatch) {
            dados.afrmm_valor = this.parseValueFromString(afrmmMatch[1]);
        }

        // Extrair taxas de câmbio
        const cambioFobMatch = texto.match(/FOB.*?DOLAR.*?([\d,]+)/i);
        if (cambioFobMatch) {
            dados.taxa_cambio_fob = this.parseValueFromString(cambioFobMatch[1]);
        }

        const cambioFreteMatch = texto.match(/FRETE.*?DOLAR.*?([\d,]+)/i);
        if (cambioFreteMatch) {
            dados.taxa_cambio_frete = this.parseValueFromString(cambioFreteMatch[1]);
        }

        // Extrair responsáveis legais
        const responsaveisMatches = texto.matchAll(/(\w+\s+[\w\s]+)\s+CPF:\s*([\d.-]+)/g);
        dados.responsaveis_legais = [];
        for (const match of responsaveisMatches) {
            dados.responsaveis_legais.push({
                nome: match[1].trim(),
                cpf: match[2]
            });
        }

        // Extrair informações do container
        const containerMatch = texto.match(/CONTAINER[.\s]+(\w+).*?PESO BRUTO\s*([\d.,]+)/i);
        if (containerMatch) {
            dados.container_numero = containerMatch[1];
            dados.container_peso_bruto = this.parseValueFromString(containerMatch[2]);
        }

        return dados;
    }

    /**
     * Calcula totais da DI
     */
    calculateTotals() {
        let totals = {
            valor_total_fob_usd: 0,
            valor_total_fob_brl: 0,
            valor_total_frete_usd: 0,
            valor_total_frete_brl: 0,
            valor_total_seguro_usd: 0,
            valor_total_seguro_brl: 0,
            tributos_totais: {
                ii_total: 0,
                ipi_total: 0,
                pis_total: 0,
                cofins_total: 0
            }
        };

        this.diData.adicoes.forEach(adicao => {
            totals.valor_total_fob_usd += adicao.valor_moeda_negociacao || 0;
            totals.valor_total_fob_brl += adicao.valor_reais || 0;
            totals.valor_total_frete_usd += adicao.frete_valor_moeda_negociada || 0;
            totals.valor_total_frete_brl += adicao.frete_valor_reais || 0;
            totals.valor_total_seguro_usd += adicao.seguro_valor_moeda_negociada || 0;
            totals.valor_total_seguro_brl += adicao.seguro_valor_reais || 0;

            // Tributos
            totals.tributos_totais.ii_total += adicao.tributos.ii_valor_devido || 0;
            totals.tributos_totais.ipi_total += adicao.tributos.ipi_valor_devido || 0;
            totals.tributos_totais.pis_total += adicao.tributos.pis_valor_devido || 0;
            totals.tributos_totais.cofins_total += adicao.tributos.cofins_valor_devido || 0;
        });

        this.diData.totais = totals;
    }

    // ========== MÉTODOS AUXILIARES ==========

    /**
     * Obtém texto de um elemento XML
     */
    getTextContent(node, tagName) {
        const element = node.querySelector(tagName);
        return element ? element.textContent.trim() : '';
    }

    /**
     * Converte string numérica do XML para número decimal
     */
    parseNumber(value, divisor = 1) {
        if (!value || value === '0'.repeat(value.length)) return 0;
        return parseInt(value) / divisor;
    }

    /**
     * Parse de valor monetário de string
     */
    parseValueFromString(valueString) {
        const cleanValue = valueString.replace(/\./g, '').replace(',', '.');
        return parseFloat(cleanValue);
    }

    /**
     * Formata data de AAAAMMDD para DD/MM/AAAA
     */
    formatDate(dateString) {
        if (!dateString || dateString.length !== 8) return dateString;
        return `${dateString.substring(6,8)}/${dateString.substring(4,6)}/${dateString.substring(0,4)}`;
    }

    /**
     * Formata CNPJ
     */
    formatCNPJ(cnpj) {
        if (!cnpj) return '';
        const clean = cnpj.replace(/\D/g, '');
        return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }

    /**
     * Formata CPF
     */
    formatCPF(cpf) {
        if (!cpf) return '';
        const clean = cpf.replace(/\D/g, '');
        return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }

    /**
     * Formata CEP
     */
    formatCEP(cep) {
        if (!cep) return '';
        const clean = cep.replace(/\D/g, '');
        return clean.replace(/^(\d{5})(\d{3})$/, '$1-$2');
    }

    /**
     * Monta endereço completo
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
     * Retorna dados processados
     */
    getData() {
        return this.diData;
    }

    /**
     * Retorna XML original
     */
    getOriginalXML() {
        return this.originalXmlContent;
    }

    /**
     * Retorna incoterm identificado
     */
    getIncotermIdentificado() {
        return this.incotermIdentificado;
    }
}