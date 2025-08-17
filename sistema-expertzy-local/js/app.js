/**
 * Aplicação Principal do Sistema Expertzy
 * Gerencia upload, processamento e interface do usuário
 */
class ExpertzyApp {
    constructor() {
        this.storage = new StorageManager();
        this.xmlParser = new DiParser();
        this.calculator = new TributaryCalculator();
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
            this.populateEstados();
            
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

        // Configurações
        this.setupConfigEventListeners();
    }

    /**
     * Configura listeners para as configurações
     */
    setupConfigEventListeners() {
        // Estado de destino
        const estadoSelect = document.getElementById('estadoDestino');
        if (estadoSelect) {
            estadoSelect.addEventListener('change', () => this.saveCurrentConfig());
        }

        // Regime tributário
        const regimeSelect = document.getElementById('regimeTributario');
        if (regimeSelect) {
            regimeSelect.addEventListener('change', () => this.saveCurrentConfig());
        }

        // Tipo de operação
        const tipoSelect = document.getElementById('tipoOperacao');
        if (tipoSelect) {
            tipoSelect.addEventListener('change', () => this.saveCurrentConfig());
        }

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
        event.currentTarget.classList.add('drag-over');
    }

    /**
     * Manipula drop de arquivo
     */
    handleFileDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('drag-over');
        
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
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h5 class="card-title">${this.formatCurrency(totais.valor_total_fob_brl)}</h5>
                                <p class="card-text">Valor FOB (R$)</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h5 class="card-title">${this.formatCurrency(totais.tributos_totais.ii_total)}</h5>
                                <p class="card-text">II Total</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h5 class="card-title">${this.formatCurrency(totais.tributos_totais.ipi_total)}</h5>
                                <p class="card-text">IPI Total</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h5 class="card-title">${this.formatCurrency(totais.tributos_totais.pis_total + totais.tributos_totais.cofins_total)}</h5>
                                <p class="card-text">PIS+COFINS</p>
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
     * Obtém configuração atual da interface
     */
    getCurrentConfig() {
        return {
            estado: document.getElementById('estadoDestino')?.value || 'GO',
            regime: document.getElementById('regimeTributario')?.value || 'real',
            operacao: document.getElementById('tipoOperacao')?.value || 'interestadual'
        };
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
        const totalQuantidade = adicao.produtos.reduce((sum, p) => sum + (p.quantidade || 0), 0);
        const proporcao = (produto.quantidade || 0) / totalQuantidade;

        return {
            peso_rateado: (adicao.peso_liquido || 0) * proporcao,
            frete_rateado: (adicao.frete_valor_reais || 0) * proporcao,
            seguro_rateado: (adicao.seguro_valor_reais || 0) * proporcao,
            custos_extra_rateados: 0, // Será calculado com base no cenário
            ii_rateado: (adicao.tributos.ii_valor_devido || 0) * proporcao,
            ipi_rateado: (adicao.tributos.ipi_valor_devido || 0) * proporcao,
            pis_rateado: (adicao.tributos.pis_valor_devido || 0) * proporcao,
            cofins_rateado: (adicao.tributos.cofins_valor_devido || 0) * proporcao
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
        const config = this.storage.getConfig();
        if (config) {
            const estadoSelect = document.getElementById('estadoDestino');
            const regimeSelect = document.getElementById('regimeTributario');
            const tipoSelect = document.getElementById('tipoOperacao');
            
            if (estadoSelect) estadoSelect.value = config.estado_padrao || 'GO';
            if (regimeSelect) regimeSelect.value = config.regime_tributario || 'real';
            if (tipoSelect) tipoSelect.value = config.tipo_operacao_padrao || 'interestadual';
        }

        // Carregar custos extras
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

    /**
     * Popula select de estados com dados dos arquivos de configuração
     */
    populateEstados() {
        const estadoSelect = document.getElementById('estadoDestino');
        if (!estadoSelect || !this.calculator.aliquotas) return;

        // Limpar options existentes
        estadoSelect.innerHTML = '<option value="">Selecione o estado...</option>';

        // Obter estados do arquivo de alíquotas
        const estados = this.calculator.aliquotas.aliquotas_icms_2025;
        
        // Criar array ordenado de estados
        const estadosOrdenados = Object.keys(estados).sort().map(uf => ({
            uf: uf,
            nome: this.getNomeEstado(uf),
            aliquota: estados[uf].aliquota_interna
        }));

        // Adicionar options
        estadosOrdenados.forEach(estado => {
            const option = document.createElement('option');
            option.value = estado.uf;
            option.textContent = `${estado.nome} (${estado.uf}) - ${estado.aliquota}%`;
            estadoSelect.appendChild(option);
        });
    }

    /**
     * Retorna nome completo do estado pela UF
     */
    getNomeEstado(uf) {
        const nomes = {
            'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
            'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
            'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
            'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná',
            'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
            'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
            'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
        };
        return nomes[uf] || uf;
    }

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
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ExpertzyApp();
});