/**
 * StatisticsDashboard.js - Controller Principal do Dashboard de Estatísticas
 * Sistema Expertzy - Módulo de Análise e Relatórios de Importação
 * 
 * REGRAS CRÍTICAS (OBRIGATÓRIAS):
 * 1. NUNCA usar fallbacks para dados obrigatórios - sempre throw Error
 * 2. Taxa de câmbio SEMPRE calculada: valor_reais / valor_moeda_negociacao
 * 3. Usar nomenclatura EXATA: numero_di, valor_reais, valor_moeda_negociacao, ii_valor_devido, etc.
 * 4. Validar todos os dados antes de usar
 */

class StatisticsDashboard {
    constructor() {
        this.apiBaseUrl = window.location.origin + '/api/endpoints';
        this.currentData = null;
        this.currentPeriod = '30d';
        this.currentDetailLevel = 'completo';
        this.loadingStates = new Map();
        this.charts = new Map();
        
        this.init();
    }

    /**
     * Inicialização do dashboard
     */
    async init() {
        try {
            this.initializeElements();
            this.attachEventListeners();
            await this.loadInitialData();
            this.initializeCharts();
        } catch (error) {
            this.handleError('Erro na inicialização do dashboard', error);
        }
    }

    /**
     * Inicializar elementos DOM
     */
    initializeElements() {
        // Controles de filtro
        this.periodSelect = document.getElementById('periodSelect');
        this.detailLevelSelect = document.getElementById('detailLevelSelect');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.exportBtn = document.getElementById('exportBtn');
        
        // Seções de KPIs
        this.kpiSection = document.getElementById('kpiSection');
        this.totalDIsCard = document.getElementById('totalDIs');
        this.totalValueCard = document.getElementById('totalValue');
        this.avgExchangeRateCard = document.getElementById('avgExchangeRate');
        this.totalTaxesCard = document.getElementById('totalTaxes');
        this.taxBurdenCard = document.getElementById('taxBurden');
        this.totalImportersCard = document.getElementById('totalImporters');
        
        // Seções de tabelas e gráficos
        this.statesRankingTable = document.getElementById('statesRankingTable');
        this.ncmsRankingTable = document.getElementById('ncmsRankingTable');
        this.importersRankingTable = document.getElementById('importersRankingTable');
        this.taxAnalysisTable = document.getElementById('taxAnalysisTable');
        this.temporalChart = document.getElementById('temporalChart');
        this.taxDistributionChart = document.getElementById('taxDistributionChart');
        
        // Seções de loading
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.alertContainer = document.getElementById('alertContainer');
        
        // Validar elementos obrigatórios
        const requiredElements = [
            'periodSelect', 'detailLevelSelect', 'refreshBtn', 'kpiSection'
        ];
        
        for (const elementId of requiredElements) {
            if (!this[elementId]) {
                throw new Error(`Elemento DOM obrigatório não encontrado: ${elementId}`);
            }
        }
    }

    /**
     * Anexar event listeners
     */
    attachEventListeners() {
        // Controles de filtro
        this.periodSelect.addEventListener('change', () => this.onPeriodChange());
        this.detailLevelSelect.addEventListener('change', () => this.onDetailLevelChange());
        this.refreshBtn.addEventListener('click', () => this.refreshData());
        
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.exportData());
        }
        
        // Auto-refresh a cada 5 minutos
        setInterval(() => this.autoRefresh(), 5 * 60 * 1000);
    }

    /**
     * Carregar dados iniciais
     */
    async loadInitialData() {
        this.showLoading('global', 'Carregando estatísticas globais...');
        
        try {
            await this.loadGlobalStats();
            this.hideLoading('global');
            this.showSuccess('Dashboard carregado com sucesso');
        } catch (error) {
            this.hideLoading('global');
            throw error;
        }
    }

    /**
     * Carregar estatísticas globais
     */
    async loadGlobalStats() {
        const endpoint = `${this.apiBaseUrl}/statistics/global-stats.php`;
        const params = new URLSearchParams({
            periodo: this.currentPeriod,
            detalhamento: this.currentDetailLevel
        });
        
        try {
            const response = await fetch(`${endpoint}?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Erro desconhecido na API');
            }
            
            // Validar dados obrigatórios
            this.validateGlobalStatsData(result.data);
            
            // Armazenar dados atuais
            this.currentData = result.data;
            
            // Renderizar componentes
            this.renderKPIs(result.data.resumo_geral);
            this.renderRankings(result.data);
            this.renderTemporalAnalysis(result.data.distribuicao_temporal);
            
            if (this.currentDetailLevel === 'completo') {
                this.renderTaxAnalysis(result.data.analise_tributos_consolidada);
                this.renderTrendAnalysis(result.data.tendencias_temporais);
            }
            
        } catch (error) {
            throw new Error(`Erro ao carregar estatísticas globais: ${error.message}`);
        }
    }

    /**
     * Carregar lista de DIs com paginação
     */
    async loadDIList(page = 1, limit = 20, filters = {}) {
        const endpoint = `${this.apiBaseUrl}/listar-dis.php`;
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...filters
        });
        
        try {
            const response = await fetch(`${endpoint}?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Erro desconhecido na API');
            }
            
            // Validar dados de DI
            if (result.data && result.data.length > 0) {
                result.data.forEach(di => this.validateDIData(di));
            }
            
            return result;
            
        } catch (error) {
            throw new Error(`Erro ao carregar lista de DIs: ${error.message}`);
        }
    }

    /**
     * Validar dados de estatísticas globais (SEM FALLBACKS)
     */
    validateGlobalStatsData(data) {
        if (!data) {
            throw new Error('Dados de estatísticas globais ausentes');
        }
        
        const { resumo_geral } = data;
        if (!resumo_geral) {
            throw new Error('Resumo geral obrigatório não encontrado');
        }
        
        // Validações obrigatórias sem fallbacks
        if (resumo_geral.total_dis === undefined || resumo_geral.total_dis === null) {
            throw new Error('Total de DIs obrigatório ausente');
        }
        
        if (resumo_geral.valor_total_importado_reais === undefined || resumo_geral.valor_total_importado_reais === null) {
            throw new Error('Valor total importado em reais obrigatório ausente');
        }
        
        if (resumo_geral.valor_total_importado_usd === undefined || resumo_geral.valor_total_importado_usd === null) {
            throw new Error('Valor total importado em USD obrigatório ausente');
        }
        
        // Taxa de câmbio deve ser calculada dinamicamente
        const valorReais = parseFloat(resumo_geral.valor_total_importado_reais);
        const valorUSD = parseFloat(resumo_geral.valor_total_importado_usd);
        
        if (!isFinite(valorReais) || valorReais < 0) {
            throw new Error('Valor total em reais inválido para cálculo de taxa de câmbio');
        }
        
        if (!isFinite(valorUSD) || valorUSD <= 0) {
            throw new Error('Valor total em USD inválido para cálculo de taxa de câmbio');
        }
        
        // Calcular e validar taxa de câmbio
        const taxaCalculada = valorReais / valorUSD;
        if (!isFinite(taxaCalculada) || taxaCalculada <= 0) {
            throw new Error('Taxa de câmbio calculada inválida');
        }
        
        // Atualizar com taxa calculada
        resumo_geral.taxa_cambio_calculada = taxaCalculada.toFixed(4);
        
        return data;
    }

    /**
     * Validar dados de DI individual (SEM FALLBACKS)
     */
    validateDIData(di) {
        if (!di.numero_di) {
            throw new Error('DI sem número identificador');
        }
        
        if (di.valor_reais === undefined || di.valor_reais === null) {
            throw new Error(`Valor reais obrigatório ausente na DI ${di.numero_di}`);
        }
        
        if (di.valor_moeda_negociacao === undefined || di.valor_moeda_negociacao === null) {
            throw new Error(`Valor moeda negociação obrigatório ausente na DI ${di.numero_di}`);
        }
        
        // Taxa câmbio sempre calculada
        const valorReais = parseFloat(di.valor_reais);
        const valorMoedaNeg = parseFloat(di.valor_moeda_negociacao);
        
        if (!isFinite(valorReais) || valorReais < 0) {
            throw new Error(`Valor reais inválido na DI ${di.numero_di}`);
        }
        
        if (!isFinite(valorMoedaNeg) || valorMoedaNeg <= 0) {
            throw new Error(`Valor moeda negociação inválido na DI ${di.numero_di}`);
        }
        
        const taxaCambio = valorReais / valorMoedaNeg;
        if (!isFinite(taxaCambio) || taxaCambio <= 0) {
            throw new Error(`Taxa câmbio inválida para DI ${di.numero_di}`);
        }
        
        return { ...di, taxa_cambio: taxaCambio };
    }

    /**
     * Aplicar filtros de pesquisa
     */
    async applyFilters(filters = {}) {
        this.showLoading('filters', 'Aplicando filtros...');
        
        try {
            // Recarregar dados com novos filtros
            await this.loadGlobalStats();
            
            this.hideLoading('filters');
            this.showSuccess('Filtros aplicados com sucesso');
            
        } catch (error) {
            this.hideLoading('filters');
            this.handleError('Erro ao aplicar filtros', error);
        }
    }

    /**
     * Atualizar dados
     */
    async refreshData() {
        this.showLoading('refresh', 'Atualizando dados...');
        
        try {
            await this.loadGlobalStats();
            this.hideLoading('refresh');
            this.showSuccess('Dados atualizados com sucesso');
        } catch (error) {
            this.hideLoading('refresh');
            this.handleError('Erro ao atualizar dados', error);
        }
    }

    /**
     * Auto-refresh periódico
     */
    async autoRefresh() {
        try {
            await this.loadGlobalStats();
        } catch (error) {
            console.warn('Erro no auto-refresh:', error.message);
        }
    }

    /**
     * Renderizar KPIs principais
     */
    renderKPIs(resumoGeral) {
        if (!resumoGeral) {
            throw new Error('Resumo geral obrigatório para renderização de KPIs');
        }
        
        // Total de DIs
        if (this.totalDIsCard) {
            this.totalDIsCard.textContent = this.formatNumber(resumoGeral.total_dis);
        }
        
        // Valor total importado
        if (this.totalValueCard) {
            this.totalValueCard.textContent = this.formatCurrency(resumoGeral.valor_total_importado_reais);
        }
        
        // Taxa de câmbio média (calculada)
        if (this.avgExchangeRateCard) {
            if (!resumoGeral.taxa_cambio_calculada) {
                throw new Error('taxa_cambio_calculada obrigatória ausente nas estatísticas globais');
            }
            const taxa = resumoGeral.taxa_cambio_calculada;
            this.avgExchangeRateCard.textContent = this.formatExchangeRate(taxa);
        }
        
        // Total de tributos
        if (this.totalTaxesCard) {
            this.totalTaxesCard.textContent = this.formatCurrency(resumoGeral.total_tributos_federais);
        }
        
        // Carga tributária
        if (this.taxBurdenCard) {
            this.taxBurdenCard.textContent = this.formatPercentage(resumoGeral.carga_tributaria_media);
        }
        
        // Total de importadores
        if (this.totalImportersCard) {
            this.totalImportersCard.textContent = this.formatNumber(resumoGeral.total_importadores);
        }
    }

    /**
     * Renderizar rankings
     */
    renderRankings(data) {
        // Ranking de estados
        if (this.statesRankingTable && data.ranking_estados) {
            this.renderStatesRanking(data.ranking_estados);
        }
        
        // Ranking de NCMs
        if (this.ncmsRankingTable && data.ranking_ncms) {
            this.renderNCMsRanking(data.ranking_ncms);
        }
        
        // Ranking de importadores
        if (this.importersRankingTable && data.ranking_importadores) {
            this.renderImportersRanking(data.ranking_importadores);
        }
    }

    /**
     * Renderizar ranking de estados
     */
    renderStatesRanking(estados) {
        const tbody = this.statesRankingTable.querySelector('tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        estados.forEach((estado, index) => {
            if (!estado.uf) {
                throw new Error(`Estado sem UF na posição ${index}`);
            }
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><span class="badge bg-primary">${estado.uf}</span></td>
                <td>${this.formatNumber(estado.total_dis)}</td>
                <td>${this.formatCurrency(estado.valor_total)}</td>
                <td>${this.formatNumber(estado.total_importadores)}</td>
            `;
        });
    }

    /**
     * Renderizar ranking de NCMs
     */
    renderNCMsRanking(ncms) {
        const tbody = this.ncmsRankingTable.querySelector('tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        ncms.forEach((ncm, index) => {
            if (!ncm.ncm) {
                throw new Error(`NCM sem código na posição ${index}`);
            }
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <strong>${ncm.ncm}</strong><br>
                    <small class="text-muted">${ncm.descricao_ncm ? ncm.descricao_ncm : 'Descrição não disponível'}</small>
                </td>
                <td>${this.formatNumber(ncm.total_adicoes)}</td>
                <td>${this.formatCurrency(ncm.valor_total)}</td>
                <td>${this.formatCurrency(ncm.valor_medio)}</td>
            `;
        });
    }

    /**
     * Renderizar ranking de importadores
     */
    renderImportersRanking(importadores) {
        const tbody = this.importersRankingTable.querySelector('tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        importadores.forEach((importador, index) => {
            if (!importador.nome) {
                throw new Error(`Importador sem nome na posição ${index}`);
            }
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <strong>${importador.nome}</strong><br>
                    <small class="text-muted">CNPJ: ${this.formatCNPJ(importador.cnpj)}</small>
                </td>
                <td><span class="badge bg-info">${importador.uf}</span></td>
                <td>${this.formatNumber(importador.total_dis)}</td>
                <td>${this.formatCurrency(importador.valor_total)}</td>
            `;
        });
    }

    /**
     * Renderizar análise temporal
     */
    renderTemporalAnalysis(distribuicaoTemporal) {
        if (!distribuicaoTemporal || distribuicaoTemporal.length === 0) {
            return;
        }
        
        const ctx = this.temporalChart?.getContext('2d');
        if (!ctx) return;
        
        // Destruir gráfico existente
        if (this.charts.has('temporal')) {
            this.charts.get('temporal').destroy();
        }
        
        const labels = distribuicaoTemporal.map(d => d.mes).reverse();
        const values = distribuicaoTemporal.map(d => parseFloat(d.valor_total)).reverse();
        const diCounts = distribuicaoTemporal.map(d => d.total_dis).reverse();
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valor Importado (R$)',
                    data: values,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    yAxisID: 'y'
                }, {
                    label: 'Número de DIs',
                    data: diCounts,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
        
        this.charts.set('temporal', chart);
    }

    /**
     * Renderizar análise de tributos
     */
    renderTaxAnalysis(analiseTributos) {
        if (!analiseTributos || !this.taxAnalysisTable) {
            return;
        }
        
        const tbody = this.taxAnalysisTable.querySelector('tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        analiseTributos.forEach((tributo, index) => {
            if (!tributo.tributo) {
                throw new Error(`Tributo sem tipo na posição ${index}`);
            }
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td><span class="badge bg-secondary">${tributo.tributo}</span></td>
                <td>${this.formatCurrency(tributo.total_devido)}</td>
                <td>${this.formatCurrency(tributo.total_base_calculo)}</td>
                <td>${this.formatPercentage(tributo.aliquota_media)}</td>
                <td>${this.formatNumber(tributo.adicoes_tributadas)}</td>
            `;
        });
        
        // Renderizar gráfico de distribuição de tributos
        this.renderTaxDistributionChart(analiseTributos);
    }

    /**
     * Renderizar gráfico de distribuição de tributos
     */
    renderTaxDistributionChart(tributos) {
        const ctx = this.taxDistributionChart?.getContext('2d');
        if (!ctx) return;
        
        // Destruir gráfico existente
        if (this.charts.has('taxDistribution')) {
            this.charts.get('taxDistribution').destroy();
        }
        
        const labels = tributos.map(t => t.tributo);
        const values = tributos.map(t => parseFloat(t.total_devido));
        
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        'rgb(255, 99, 132)',
                        'rgb(54, 162, 235)',
                        'rgb(255, 205, 86)',
                        'rgb(75, 192, 192)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.label}: ${this.formatCurrency(context.parsed)}`;
                            }
                        }
                    }
                }
            }
        });
        
        this.charts.set('taxDistribution', chart);
    }

    /**
     * Renderizar análise de tendências
     */
    renderTrendAnalysis(tendencias) {
        // Implementar visualização de tendências se necessário
        console.log('Tendências:', tendencias);
    }

    /**
     * Inicializar gráficos
     */
    initializeCharts() {
        // Configurações globais do Chart.js
        Chart.defaults.font.family = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
        Chart.defaults.color = '#495057';
    }

    /**
     * Manipuladores de eventos
     */
    onPeriodChange() {
        const newPeriod = this.periodSelect.value;
        if (newPeriod !== this.currentPeriod) {
            this.currentPeriod = newPeriod;
            this.refreshData();
        }
    }

    onDetailLevelChange() {
        const newDetailLevel = this.detailLevelSelect.value;
        if (newDetailLevel !== this.currentDetailLevel) {
            this.currentDetailLevel = newDetailLevel;
            this.refreshData();
        }
    }

    /**
     * Exportar dados
     */
    async exportData() {
        if (!this.currentData) {
            this.showError('Nenhum dado disponível para exportação');
            return;
        }
        
        this.showLoading('export', 'Exportando dados...');
        
        try {
            // Criar dados para exportação
            const exportData = {
                timestamp: new Date().toISOString(),
                periodo: this.currentPeriod,
                detalhamento: this.currentDetailLevel,
                dados: this.currentData
            };
            
            // Criar e baixar arquivo JSON
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `statistics-export-${this.currentPeriod}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.hideLoading('export');
            this.showSuccess('Dados exportados com sucesso');
            
        } catch (error) {
            this.hideLoading('export');
            this.handleError('Erro na exportação', error);
        }
    }

    /**
     * Gerenciamento de loading states
     */
    showLoading(key, message) {
        this.loadingStates.set(key, true);
        
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
            const messageEl = this.loadingOverlay.querySelector('.loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }

    hideLoading(key) {
        this.loadingStates.delete(key);
        
        if (this.loadingStates.size === 0 && this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Tratamento de erros
     */
    handleError(title, error) {
        console.error(title, error);
        this.showError(`${title}: ${error.message}`);
    }

    /**
     * Exibir mensagens
     */
    showAlert(message, type = 'info') {
        if (!this.alertContainer) return;
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        this.alertContainer.appendChild(alertDiv);
        
        // Auto-dismiss após 5 segundos
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showWarning(message) {
        this.showAlert(message, 'warning');
    }

    /**
     * Utilitários de formatação
     */
    formatNumber(value) {
        const num = parseFloat(value);
        return isFinite(num) ? num.toLocaleString('pt-BR') : '0';
    }

    formatCurrency(value) {
        const num = parseFloat(value);
        return isFinite(num) ? 
            new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(num) : 'R$ 0,00';
    }

    formatExchangeRate(value) {
        const num = parseFloat(value);
        return isFinite(num) ? num.toFixed(4) : '0.0000';
    }

    formatPercentage(value) {
        const num = parseFloat(value);
        return isFinite(num) ? `${num.toFixed(2)}%` : '0.00%';
    }

    formatCNPJ(cnpj) {
        if (!cnpj) return 'N/A';
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
}

// Inicializar dashboard quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.statisticsDashboard = new StatisticsDashboard();
        console.log('Statistics Dashboard inicializado com sucesso');
    } catch (error) {
        console.error('Erro na inicialização do Statistics Dashboard:', error);
        
        // Exibir erro na tela
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3';
        errorDiv.style.zIndex = '9999';
        errorDiv.innerHTML = `
            <h6>Erro de Inicialização</h6>
            <p>${error.message}</p>
            <small>Verifique o console para mais detalhes</small>
        `;
        document.body.appendChild(errorDiv);
    }
});