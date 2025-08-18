/**
 * Aplicação Principal do Sistema Expertzy
 * Gerencia upload, processamento e interface do usuário
 */
class ExpertzyApp {
    constructor() {
        this.storage = new StorageManager();
        this.xmlParser = new DiParser();
        this.calculator = new TributaryCalculator();
        this.calculationMemory = new CalculationMemory();
        this.currentDI = null;
        this.currentResults = null;
        
        this.init();
    }

    /**
     * Inicializa a aplicação
     */
    async init() {
        try {
            // Aguardar carregamento das configurações da calculadora
            await this.calculator.loadConfigurations();
            
            // Popular selects da interface
            // Estados não mais necessários - foco em importação
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Carregar configurações salvas
            this.loadUserConfig();
            
            // Verificar se há DI salva
            this.checkSavedDI();
            
            console.log('Sistema Expertzy inicializado com sucesso');
            
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showError('Erro ao inicializar sistema. Verifique sua conexão e recarregue a página.');
        }
    }

    /**
     * Configura todos os event listeners
     */
    setupEventListeners() {
        // Upload de arquivo
        const fileInput = document.getElementById('xmlFile');
        const dropZone = document.getElementById('dropZone');
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            dropZone.addEventListener('drop', (e) => this.handleFileDrop(e));
            dropZone.addEventListener('click', () => fileInput?.click());
        }

        // Navegação das abas
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Botões de ação
        const processBtn = document.getElementById('processXML');
        if (processBtn) {
            processBtn.addEventListener('click', () => this.processXML());
        }

        const calculateBtn = document.getElementById('calculateAll');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculateAll());
        }

        // Botões de exportação
        const exportCustosBtn = document.getElementById('exportarCustos');
        if (exportCustosBtn) {
            exportCustosBtn.addEventListener('click', () => this.exportarCustos());
        }

        // Botão Croqui NF removido da seção de ações - agora apenas no navbar

        // Configurações
        this.setupConfigEventListeners();
        
        // Inicializar estado do botão Croqui NF (desabilitado até carregar DI)
        this.disableCroquisButton();
    }

    /**
     * Configura listeners para as configurações
     */
    setupConfigEventListeners() {
        // Configurações de importação removidas - foco apenas no processamento da DI

        // Custos extras
        document.querySelectorAll('[data-custo-tipo]').forEach(input => {
            input.addEventListener('input', () => this.saveCustosExtras());
        });
    }

    /**
     * Manipula seleção de arquivo
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    /**
     * Manipula drag over
     */
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add('dragover');
    }

    /**
     * Manipula drag leave
     */
    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('dragover');
    }

    /**
     * Manipula drop de arquivo
     */
    handleFileDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    /**
     * Processa arquivo XML
     */
    async processFile(file) {
        try {
            // Validar arquivo
            if (!this.validateFile(file)) {
                return;
            }

            this.showLoading('Processando arquivo XML...');

            // Ler conteúdo do arquivo
            const xmlContent = await this.readFileContent(file);
            
            // Salvar XML original
            this.storage.saveOriginalXML(xmlContent, file.name);

            // Fazer parse do XML
            this.currentDI = this.xmlParser.parseXML(xmlContent);
            
            // Registrar operação de processamento na memória
            this.calculationMemory.log(
                'PROCESSAMENTO_XML',
                `Processamento do arquivo ${file.name}`,
                {
                    arquivo_nome: file.name,
                    arquivo_tamanho: file.size,
                    numero_di: this.currentDI.numero_di,
                    total_adicoes: this.currentDI.total_adicoes
                },
                'Parser XML -> Estrutura de dados da DI',
                {
                    di_processada: this.currentDI.numero_di,
                    adicoes_extraidas: this.currentDI.total_adicoes,
                    incoterm_identificado: this.currentDI.incoterm_identificado?.codigo
                },
                {
                    parser_versao: '1.0',
                    encoding: 'UTF-8'
                }
            );

            // Registrar conversões de moeda se houver
            if (this.currentDI.adicoes) {
                this.currentDI.adicoes.forEach(adicao => {
                    if (adicao.valor_moeda_negociacao && adicao.valor_reais) {
                        const taxa = adicao.valor_reais / adicao.valor_moeda_negociacao;
                        this.calculationMemory.logCurrencyConversion(
                            adicao.valor_moeda_negociacao,
                            adicao.moeda_negociacao_codigo,
                            adicao.valor_reais,
                            'BRL',
                            taxa,
                            {
                                adicao: adicao.numero_adicao,
                                data_di: this.currentDI.data_registro
                            }
                        );
                    }
                });
            }
            
            // Salvar DI processada
            this.storage.saveDI(this.currentDI);

            // Atualizar interface
            this.updateFileInfo(file);
            this.updateDIInfo(this.currentDI);
            this.populateDataTab(this.currentDI);

            // Habilitar próximos passos
            this.enableTab('dados');
            this.enableTab('custos');
            this.showCustosInterface();

            this.hideLoading();
            this.showSuccess(`Arquivo ${file.name} processado com sucesso!`);
            
            // Automaticamente ir para aba de dados
            this.switchTab('dados');

        } catch (error) {
            this.hideLoading();
            console.error('Erro ao processar arquivo:', error);
            this.showError('Erro ao processar arquivo XML: ' + error.message);
        }
    }

    /**
     * Valida arquivo antes do processamento
     */
    validateFile(file) {
        // Verificar extensão
        if (!file.name.toLowerCase().endsWith('.xml')) {
            this.showError('Arquivo deve ter extensão .xml');
            return false;
        }

        // Verificar tamanho (50MB máximo)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showError('Arquivo muito grande. Máximo permitido: 50MB');
            return false;
        }

        return true;
    }

    /**
     * Lê conteúdo do arquivo
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * Atualiza informações do arquivo na interface
     */
    updateFileInfo(file) {
        const fileInfoDiv = document.getElementById('fileInfo');
        if (fileInfoDiv) {
            fileInfoDiv.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-file-code"></i>
                    <strong>Arquivo:</strong> ${file.name} 
                    <span class="badge badge-secondary">${this.formatFileSize(file.size)}</span>
                </div>
            `;
        }
    }

    /**
     * Atualiza informações da DI na interface
     */
    updateDIInfo(diData) {
        // Habilitar botão Croqui NF no navbar quando DI for carregada
        this.enableCroquisButton();
        
        const diInfoDiv = document.getElementById('diInfo');
        if (diInfoDiv) {
            diInfoDiv.innerHTML = `
                <div class="alert alert-success">
                    <h6><i class="fas fa-file-invoice"></i> DI ${diData.numero_di}</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <small><strong>Data:</strong> ${diData.data_registro}</small><br>
                            <small><strong>Importador:</strong> ${diData.importador.nome}</small><br>
                            <small><strong>URF:</strong> ${diData.urf_despacho_nome}</small>
                        </div>
                        <div class="col-md-6">
                            <small><strong>Adições:</strong> ${diData.total_adicoes}</small><br>
                            <small><strong>Incoterm:</strong> ${diData.incoterm_identificado?.codigo || 'N/I'}</small><br>
                            <small><strong>Valor Total:</strong> ${this.formatCurrency(diData.totais.valor_total_fob_brl)}</small>
                        </div>
                    </div>
                </div>
            `;
            // Mostrar o elemento quando houver dados
            diInfoDiv.style.display = 'block';
        }
    }

    /**
     * Popula aba de dados com informações da DI
     */
    populateDataTab(diData) {
        // Mostrar interface de dados
        const dadosContent = document.getElementById('dadosContent');
        const dadosInterface = document.getElementById('dadosInterface');
        
        if (dadosContent && dadosInterface) {
            dadosContent.style.display = 'none';
            dadosInterface.style.display = 'block';
        }
        
        // Tabela de adições
        this.populateAdicoesTable(diData.adicoes);
        
        // Informações do importador
        this.populateImportadorInfo(diData.importador);
        
        // Resumo dos totais
        this.populateTotalsInfo(diData.totais);
    }

    /**
     * Popula tabela de adições
     */
    populateAdicoesTable(adicoes) {
        const tableBody = document.querySelector('#adicoesTable tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        adicoes.forEach(adicao => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${adicao.numero_adicao}</td>
                <td>${adicao.ncm}</td>
                <td>${adicao.descricao_ncm}</td>
                <td>${this.formatNumber(adicao.quantidade_estatistica)} ${adicao.unidade_estatistica}</td>
                <td>${this.formatCurrency(adicao.valor_moeda_negociacao)} ${adicao.moeda_negociacao_codigo}</td>
                <td>${this.formatCurrency(adicao.valor_reais)}</td>
                <td>${adicao.condicao_venda_incoterm}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="app.viewAdicaoDetails('${adicao.numero_adicao}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    /**
     * Popula informações do importador
     */
    populateImportadorInfo(importador) {
        const importadorDiv = document.getElementById('importadorInfo');
        if (importadorDiv) {
            importadorDiv.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h6><i class="fas fa-building"></i> Dados do Importador</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <strong>${importador.nome}</strong><br>
                                <small>CNPJ: ${importador.cnpj}</small><br>
                                <small>${importador.endereco_completo}</small>
                            </div>
                            <div class="col-md-4">
                                <small><strong>Representante:</strong><br>
                                ${importador.representante_nome}<br>
                                CPF: ${importador.representante_cpf}</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Popula informações de totais
     */
    populateTotalsInfo(totais) {
        const totalsDiv = document.getElementById('totalsInfo');
        if (totalsDiv) {
            totalsDiv.innerHTML = `
                <div class="row">
                    <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h5 class="card-title">${this.formatCurrency(totais.valor_total_fob_brl)}</h5>
                                <p class="card-text">Valor FOB (R$)</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h5 class="card-title">${this.formatCurrency(totais.tributos_totais.ii_total)}</h5>
                                <p class="card-text">II Total</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h5 class="card-title">${this.formatCurrency(totais.tributos_totais.ipi_total)}</h5>
                                <p class="card-text">IPI Total</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h5 class="card-title">${this.formatCurrency(totais.tributos_totais.pis_total)}</h5>
                                <p class="card-text">PIS Total</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h5 class="card-title">${this.formatCurrency(totais.tributos_totais.cofins_total)}</h5>
                                <p class="card-text">COFINS Total</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h5 class="card-title">${this.formatCurrency(totais.tributos_totais.ii_total + totais.tributos_totais.ipi_total + totais.tributos_totais.pis_total + totais.tributos_totais.cofins_total)}</h5>
                                <p class="card-text">Tributos Total</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Calcula todos os cenários fiscais
     */
    async calculateAll() {
        if (!this.currentDI) {
            this.showError('Nenhuma DI carregada. Faça o upload do arquivo XML primeiro.');
            return;
        }

        try {
            this.showLoading('Calculando cenários fiscais...');

            const config = this.getCurrentConfig();
            const custosExtras = this.getCustosExtrasFromForm();
            
            // Salvar configurações
            this.storage.saveOperationConfig(config.estado, config.regime, config.operacao);
            this.storage.saveCustosExtras(custosExtras);

            const results = {
                config: config,
                custos_extras: custosExtras,
                cenarios: {},
                resumo_comparativo: null,
                data_calculo: new Date().toISOString()
            };

            // Calcular para cada adição
            this.currentDI.adicoes.forEach(adicao => {
                const cenarios = this.calculator.calculateStateScenarios(adicao, config.estado, custosExtras);
                results.cenarios[adicao.numero_adicao] = cenarios;
            });

            // Calcular resumo comparativo
            results.resumo_comparativo = this.generateComparativeReport(results.cenarios);

            this.currentResults = results;
            this.storage.saveCalculationResults(results);

            // Atualizar interface
            this.populateResultsTab(results);
            this.enableTab('resultados');
            this.enableTab('precificacao');

            this.hideLoading();
            this.showSuccess('Cálculos realizados com sucesso!');
            
            // Ir para aba de resultados
            this.switchTab('resultados');

        } catch (error) {
            this.hideLoading();
            console.error('Erro nos cálculos:', error);
            this.showError('Erro ao realizar cálculos: ' + error.message);
        }
    }

    /**
     * Obtém configuração atual para importação
     */
    getCurrentConfig() {
        // Para importação, usar estado da URF de despacho, não destino de venda
        const estadoURF = this.getEstadoFromURF();
        return {
            estado: estadoURF,
            regime: 'importacao', // Processo de importação sempre usa regime de importação
            operacao: 'importacao' // Operação de importação, não venda
        };
    }

    /**
     * Extrai estado da URF de despacho
     */
    getEstadoFromURF() {
        if (!this.currentDI || !this.currentDI.urf_despacho_codigo) {
            return 'GO'; // Default Goiânia
        }
        
        // Mapear códigos de URF para estados
        const urfParaEstado = {
            '0120100': 'GO', // Goiânia
            '0717500': 'RS', // Porto Alegre
            '0321400': 'SP', // Santos
            // Adicionar mais URFs conforme necessário
        };
        
        return urfParaEstado[this.currentDI.urf_despacho_codigo] || 'GO';
    }

    /**
     * Obtém custos extras do formulário
     */
    getCustosExtrasFromForm() {
        return {
            portuarios: parseFloat(document.getElementById('custosPortuarios')?.value || 0),
            bancarios: parseFloat(document.getElementById('custosBancarios')?.value || 0),
            logisticos: parseFloat(document.getElementById('custosLogisticos')?.value || 0),
            administrativos: parseFloat(document.getElementById('custosAdministrativos')?.value || 0)
        };
    }

    /**
     * Gera relatório comparativo
     */
    generateComparativeReport(cenarios) {
        // Implementar lógica de comparação entre cenários
        // Retornar resumo com melhor opção fiscal
        return {
            melhor_cenario: 'interestadual',
            economia_total: 0,
            carga_tributaria_efetiva: 0
        };
    }

    /**
     * Popula aba de resultados
     */
    populateResultsTab(results) {
        const resultadosContent = document.getElementById('resultadosContent');
        const resultadosInterface = document.getElementById('resultadosInterface');
        
        if (resultadosContent && resultadosInterface) {
            resultadosContent.style.display = 'none';
            resultadosInterface.style.display = 'block';
            
            // Popular resumo geral
            this.populateResumoGeral(results);
            
            // Popular filtros
            this.populateFiltros(results);
            
            // Popular tabela de resultados
            this.populateTabelaResultados(results);
            
            // Popular totais gerais
            this.populateTotaisGerais(results);
            
            // Configurar event listeners da tabela
            this.setupTabelaEventListeners();
        }
    }

    /**
     * Popula resumo geral da importação
     */
    populateResumoGeral(results) {
        const resumoDiv = document.getElementById('resumoGeral');
        if (!resumoDiv) return;

        // Calcular totais consolidados
        let totalFOB = 0, totalTributos = 0, totalCustoExtra = 0, totalGeral = 0;
        let totalItens = 0;

        Object.values(results.cenarios).forEach(cenarios => {
            Object.values(cenarios).forEach(cenario => {
                totalFOB += cenario.valor_mercadoria || 0;
                totalTributos += Object.values(cenario.tributos_federais).reduce((sum, val) => sum + (val || 0), 0);
                totalCustoExtra += cenario.total_custos_extras || 0;
                totalGeral += cenario.custo_total || 0;
                totalItens++;
            });
        });

        resumoDiv.innerHTML = `
            <div class="col-md-3 text-center">
                <h4 class="text-primary">${this.formatCurrency(totalFOB)}</h4>
                <small>Valor FOB Total</small>
            </div>
            <div class="col-md-3 text-center">
                <h4 class="text-warning">${this.formatCurrency(totalTributos)}</h4>
                <small>Tributos Federais</small>
            </div>
            <div class="col-md-3 text-center">
                <h4 class="text-info">${this.formatCurrency(totalCustoExtra)}</h4>
                <small>Custos Extras</small>
            </div>
            <div class="col-md-3 text-center">
                <h4 class="text-success">${this.formatCurrency(totalGeral)}</h4>
                <small>Custo Total</small>
            </div>
        `;
    }

    /**
     * Popula filtros da tabela
     */
    populateFiltros(results) {
        const filtroAdicao = document.getElementById('filtroAdicao');
        if (!filtroAdicao || !this.currentDI) return;

        // Limpar e popular filtro de adições
        filtroAdicao.innerHTML = '<option value="">Todas as adições</option>';
        
        this.currentDI.adicoes.forEach(adicao => {
            const option = document.createElement('option');
            option.value = adicao.numero_adicao;
            option.textContent = `Adição ${adicao.numero_adicao} - NCM ${adicao.ncm}`;
            filtroAdicao.appendChild(option);
        });
    }

    /**
     * Popula tabela de resultados de forma hierárquica
     */
    populateTabelaResultados(results) {
        const tbody = document.getElementById('tabelaResultadosBody');
        if (!tbody || !this.currentDI) return;

        tbody.innerHTML = '';

        this.currentDI.adicoes.forEach(adicao => {
            // Buscar cenário calculado para esta adição
            const cenarios = results.cenarios[adicao.numero_adicao];
            const cenario = cenarios ? cenarios[results.config.operacao] : null;

            // Linha da adição (cabeçalho expansível)
            const rowAdicao = this.createAdicaoRow(adicao, cenario);
            tbody.appendChild(rowAdicao);

            // Linhas dos itens (filhos da adição)
            adicao.produtos.forEach((produto, index) => {
                const rowItem = this.createItemRow(adicao, produto, cenario, index);
                tbody.appendChild(rowItem);
            });
        });
    }

    /**
     * Cria linha de adição (cabeçalho expansível)
     */
    createAdicaoRow(adicao, cenario) {
        const row = document.createElement('tr');
        row.className = 'table-primary adicao-row';
        row.dataset.adicao = adicao.numero_adicao;
        row.style.cursor = 'pointer';

        const custoTotal = cenario ? cenario.custo_total : adicao.valor_reais || 0;
        const quantidadeTotal = adicao.produtos.reduce((sum, p) => sum + (p.quantidade || 0), 0);

        row.innerHTML = `
            <td><i class="fas fa-minus-circle text-primary" id="toggle-${adicao.numero_adicao}"></i></td>
            <td><strong>Adição ${adicao.numero_adicao}</strong></td>
            <td><strong>${adicao.ncm}</strong></td>
            <td><strong>${adicao.descricao_ncm}</strong></td>
            <td><strong>${this.formatNumber(quantidadeTotal)}</strong></td>
            <td><strong>${adicao.unidade_estatistica}</strong></td>
            <td><strong>${this.formatNumber(adicao.peso_liquido)}</strong></td>
            <td><strong>${this.formatCurrency(adicao.valor_reais)}</strong></td>
            <td><strong>${this.formatCurrency(adicao.frete_valor_reais)}</strong></td>
            <td><strong>${this.formatCurrency(adicao.seguro_valor_reais)}</strong></td>
            <td><strong>${this.formatCurrency(cenario ? cenario.total_custos_extras : 0)}</strong></td>
            <td><strong>${this.formatCurrency(adicao.tributos.ii_valor_devido)}</strong></td>
            <td><strong>${this.formatCurrency(adicao.tributos.ipi_valor_devido)}</strong></td>
            <td><strong>${this.formatCurrency(adicao.tributos.pis_valor_devido)}</strong></td>
            <td><strong>${this.formatCurrency(adicao.tributos.cofins_valor_devido)}</strong></td>
            <td><strong>${this.formatCurrency(custoTotal)}</strong></td>
            <td><strong>${this.formatCurrency(custoTotal / quantidadeTotal)}</strong></td>
        `;

        return row;
    }

    /**
     * Cria linha de item individual
     */
    createItemRow(adicao, produto, cenario, index) {
        const row = document.createElement('tr');
        row.className = 'item-row';
        row.dataset.adicao = adicao.numero_adicao;
        row.dataset.item = index;

        // Calcular valores rateados para o item
        const ratios = this.calculateItemRatios(adicao, produto);
        const custoTotalItem = this.calculateItemTotalCost(adicao, produto, cenario, ratios);

        row.innerHTML = `
            <td></td>
            <td>&nbsp;&nbsp;&nbsp;${produto.numero_sequencial_item}</td>
            <td>${adicao.ncm}</td>
            <td>${produto.descricao_mercadoria}</td>
            <td>${this.formatNumber(produto.quantidade)}</td>
            <td>${produto.unidade_medida}</td>
            <td>${this.formatNumber(ratios.peso_rateado)}</td>
            <td>${this.formatCurrency(produto.valor_total_item)}</td>
            <td>${this.formatCurrency(ratios.frete_rateado)}</td>
            <td>${this.formatCurrency(ratios.seguro_rateado)}</td>
            <td>${this.formatCurrency(ratios.custos_extra_rateados)}</td>
            <td>${this.formatCurrency(ratios.ii_rateado)}</td>
            <td>${this.formatCurrency(ratios.ipi_rateado)}</td>
            <td>${this.formatCurrency(ratios.pis_rateado)}</td>
            <td>${this.formatCurrency(ratios.cofins_rateado)}</td>
            <td>${this.formatCurrency(custoTotalItem)}</td>
            <td>${this.formatCurrency(custoTotalItem / produto.quantidade)}</td>
        `;

        return row;
    }

    /**
     * Calcula rateios de valores para um item específico
     */
    calculateItemRatios(adicao, produto) {
        const proporcao = this.calculateProporcaoRateio(adicao, produto);

        return {
            proporcao: proporcao,
            peso_rateado: (adicao.peso_liquido || 0) * proporcao,
            frete_rateado: (adicao.frete_valor_reais || 0) * proporcao,
            seguro_rateado: (adicao.seguro_valor_reais || 0) * proporcao,
            ii_rateado: (adicao.tributos.ii_valor_devido || 0) * proporcao,
            ipi_rateado: (adicao.tributos.ipi_valor_devido || 0) * proporcao,
            pis_rateado: (adicao.tributos.pis_valor_devido || 0) * proporcao,
            cofins_rateado: (adicao.tributos.cofins_valor_devido || 0) * proporcao,
            // Custos extras opcionais - só aplicados se configurados
            custos_extra_rateados: this.getCustosExtrasRateados(proporcao)
        };
    }

    /**
     * Calcula custo total de um item
     */
    calculateItemTotalCost(adicao, produto, cenario, ratios) {
        const custoBase = produto.valor_total_item || 0;
        const tributos = ratios.ii_rateado + ratios.ipi_rateado + ratios.pis_rateado + ratios.cofins_rateado;
        const freteSeguro = ratios.frete_rateado + ratios.seguro_rateado;
        const custosExtras = ratios.custos_extra_rateados;

        return custoBase + tributos + freteSeguro + custosExtras;
    }

    /**
     * Popula totais gerais
     */
    populateTotaisGerais(results) {
        const totaisDiv = document.getElementById('totaisGerais');
        if (!totaisDiv) return;

        // Calcular médias e totais
        const totalItens = this.currentDI.adicoes.reduce((sum, adicao) => sum + adicao.produtos.length, 0);
        const pesoTotal = this.currentDI.adicoes.reduce((sum, adicao) => sum + (adicao.peso_liquido || 0), 0);

        totaisDiv.innerHTML = `
            <div class="col-md-4 text-center">
                <h5>${totalItens}</h5>
                <small>Total de Itens</small>
            </div>
            <div class="col-md-4 text-center">
                <h5>${this.currentDI.total_adicoes}</h5>
                <small>Total de Adições</small>
            </div>
            <div class="col-md-4 text-center">
                <h5>${this.formatNumber(pesoTotal)} kg</h5>
                <small>Peso Total</small>
            </div>
        `;
    }

    /**
     * Configura event listeners da tabela expansível
     */
    setupTabelaEventListeners() {
        // Toggle de adições
        document.querySelectorAll('.adicao-row').forEach(row => {
            row.addEventListener('click', (e) => {
                const adicao = e.currentTarget.dataset.adicao;
                this.toggleAdicaoItems(adicao);
            });
        });

        // Filtros
        document.getElementById('filtroNCM')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('filtroAdicao')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('modoVisualizacao')?.addEventListener('change', () => this.changeVisualizationMode());

        // Botões de expandir/recolher
        document.getElementById('expandirTodos')?.addEventListener('click', () => this.expandirTodos());
        document.getElementById('recolherTodos')?.addEventListener('click', () => this.recolherTodos());
    }

    /**
     * Toggle de itens de uma adição
     */
    toggleAdicaoItems(numeroAdicao) {
        const items = document.querySelectorAll(`[data-adicao="${numeroAdicao}"].item-row`);
        const toggle = document.getElementById(`toggle-${numeroAdicao}`);
        
        const isVisible = items[0]?.style.display !== 'none';
        
        items.forEach(item => {
            item.style.display = isVisible ? 'none' : '';
        });
        
        if (toggle) {
            toggle.className = isVisible ? 'fas fa-plus-circle text-primary' : 'fas fa-minus-circle text-primary';
        }
    }

    /**
     * Expandir todos os itens
     */
    expandirTodos() {
        document.querySelectorAll('.item-row').forEach(row => {
            row.style.display = '';
        });
        document.querySelectorAll('[id^="toggle-"]').forEach(toggle => {
            toggle.className = 'fas fa-minus-circle text-primary';
        });
    }

    /**
     * Recolher todos os itens
     */
    recolherTodos() {
        document.querySelectorAll('.item-row').forEach(row => {
            row.style.display = 'none';
        });
        document.querySelectorAll('[id^="toggle-"]').forEach(toggle => {
            toggle.className = 'fas fa-plus-circle text-primary';
        });
    }

    /**
     * Aplicar filtros na tabela
     */
    applyFilters() {
        const filtroNCM = document.getElementById('filtroNCM')?.value.toLowerCase() || '';
        const filtroAdicao = document.getElementById('filtroAdicao')?.value || '';

        document.querySelectorAll('#tabelaResultadosBody tr').forEach(row => {
            const ncm = row.cells[2]?.textContent.toLowerCase() || '';
            const adicao = row.dataset.adicao || '';
            
            const matchNCM = !filtroNCM || ncm.includes(filtroNCM);
            const matchAdicao = !filtroAdicao || adicao === filtroAdicao;
            
            row.style.display = (matchNCM && matchAdicao) ? '' : 'none';
        });
    }

    /**
     * Mudar modo de visualização
     */
    changeVisualizationMode() {
        const modo = document.getElementById('modoVisualizacao')?.value;
        
        if (modo === 'plano') {
            // Mostrar todos os itens sem hierarquia
            document.querySelectorAll('.adicao-row').forEach(row => row.style.display = 'none');
            document.querySelectorAll('.item-row').forEach(row => row.style.display = '');
        } else {
            // Modo hierárquico
            document.querySelectorAll('.adicao-row').forEach(row => row.style.display = '');
            this.recolherTodos();
        }
    }

    /**
     * Troca de aba
     */
    switchTab(tabName) {
        // Remover active de todas as abas
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('show', 'active');
        });

        // Ativar aba selecionada
        const tabLink = document.querySelector(`[data-tab="${tabName}"]`);
        const tabPane = document.getElementById(tabName);
        
        if (tabLink && tabPane) {
            tabLink.classList.add('active');
            tabPane.classList.add('show', 'active');
        }
    }

    /**
     * Habilita aba
     */
    enableTab(tabName) {
        const tabLink = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabLink) {
            tabLink.classList.remove('disabled');
            tabLink.removeAttribute('disabled');
        }
    }

    /**
     * Carrega configuração do usuário
     */
    loadUserConfig() {
        // Carregar apenas custos extras de importação
        const custosExtras = this.storage.getCustosExtras();
        Object.keys(custosExtras).forEach(tipo => {
            const input = document.getElementById(`custos${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
            if (input) input.value = custosExtras[tipo] || 0;
        });
    }

    /**
     * Salva configuração atual
     */
    saveCurrentConfig() {
        const config = this.getCurrentConfig();
        this.storage.saveOperationConfig(config.estado, config.regime, config.operacao);
    }

    /**
     * Salva custos extras
     */
    saveCustosExtras() {
        const custos = this.getCustosExtrasFromForm();
        this.storage.saveCustosExtras(custos);
    }

    /**
     * Verifica se há DI salva
     */
    checkSavedDI() {
        const savedDI = this.storage.getDI();
        if (savedDI) {
            // Mostrar notificação de DI salva
            this.showInfo('DI anterior encontrada. Dados carregados automaticamente.');
            this.currentDI = savedDI;
            this.updateDIInfo(savedDI);
            this.populateDataTab(savedDI);
            this.enableTab('dados');
            this.enableTab('custos');
            this.showCustosInterface();
        }
    }

    /**
     * Mostra interface de configuração de custos
     */
    showCustosInterface() {
        const custosContent = document.getElementById('custosContent');
        const custosInterface = document.getElementById('custosInterface');
        
        if (custosContent && custosInterface) {
            custosContent.style.display = 'none';
            custosInterface.style.display = 'block';
            
            // Configurar event listeners para cálculo automático dos totais
            this.setupCustosEventListeners();
            
            // Calcular totais iniciais
            this.updateCustosTotals();
        }
    }

    /**
     * Configura listeners para os campos de custos
     */
    setupCustosEventListeners() {
        // Listeners para inputs de custos
        document.querySelectorAll('[data-custo-tipo]').forEach(input => {
            input.addEventListener('input', () => {
                this.updateCustosTotals();
                this.saveCustosExtras();
            });
        });

        // Listeners para critérios de rateio
        document.querySelectorAll('input[name="criterioRateio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.saveCustosExtras();
            });
        });

        // Listeners para custos extras opcionais
        document.querySelectorAll('input[name="temCustosExtras"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const interfaceCustos = document.getElementById('interfaceCustosExtras');
                if (e.target.value === 'sim') {
                    interfaceCustos.style.display = 'block';
                } else {
                    interfaceCustos.style.display = 'none';
                    // Zerar todos os custos extras quando desabilitado
                    this.limparCustosExtras();
                }
            });
        });
    }

    /**
     * Atualiza totais dos custos em tempo real
     */
    updateCustosTotals() {
        const custos = this.getCustosExtrasFromForm();
        
        // Atualizar displays individuais
        document.getElementById('totalPortuarios').textContent = this.formatCurrency(custos.portuarios);
        document.getElementById('totalBancarios').textContent = this.formatCurrency(custos.bancarios);
        document.getElementById('totalLogisticos').textContent = this.formatCurrency(custos.logisticos);
        document.getElementById('totalAdministrativos').textContent = this.formatCurrency(custos.administrativos);

        // Calcular totais
        const totalGeral = Object.values(custos).reduce((sum, value) => sum + (value || 0), 0);
        const totalBaseICMS = (custos.portuarios || 0) + (custos.logisticos || 0); // Apenas portuários e logísticos

        document.getElementById('totalGeral').textContent = this.formatCurrency(totalGeral);
        document.getElementById('totalBaseICMS').textContent = this.formatCurrency(totalBaseICMS);
    }

    /**
     * Mostra detalhes de uma adição específica
     */
    viewAdicaoDetails(numeroAdicao) {
        if (!this.currentDI) {
            this.showError('Nenhuma DI carregada.');
            return;
        }

        // Encontrar a adição
        const adicao = this.currentDI.adicoes.find(a => a.numero_adicao === numeroAdicao);
        if (!adicao) {
            this.showError(`Adição ${numeroAdicao} não encontrada.`);
            return;
        }

        // Criar modal com detalhes da adição
        this.showAdicaoModal(adicao);
    }

    /**
     * Exibe modal com detalhes da adição
     */
    showAdicaoModal(adicao) {
        // Criar modal dinamicamente
        const modalId = 'modalAdicaoDetails';
        let modal = document.getElementById(modalId);
        
        if (modal) {
            modal.remove();
        }

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('role', 'dialog');

        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-box"></i> Detalhes da Adição ${adicao.numero_adicao}
                        </h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${this.generateAdicaoDetailsContent(adicao)}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
                        <button type="button" class="btn btn-primary" onclick="app.exportAdicao('${adicao.numero_adicao}')">
                            <i class="fas fa-download"></i> Exportar Adição
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Mostrar modal usando Bootstrap
        $(modal).modal('show');
        
        // Remover modal quando fechado
        $(modal).on('hidden.bs.modal', function() {
            modal.remove();
        });
    }

    /**
     * Gera conteúdo detalhado da adição
     */
    generateAdicaoDetailsContent(adicao) {
        const produtosHtml = adicao.produtos && adicao.produtos.length > 0 
            ? adicao.produtos.map((produto, index) => `
                <tr>
                    <td>${produto.numero_sequencial_item || (index + 1)}</td>
                    <td>${produto.descricao_mercadoria || 'N/I'}</td>
                    <td>${this.formatNumber(produto.quantidade || 0)}</td>
                    <td>${produto.unidade_medida || 'N/I'}</td>
                    <td>${this.formatCurrency(produto.valor_total_item || 0)}</td>
                    <td>${this.formatCurrency(produto.valor_unitario || 0)}</td>
                    <td>${produto.fabricante_nome || 'N/I'}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="7" class="text-center text-muted">Nenhum produto encontrado para esta adição</td></tr>';

        return `
            <!-- Informações Gerais da Adição -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h6><i class="fas fa-info-circle"></i> Informações Gerais</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm table-borderless">
                                <tr><td><strong>Número da Adição:</strong></td><td>${adicao.numero_adicao}</td></tr>
                                <tr><td><strong>NCM:</strong></td><td>${adicao.ncm}</td></tr>
                                <tr><td><strong>Descrição NCM:</strong></td><td>${adicao.descricao_ncm}</td></tr>
                                <tr><td><strong>Quantidade:</strong></td><td>${this.formatNumber(adicao.quantidade_estatistica)} ${adicao.unidade_estatistica}</td></tr>
                                <tr><td><strong>Condição:</strong></td><td>${adicao.condicao_mercadoria || 'N/I'}</td></tr>
                                <tr><td><strong>Aplicação:</strong></td><td>${adicao.aplicacao_mercadoria || 'N/I'}</td></tr>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h6><i class="fas fa-dollar-sign"></i> Valores e Condições</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm table-borderless">
                                <tr><td><strong>Valor FOB (${adicao.moeda_negociacao_codigo}):</strong></td><td>${this.formatCurrency(adicao.valor_moeda_negociacao)}</td></tr>
                                <tr><td><strong>Valor FOB (R$):</strong></td><td>${this.formatCurrency(adicao.valor_reais)}</td></tr>
                                <tr><td><strong>Frete (R$):</strong></td><td>${this.formatCurrency(adicao.frete_valor_reais)}</td></tr>
                                <tr><td><strong>Seguro (R$):</strong></td><td>${this.formatCurrency(adicao.seguro_valor_reais)}</td></tr>
                                <tr><td><strong>Incoterm:</strong></td><td>${adicao.condicao_venda_incoterm}</td></tr>
                                <tr><td><strong>Local:</strong></td><td>${adicao.condicao_venda_local || 'N/I'}</td></tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tributos -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h6><i class="fas fa-receipt"></i> Tributos Federais</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3 text-center">
                                    <h5 class="text-primary">${this.formatCurrency(adicao.tributos?.ii_valor_devido || 0)}</h5>
                                    <small>II - Imposto de Importação<br>
                                    Alíquota: ${this.formatNumber(adicao.tributos?.ii_aliquota_aplicada || 0)}%</small>
                                </div>
                                <div class="col-md-3 text-center">
                                    <h5 class="text-warning">${this.formatCurrency(adicao.tributos?.ipi_valor_devido || 0)}</h5>
                                    <small>IPI - Imposto sobre Produtos Industrializados<br>
                                    Alíquota: ${this.formatNumber(adicao.tributos?.ipi_aliquota_aplicada || 0)}%</small>
                                </div>
                                <div class="col-md-3 text-center">
                                    <h5 class="text-info">${this.formatCurrency(adicao.tributos?.pis_valor_devido || 0)}</h5>
                                    <small>PIS - Programa de Integração Social<br>
                                    Alíquota: ${this.formatNumber(adicao.tributos?.pis_aliquota_aplicada || 0)}%</small>
                                </div>
                                <div class="col-md-3 text-center">
                                    <h5 class="text-success">${this.formatCurrency(adicao.tributos?.cofins_valor_devido || 0)}</h5>
                                    <small>COFINS - Contribuição para Financiamento da Seguridade Social<br>
                                    Alíquota: ${this.formatNumber(adicao.tributos?.cofins_aliquota_aplicada || 0)}%</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Produtos/Itens da Adição -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h6><i class="fas fa-list"></i> Produtos/Itens da Adição (${adicao.produtos ? adicao.produtos.length : 0} itens)</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-striped table-hover table-sm">
                                    <thead class="thead-dark">
                                        <tr>
                                            <th>Item</th>
                                            <th>Descrição</th>
                                            <th>Quantidade</th>
                                            <th>Unidade</th>
                                            <th>Valor Total</th>
                                            <th>Valor Unitário</th>
                                            <th>Fabricante</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${produtosHtml}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Exporta dados específicos de uma adição
     */
    exportAdicao(numeroAdicao) {
        if (!this.currentDI) {
            this.showError('Nenhuma DI carregada.');
            return;
        }

        const adicao = this.currentDI.adicoes.find(a => a.numero_adicao === numeroAdicao);
        if (!adicao) {
            this.showError(`Adição ${numeroAdicao} não encontrada.`);
            return;
        }

        const data = {
            di_numero: this.currentDI.numero_di,
            adicao: adicao,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `adicao_${numeroAdicao}_di_${this.currentDI.numero_di}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess(`Adição ${numeroAdicao} exportada com sucesso!`);
    }

    /**
     * Mostra interface de memória de cálculo
     */
    showCalculationMemory() {
        const stats = this.calculationMemory.getSessionStats();
        const operations = this.calculationMemory.operations;

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'calculationMemoryModal';
        modal.setAttribute('tabindex', '-1');

        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-calculator"></i> Memória de Cálculo Auditável
                        </h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${this.generateCalculationMemoryContent(stats, operations)}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-info" onclick="app.calculationMemory.exportMemory('json')">
                            <i class="fas fa-download"></i> Exportar Memória
                        </button>
                        <button type="button" class="btn btn-warning" onclick="app.clearCalculationMemory()">
                            <i class="fas fa-trash"></i> Limpar Memória
                        </button>
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        $(modal).modal('show');

        // Remover modal quando fechado
        $(modal).on('hidden.bs.modal', function() {
            modal.remove();
        });
    }

    /**
     * Gera conteúdo da interface de memória de cálculo
     */
    generateCalculationMemoryContent(stats, operations) {
        const operationsByType = this.calculationMemory.getOperationsSummaryByType();

        const statsHtml = `
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="text-primary">${stats.total_operations}</h5>
                            <small>Total de Operações</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="text-info">${stats.types_used}</h5>
                            <small>Tipos de Operação</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="text-success">${stats.duration_formatted}</h5>
                            <small>Duração da Sessão</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="text-warning">${stats.operations_per_minute.toFixed(1)}</h5>
                            <small>Ops/Minuto</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const typesSummaryHtml = Object.keys(operationsByType).length > 0 ? `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h6><i class="fas fa-chart-bar"></i> Resumo por Tipo de Operação</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Tipo</th>
                                            <th>Quantidade</th>
                                            <th>Primeira Ocorrência</th>
                                            <th>Última Ocorrência</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${Object.entries(operationsByType).map(([type, info]) => `
                                            <tr>
                                                <td><span class="badge badge-primary">${type}</span></td>
                                                <td>${info.count}</td>
                                                <td>${new Date(info.first_occurrence).toLocaleString('pt-BR')}</td>
                                                <td>${new Date(info.last_occurrence).toLocaleString('pt-BR')}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ` : '';

        const operationsHtml = operations.length > 0 ? `
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h6><i class="fas fa-list"></i> Operações Detalhadas (${operations.length} registros)</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                                <table class="table table-striped table-sm">
                                    <thead class="thead-dark sticky-top">
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>Tipo</th>
                                            <th>Descrição</th>
                                            <th>Fórmula</th>
                                            <th>Resultado</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${operations.slice(-50).reverse().map((op, index) => `
                                            <tr>
                                                <td><small>${new Date(op.timestamp).toLocaleTimeString('pt-BR')}</small></td>
                                                <td><span class="badge badge-${this.getTypeColor(op.type)}">${op.type}</span></td>
                                                <td><small>${op.description}</small></td>
                                                <td><small class="text-monospace">${op.formula || 'N/A'}</small></td>
                                                <td><small>${this.formatOperationResult(op.result)}</small></td>
                                                <td>
                                                    <button class="btn btn-xs btn-outline-info" onclick="app.showOperationDetails('${op.id}')" title="Detalhes">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ${operations.length > 50 ? '<small class="text-muted">Mostrando as últimas 50 operações</small>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        ` : '<div class="alert alert-info">Nenhuma operação de cálculo registrada ainda.</div>';

        return statsHtml + typesSummaryHtml + operationsHtml;
    }

    /**
     * Obtém cor do badge por tipo de operação
     */
    getTypeColor(type) {
        const colors = {
            'TRIBUTO': 'primary',
            'CONVERSAO_MOEDA': 'info',
            'BENEFICIO_FISCAL': 'success',
            'RATEIO_CUSTOS': 'warning',
            'CUSTO_TOTAL': 'dark'
        };
        return colors[type] || 'secondary';
    }

    /**
     * Formata resultado da operação para exibição
     */
    formatOperationResult(result) {
        if (typeof result === 'object' && result !== null) {
            if (result.valor_calculado !== undefined) return this.formatCurrency(result.valor_calculado);
            if (result.valor_convertido !== undefined) return this.formatCurrency(result.valor_convertido);
            if (result.custo_total !== undefined) return this.formatCurrency(result.custo_total);
            return 'Objeto complexo';
        }
        if (typeof result === 'number') return this.formatCurrency(result);
        return String(result);
    }

    /**
     * Mostra detalhes de uma operação específica
     */
    showOperationDetails(operationId) {
        const operation = this.calculationMemory.operations.find(op => op.id === operationId);
        if (!operation) {
            this.showError('Operação não encontrada.');
            return;
        }

        const detailsModal = document.createElement('div');
        detailsModal.className = 'modal fade';
        detailsModal.id = 'operationDetailsModal';
        
        detailsModal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-info-circle"></i> Detalhes da Operação
                        </h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <pre class="bg-light p-3 rounded">${JSON.stringify(operation, null, 2)}</pre>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(detailsModal);
        $(detailsModal).modal('show');

        $(detailsModal).on('hidden.bs.modal', function() {
            detailsModal.remove();
        });
    }

    /**
     * Limpa memória de cálculo
     */
    clearCalculationMemory() {
        if (confirm('Tem certeza que deseja limpar toda a memória de cálculo? Esta ação não pode ser desfeita.')) {
            this.calculationMemory.clear();
            this.showSuccess('Memória de cálculo limpa com sucesso.');
            
            // Fechar modal se estiver aberto
            $('#calculationMemoryModal').modal('hide');
        }
    }

    /**
     * Calcula proporção para rateio usando abordagem robusta (Opção 4)
     * 1. Tenta rateio por quantidade
     * 2. Se falhar, tenta rateio por valor FOB
     * 3. Se falhar, usa distribuição igualitária
     */
    calculateProporcaoRateio(adicao, produto) {
        // Método 1: Rateio por quantidade (preferencial)
        const totalQuantidade = adicao.produtos.reduce((sum, p) => sum + (p.quantidade || 0), 0);
        
        if (totalQuantidade > 0) {
            const proporcaoQuantidade = (produto.quantidade || 0) / totalQuantidade;
            console.log(`Adição ${adicao.numero_adicao}: Rateio por quantidade - proporção ${proporcaoQuantidade.toFixed(4)}`);
            return proporcaoQuantidade;
        }
        
        // Método 2: Rateio por valor FOB (fallback 1)
        const totalValorFOB = adicao.produtos.reduce((sum, p) => sum + (p.valor_total_item || 0), 0);
        
        if (totalValorFOB > 0) {
            const proporcaoValor = (produto.valor_total_item || 0) / totalValorFOB;
            console.warn(`Adição ${adicao.numero_adicao}: Quantidade zero - usando rateio por valor FOB - proporção ${proporcaoValor.toFixed(4)}`);
            return proporcaoValor;
        }
        
        // Método 3: Distribuição igualitária (fallback 2)
        const proporcaoIgual = 1 / adicao.produtos.length;
        console.warn(`Adição ${adicao.numero_adicao}: Sem quantidade nem valor FOB - usando distribuição igualitária - proporção ${proporcaoIgual.toFixed(4)}`);
        return proporcaoIgual;
    }

    /**
     * Calcula custos extras rateados se configurados pelo usuário
     */
    getCustosExtrasRateados(proporcao) {
        // Verificar se usuário optou por incluir custos extras
        const temCustosExtras = document.querySelector('input[name="temCustosExtras"]:checked');
        
        if (!temCustosExtras || temCustosExtras.value === 'nao') {
            return 0; // Sem custos extras
        }
        
        // Calcular total de custos extras configurados
        const custosExtras = this.getCustosExtrasFromForm();
        const totalCustosExtras = Object.values(custosExtras).reduce((sum, value) => sum + (value || 0), 0);
        
        return totalCustosExtras * proporcao;
    }

    /**
     * Limpa todos os campos de custos extras
     */
    limparCustosExtras() {
        document.querySelectorAll('[data-custo-tipo]').forEach(input => {
            input.value = 0;
        });
        this.updateCustosTotals();
        this.saveCustosExtras();
    }

    // ========== MÉTODOS DE INTERFACE ==========

    showLoading(message) {
        // Implementar loading spinner
        console.log('Loading:', message);
    }

    hideLoading() {
        // Esconder loading spinner
        console.log('Loading hidden');
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showInfo(message) {
        this.showAlert(message, 'info');
    }

    showAlert(message, type) {
        // Implementar sistema de alertas
        console.log(`Alert ${type}:`, message);
    }

    // Funções relacionadas aos estados de venda removidas - foco apenas em importação

    // ========== MÉTODOS DE FORMATAÇÃO ==========

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    }

    formatNumber(value, decimals = 2) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value || 0);
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Habilita botão Croqui NF no navbar quando DI está carregada
     */
    enableCroquisButton() {
        const btn = document.getElementById('btnCroquisNavbar');
        if (btn) {
            btn.disabled = false;
            btn.title = 'Clique para exportar o croqui da nota fiscal';
            console.log('Botão Croqui NF habilitado no navbar');
        }
    }

    /**
     * Desabilita botão Croqui NF no navbar
     */
    disableCroquisButton() {
        const btn = document.getElementById('btnCroquisNavbar');
        if (btn) {
            btn.disabled = true;
            btn.title = 'Carregue uma DI primeiro';
            console.log('Botão Croqui NF desabilitado no navbar');
        }
    }

    // ========== MÉTODOS DE EXPORTAÇÃO ==========

    /**
     * Exporta croqui de nota fiscal
     */
    async exportarCroquisNF() {
        try {
            if (!this.currentDI) {
                this.showError('Nenhuma DI carregada para gerar croqui.');
                return;
            }

            // Verificar se função existe
            if (typeof gerarCroquisNF !== 'function') {
                this.showError('Módulo de exportação não carregado.');
                console.error('Função gerarCroquisNF não encontrada. Verifique se exportNF.js foi carregado.');
                return;
            }

            console.log('Exportando croqui com DI:', this.currentDI.numero_di);
            
            // Chamar função renomeada do módulo exportNF.js
            const sucesso = await gerarCroquisNF(this.currentDI);

            if (sucesso) {
                this.showSuccess('Croqui de Nota Fiscal exportado com sucesso!');
            }

        } catch (error) {
            console.error('Erro ao exportar croqui NF:', error);
            this.showError('Erro ao exportar croqui: ' + error.message);
        }
    }

    /**
     * Exporta custos básicos
     */
    async exportarCustos() {
        try {
            if (!this.currentDI) {
                this.showError('Nenhuma DI carregada para exportar.');
                return;
            }

            // Implementação básica usando SheetJS
            const wb = XLSX.utils.book_new();
            
            // Dados de resumo simples
            const resumo = [
                ['DI', this.currentDI.numero_di],
                ['Data', this.currentDI.data_registro],
                ['Importador', this.currentDI.importador?.nome || 'N/I'],
                [''],
                ['Valor FOB Total', this.formatCurrency(this.currentDI.totais?.valor_total_fob_brl || 0)],
                ['II Total', this.formatCurrency(this.currentDI.totais?.tributos_totais?.ii_total || 0)],
                ['IPI Total', this.formatCurrency(this.currentDI.totais?.tributos_totais?.ipi_total || 0)],
                ['PIS Total', this.formatCurrency(this.currentDI.totais?.tributos_totais?.pis_total || 0)],
                ['COFINS Total', this.formatCurrency(this.currentDI.totais?.tributos_totais?.cofins_total || 0)]
            ];

            const ws = XLSX.utils.aoa_to_sheet(resumo);
            XLSX.utils.book_append_sheet(wb, ws, "Resumo");

            // Gerar arquivo
            const nomeArquivo = `Custos_DI_${this.currentDI.numero_di}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, nomeArquivo);

            this.showSuccess('Custos exportados com sucesso!');

        } catch (error) {
            console.error('Erro ao exportar custos:', error);
            this.showError('Erro ao exportar custos: ' + error.message);
        }
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ExpertzyApp();
});