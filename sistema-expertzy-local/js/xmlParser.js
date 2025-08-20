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
     * Converte valores do XML respeitando formato específico de cada tipo
     * @param {string} rawValue - Valor bruto do XML
     * @param {string} type - Tipo de conversão (monetary, weight, percentage, integer)
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
                // Pesos com 5 decimais: 20000 → 0.20000 kg
                return value / 100000;
                
            case 'percentage':
                // Alíquotas em centésimos: 650 → 6.50%
                return value / 100;
                
            case 'integer':
            default:
                return value;
        }
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
            
            // Processar múltiplas moedas e taxas de câmbio
            this.processarMultiplasMoedas(xmlDoc);
            
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
            peso_liquido: this.convertValue(this.getTextContent(diNode, 'cargaPesoLiquido'), 'weight'),
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
            peso_liquido: this.convertValue(this.getTextContent(adicaoNode, 'dadosMercadoriaPesoLiquido'), 'weight'),
            quantidade_estatistica: this.convertValue(this.getTextContent(adicaoNode, 'dadosMercadoriaMedidaEstatisticaQuantidade'), 'weight'),
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
            valor_moeda_negociacao: this.convertValue(this.getTextContent(adicaoNode, 'condicaoVendaValorMoeda'), 'monetary'),
            valor_reais: this.convertValue(this.getTextContent(adicaoNode, 'condicaoVendaValorReais'), 'monetary'),
            
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
            frete_valor_moeda_negociada: this.convertValue(this.getTextContent(adicaoNode, 'freteValorMoedaNegociada'), 'monetary'),
            frete_valor_reais: this.convertValue(this.getTextContent(adicaoNode, 'freteValorReais'), 'monetary'),
            frete_responsabilidade: this.isFreteIncluidoIncoterm(incoterm) ? 'Exportador' : 'Importador',
            seguro_valor_moeda_negociada: this.convertValue(this.getTextContent(adicaoNode, 'seguroValorMoedaNegociada'), 'monetary'),
            seguro_valor_reais: this.convertValue(this.getTextContent(adicaoNode, 'seguroValorReais'), 'monetary'),
            seguro_responsabilidade: this.isSeguroIncluidoIncoterm(incoterm) ? 'Exportador' : 'Importador',
            
            // Relacionamento comercial
            codigo_relacao_comprador_vendedor: this.getTextContent(adicaoNode, 'codigoRelacaoCompradorVendedor'),
            codigo_vinculo_comprador_vendedor: this.getTextContent(adicaoNode, 'codigoVinculoCompradorVendedor'),
            
            // DCR (Drawback)
            dcr_identificacao: this.getTextContent(adicaoNode, 'dcrIdentificacao'),
            dcr_valor_devido: this.parseNumber(this.getTextContent(adicaoNode, 'dcrValorDevido'), 100),
            dcr_valor_recolher: this.parseNumber(this.getTextContent(adicaoNode, 'dcrValorRecolher'), 100),
            
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
            ii_aliquota_ad_valorem: this.convertValue(this.getTextContent(adicaoNode, 'iiAliquotaAdValorem'), 'percentage'),
            ii_base_calculo: this.convertValue(this.getTextContent(adicaoNode, 'iiBaseCalculo'), 'monetary'),
            ii_valor_calculado: this.convertValue(this.getTextContent(adicaoNode, 'iiAliquotaValorCalculado'), 'monetary'),
            ii_valor_devido: this.convertValue(this.getTextContent(adicaoNode, 'iiAliquotaValorDevido'), 'monetary'),
            ii_valor_recolher: this.convertValue(this.getTextContent(adicaoNode, 'iiAliquotaValorRecolher'), 'monetary'),
            
            // IPI
            ipi_regime_codigo: this.getTextContent(adicaoNode, 'ipiRegimeTributacaoCodigo'),
            ipi_regime_nome: this.getTextContent(adicaoNode, 'ipiRegimeTributacaoNome'),
            ipi_aliquota_ad_valorem: this.convertValue(this.getTextContent(adicaoNode, 'ipiAliquotaAdValorem'), 'percentage'),
            ipi_valor_devido: this.convertValue(this.getTextContent(adicaoNode, 'ipiAliquotaValorDevido'), 'monetary'),
            ipi_valor_recolher: this.convertValue(this.getTextContent(adicaoNode, 'ipiAliquotaValorRecolher'), 'monetary'),
            
            // PIS
            pis_aliquota_ad_valorem: this.convertValue(this.getTextContent(adicaoNode, 'pisPasepAliquotaAdValorem'), 'percentage'),
            pis_valor_devido: this.convertValue(this.getTextContent(adicaoNode, 'pisPasepAliquotaValorDevido'), 'monetary'),
            pis_valor_recolher: this.convertValue(this.getTextContent(adicaoNode, 'pisPasepAliquotaValorRecolher'), 'monetary'),
            
            // COFINS
            cofins_aliquota_ad_valorem: this.convertValue(this.getTextContent(adicaoNode, 'cofinsAliquotaAdValorem'), 'percentage'),
            cofins_valor_devido: this.convertValue(this.getTextContent(adicaoNode, 'cofinsAliquotaValorDevido'), 'monetary'),
            cofins_valor_recolher: this.convertValue(this.getTextContent(adicaoNode, 'cofinsAliquotaValorRecolher'), 'monetary')
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
                quantidade: this.convertValue(this.getTextContent(produtoNode, 'quantidade'), 'weight'),
                unidade_medida: this.getTextContent(produtoNode, 'unidadeMedida').trim(),
                valor_unitario: this.convertValue(this.getTextContent(produtoNode, 'valorUnitario'), 'monetary')
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
     * Extrai taxas de câmbio do campo informação complementar
     * Procura padrão "TAXA CAMBIAL.....: valor1 valor2 ..." 
     */
    extrairTaxasCambio(infoComplementar) {
        const taxas = [];
        
        if (!infoComplementar) return taxas;
        
        // Procurar padrão "TAXA CAMBIAL.....: valor1 valor2 ..."
        const padraoTaxa = /TAXA\s+CAMBIAL[^:]*:\s*([\d,.\s]+)/i;
        const match = infoComplementar.match(padraoTaxa);
        
        if (match) {
            const valoresStr = match[1].trim();
            // Extrair números decimais válidos
            const valores = valoresStr.match(/\d+[,.]?\d*/g) || [];
            
            valores.forEach(valor => {
                const valorLimpo = valor.replace(',', '.');
                const taxa = parseFloat(valorLimpo);
                if (taxa > 0) {
                    taxas.push(taxa);
                }
            });
        }
        
        return taxas;
    }

    /**
     * Identifica moedas usadas na DI e associa com taxas de câmbio
     */
    identificarMoedasETaxas(xmlDoc, taxas) {
        const moedas = new Map();
        const diNode = xmlDoc.querySelector('declaracaoImportacao');
        
        // Coletar moedas em ordem de aparição
        const moedasEncontradas = [];
        
        // 1. Moeda da condição de venda (VCMV)
        const primeiraAdicao = diNode.querySelector('adicao');
        if (primeiraAdicao) {
            const codVcmv = this.getTextContent(primeiraAdicao, 'condicaoVendaMoedaCodigo');
            if (codVcmv && codVcmv !== '000') {
                moedasEncontradas.push(codVcmv);
            }
        }
        
        // 2. Moeda do frete
        const codFrete = this.getTextContent(diNode, 'freteMoedaNegociadaCodigo');
        if (codFrete && codFrete !== '000' && !moedasEncontradas.includes(codFrete)) {
            moedasEncontradas.push(codFrete);
        }
        
        // 3. Moeda do seguro
        const codSeguro = this.getTextContent(diNode, 'seguroMoedaNegociadaCodigo');
        if (codSeguro && codSeguro !== '000' && !moedasEncontradas.includes(codSeguro)) {
            moedasEncontradas.push(codSeguro);
        }
        
        // 4. Se não encontrou moedas explícitas mas tem taxas, assumir USD como primeira
        if (moedasEncontradas.length === 0 && taxas.length > 0) {
            moedasEncontradas.push('220'); // USD
        }
        
        // Associar taxas às moedas
        moedasEncontradas.forEach((codigo, index) => {
            const info = window.CODIGOS_MOEDA_RFB?.[codigo] || {
                sigla: `MOEDA_${codigo}`,
                nome: `Moeda código ${codigo}`
            };
            
            moedas.set(codigo, {
                codigo,
                nome: info.nome,
                sigla: info.sigla,
                taxa: taxas[index] || 0,
                ordem: index
            });
        });
        
        return moedas;
    }

    /**
     * Detecta qual moeda foi usada para VMLE/VMLD comparando taxas
     */
    detectarMoedaVmleVmld(vmleDolares, vmleReais, moedas) {
        if (!vmleDolares || !vmleReais || vmleDolares === 0) {
            // Se há moedas identificadas, usar a primeira; senão USD
            return moedas.size > 0 ? moedas.values().next().value.codigo : '220';
        }
        
        const taxaCalculada = vmleReais / vmleDolares;
        const tolerancia = 0.02; // 2% de tolerância
        
        let melhorMoeda = '220';
        let menorDiferenca = Infinity;
        
        // Procurar moeda com taxa mais próxima
        for (const moeda of moedas.values()) {
            if (moeda.taxa > 0) {
                const diferenca = Math.abs(moeda.taxa - taxaCalculada) / moeda.taxa;
                if (diferenca < menorDiferenca && diferenca < tolerancia) {
                    menorDiferenca = diferenca;
                    melhorMoeda = moeda.codigo;
                }
            }
        }
        
        return melhorMoeda;
    }

    /**
     * Converte valor de uma moeda específica para reais
     */
    converterParaReais(valor, codigoMoeda, moedas) {
        if (!valor || valor === 0 || codigoMoeda === '000') {
            return 0;
        }
        
        const moeda = moedas.get(codigoMoeda);
        if (!moeda || !moeda.taxa) {
            console.warn(`Taxa de câmbio não encontrada para moeda ${codigoMoeda}`);
            return 0;
        }
        
        return valor * moeda.taxa;
    }

    /**
     * Processa múltiplas moedas e taxas de câmbio da DI
     */
    processarMultiplasMoedas(xmlDoc) {
        const infoComplementar = this.diData.informacoes_complementares?.texto_completo || '';
        
        // 1. Extrair taxas de câmbio
        const taxas = this.extrairTaxasCambio(infoComplementar);
        
        // 2. Identificar moedas e associar com taxas
        const moedas = this.identificarMoedasETaxas(xmlDoc, taxas);
        
        // 3. Detectar moeda do VMLE/VMLD
        const diNode = xmlDoc.querySelector('declaracaoImportacao');
        const vmleDolares = this.parseNumber(this.getTextContent(diNode, 'localEmbarqueTotalDolares'), 100);
        const vmleReais = this.parseNumber(this.getTextContent(diNode, 'localEmbarqueTotalReais'), 100);
        
        const codigoMoedaVmle = this.detectarMoedaVmleVmld(vmleDolares, vmleReais, moedas);
        const moedaVmle = moedas.get(codigoMoedaVmle);
        
        // 4. Estruturar dados
        this.diData.moedas = {
            lista: Array.from(moedas.values()),
            total: moedas.size,
            vmle_vmld: {
                codigo: codigoMoedaVmle,
                nome: moedaVmle?.nome || 'Moeda não identificada',
                sigla: moedaVmle?.sigla || 'N/A',
                taxa: moedaVmle?.taxa || 0
            },
            validacao: this.validarConversoes(xmlDoc, moedas)
        };
        
        // Log se múltiplas moedas
        if (moedas.size > 1) {
            console.log('Múltiplas moedas detectadas:', this.diData.moedas);
        }
    }

    /**
     * Valida conversões de moeda comparando com valores do XML
     */
    validarConversoes(xmlDoc, moedas) {
        const validacao = {
            testes: [],
            aprovado: true
        };
        
        const diNode = xmlDoc.querySelector('declaracaoImportacao');
        
        // Validar VMLE
        const vmleDolares = this.parseNumber(this.getTextContent(diNode, 'localEmbarqueTotalDolares'), 100);
        const vmleReais = this.parseNumber(this.getTextContent(diNode, 'localEmbarqueTotalReais'), 100);
        
        if (vmleDolares > 0 && vmleReais > 0) {
            const codigoMoedaVmle = this.diData.moedas?.vmle_vmld?.codigo || '220';
            const valorCalculado = this.converterParaReais(vmleDolares, codigoMoedaVmle, moedas);
            const diferenca = Math.abs(valorCalculado - vmleReais);
            const tolerancia = vmleReais * 0.01; // 1%
            
            const testeVmle = {
                campo: 'VMLE',
                valor_moeda_original: vmleDolares,
                moeda: codigoMoedaVmle,
                valor_xml_reais: vmleReais,
                valor_calculado: valorCalculado,
                diferenca: diferenca,
                aprovado: diferenca <= tolerancia
            };
            
            validacao.testes.push(testeVmle);
            if (!testeVmle.aprovado) {
                validacao.aprovado = false;
            }
        }
        
        // Validar frete se em moeda diferente
        const codFrete = this.getTextContent(diNode, 'freteMoedaNegociadaCodigo');
        const freteValorMoeda = this.convertValue(this.getTextContent(diNode, 'freteTotalMoeda'), 'monetary');
        const freteReais = this.convertValue(this.getTextContent(diNode, 'freteTotalReais'), 'monetary');
        
        if (codFrete && codFrete !== '000' && freteValorMoeda > 0 && freteReais > 0) {
            const valorCalculadoFrete = this.converterParaReais(freteValorMoeda, codFrete, moedas);
            const diferencaFrete = Math.abs(valorCalculadoFrete - freteReais);
            const toleranciaFrete = freteReais * 0.01;
            
            const testeFrete = {
                campo: 'Frete',
                valor_moeda_original: freteValorMoeda,
                moeda: codFrete,
                valor_xml_reais: freteReais,
                valor_calculado: valorCalculadoFrete,
                diferenca: diferencaFrete,
                aprovado: diferencaFrete <= toleranciaFrete
            };
            
            validacao.testes.push(testeFrete);
            if (!testeFrete.aprovado) {
                validacao.aprovado = false;
            }
        }
        
        return validacao;
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

        // As taxas de câmbio são processadas em processarMultiplasMoedas()
        // e ficam disponíveis em this.diData.moedas_multiplas

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