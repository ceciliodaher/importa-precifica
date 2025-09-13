/**
 * ChartRenderer.js
 * Renderizador de gráficos usando Chart.js v4
 * Sistema Expertzy - Dashboard de Estatísticas
 * 
 * Responsabilidades:
 * - Renderizar gráfico temporal de evolução
 * - Renderizar gráfico de pizza de tributos
 * - Renderizar gráfico de barras por estado
 * - Configurações responsivas com formatação brasileira
 */

class ChartRenderer {
    constructor() {
        this.charts = new Map();
        this.colors = {
            primary: '#2563eb',
            success: '#16a34a',
            warning: '#d97706',
            danger: '#dc2626',
            info: '#0891b2',
            purple: '#7c3aed',
            pink: '#e11d48',
            gray: '#6b7280'
        };
        
        this.chartDefaults = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            family: 'Inter, system-ui, sans-serif',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    titleFont: {
                        family: 'Inter, system-ui, sans-serif',
                        size: 13,
                        weight: 'bold'
                    },
                    bodyFont: {
                        family: 'Inter, system-ui, sans-serif',
                        size: 12
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        lineWidth: 1
                    },
                    ticks: {
                        font: {
                            family: 'Inter, system-ui, sans-serif',
                            size: 11
                        },
                        color: '#6b7280'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        lineWidth: 1
                    },
                    ticks: {
                        font: {
                            family: 'Inter, system-ui, sans-serif',
                            size: 11
                        },
                        color: '#6b7280'
                    }
                }
            }
        };
    }

    /**
     * Renderiza gráfico temporal de evolução das importações
     * @param {string} canvasId - ID do elemento canvas
     * @param {Array} timelineData - Dados temporais das DIs
     */
    renderTimelineChart(canvasId, timelineData) {
        if (!timelineData || !Array.isArray(timelineData)) {
            throw new Error('timelineData é obrigatório e deve ser um array');
        }

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            throw new Error(`Canvas com ID '${canvasId}' não encontrado`);
        }

        // Destruir gráfico existente se houver
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }

        const ctx = canvas.getContext('2d');
        
        // Processar dados temporais
        const processedData = this._processTimelineData(timelineData);

        const config = {
            type: 'line',
            data: {
                labels: processedData.labels,
                datasets: [{
                    label: 'Valor Total das Importações (R$)',
                    data: processedData.values,
                    borderColor: this.colors.primary,
                    backgroundColor: this.colors.primary + '20',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: this.colors.primary,
                    pointBorderWidth: 3
                }, {
                    label: 'Quantidade de DIs',
                    data: processedData.counts,
                    borderColor: this.colors.success,
                    backgroundColor: this.colors.success + '20',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: this.colors.success,
                    pointBorderWidth: 2,
                    yAxisID: 'y1'
                }]
            },
            options: {
                ...this.chartDefaults,
                scales: {
                    ...this.chartDefaults.scales,
                    y: {
                        ...this.chartDefaults.scales.y,
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Valor Total (R$)',
                            font: {
                                family: 'Inter, system-ui, sans-serif',
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            ...this.chartDefaults.scales.y.ticks,
                            callback: (value) => this._formatCurrency(value)
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Quantidade de DIs',
                            font: {
                                family: 'Inter, system-ui, sans-serif',
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                family: 'Inter, system-ui, sans-serif',
                                size: 11
                            },
                            color: '#6b7280'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    ...this.chartDefaults.plugins,
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                if (context.datasetIndex === 0) {
                                    return `Valor Total: ${this._formatCurrency(context.parsed.y)}`;
                                }
                                return `Quantidade: ${context.parsed.y} DIs`;
                            }
                        }
                    }
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        
        return chart;
    }

    /**
     * Renderiza gráfico de pizza dos tributos
     * @param {string} canvasId - ID do elemento canvas
     * @param {Object} tributosData - Dados dos tributos agregados
     */
    renderTributosChart(canvasId, tributosData) {
        if (!tributosData || typeof tributosData !== 'object') {
            throw new Error('tributosData é obrigatório e deve ser um objeto');
        }

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            throw new Error(`Canvas com ID '${canvasId}' não encontrado`);
        }

        // Destruir gráfico existente se houver
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }

        const ctx = canvas.getContext('2d');
        
        // Processar dados de tributos
        const processedData = this._processTributosData(tributosData);

        const config = {
            type: 'doughnut',
            data: {
                labels: processedData.labels,
                datasets: [{
                    label: 'Tributos (R$)',
                    data: processedData.values,
                    backgroundColor: [
                        this.colors.primary,
                        this.colors.success,
                        this.colors.warning,
                        this.colors.danger,
                        this.colors.info,
                        this.colors.purple,
                        this.colors.pink
                    ],
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverBorderWidth: 3,
                    hoverOffset: 10
                }]
            },
            options: {
                ...this.chartDefaults,
                cutout: '60%',
                plugins: {
                    ...this.chartDefaults.plugins,
                    legend: {
                        ...this.chartDefaults.plugins.legend,
                        position: 'right'
                    },
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = this._formatCurrency(context.parsed);
                                const percentage = ((context.parsed / processedData.total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        
        return chart;
    }

    /**
     * Renderiza gráfico de barras por estado
     * @param {string} canvasId - ID do elemento canvas
     * @param {Array} estadosData - Dados agrupados por estado
     */
    renderEstadosChart(canvasId, estadosData) {
        if (!estadosData || !Array.isArray(estadosData)) {
            throw new Error('estadosData é obrigatório e deve ser um array');
        }

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            throw new Error(`Canvas com ID '${canvasId}' não encontrado`);
        }

        // Destruir gráfico existente se houver
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }

        const ctx = canvas.getContext('2d');
        
        // Processar dados por estado
        const processedData = this._processEstadosData(estadosData);

        const config = {
            type: 'bar',
            data: {
                labels: processedData.labels,
                datasets: [{
                    label: 'Valor Total das Importações (R$)',
                    data: processedData.values,
                    backgroundColor: processedData.labels.map((_, index) => 
                        Object.values(this.colors)[index % Object.keys(this.colors).length] + '80'
                    ),
                    borderColor: processedData.labels.map((_, index) => 
                        Object.values(this.colors)[index % Object.keys(this.colors).length]
                    ),
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }, {
                    label: 'Quantidade de DIs',
                    data: processedData.counts,
                    backgroundColor: this.colors.success + '60',
                    borderColor: this.colors.success,
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                    yAxisID: 'y1'
                }]
            },
            options: {
                ...this.chartDefaults,
                scales: {
                    ...this.chartDefaults.scales,
                    x: {
                        ...this.chartDefaults.scales.x,
                        title: {
                            display: true,
                            text: 'Estados',
                            font: {
                                family: 'Inter, system-ui, sans-serif',
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        ...this.chartDefaults.scales.y,
                        title: {
                            display: true,
                            text: 'Valor Total (R$)',
                            font: {
                                family: 'Inter, system-ui, sans-serif',
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            ...this.chartDefaults.scales.y.ticks,
                            callback: (value) => this._formatCurrency(value)
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Quantidade de DIs',
                            font: {
                                family: 'Inter, system-ui, sans-serif',
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                family: 'Inter, system-ui, sans-serif',
                                size: 11
                            },
                            color: '#6b7280'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    ...this.chartDefaults.plugins,
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                if (context.datasetIndex === 0) {
                                    return `Valor Total: ${this._formatCurrency(context.parsed.y)}`;
                                }
                                return `Quantidade: ${context.parsed.y} DIs`;
                            }
                        }
                    }
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        
        return chart;
    }

    /**
     * Processa dados temporais para o gráfico de linha
     * @param {Array} timelineData - Dados temporais das DIs
     * @returns {Object} Dados processados para Chart.js
     * @private
     */
    _processTimelineData(timelineData) {
        const groupedByMonth = new Map();

        timelineData.forEach(di => {
            if (!di.data_registro || di.valor_reais === undefined) {
                throw new Error('DI deve ter data_registro e valor_reais obrigatórios');
            }

            const date = new Date(di.data_registro);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!groupedByMonth.has(monthKey)) {
                groupedByMonth.set(monthKey, { value: 0, count: 0 });
            }

            const existing = groupedByMonth.get(monthKey);
            existing.value += parseFloat(di.valor_reais);
            existing.count += 1;
        });

        // Ordenar por data
        const sorted = Array.from(groupedByMonth.entries())
            .sort(([a], [b]) => a.localeCompare(b));

        return {
            labels: sorted.map(([monthKey]) => {
                const [year, month] = monthKey.split('-');
                const date = new Date(year, month - 1);
                return date.toLocaleDateString('pt-BR', { 
                    month: 'short', 
                    year: 'numeric' 
                });
            }),
            values: sorted.map(([, data]) => data.value),
            counts: sorted.map(([, data]) => data.count),
            total: sorted.reduce((sum, [, data]) => sum + data.value, 0)
        };
    }

    /**
     * Processa dados de tributos para o gráfico de pizza
     * @param {Object} tributosData - Dados dos tributos
     * @returns {Object} Dados processados para Chart.js
     * @private
     */
    _processTributosData(tributosData) {
        const labels = [];
        const values = [];
        let total = 0;

        // Mapear nomes dos tributos
        const tributosMap = {
            ii_total: 'Imposto de Importação (II)',
            ipi_total: 'IPI',
            pis_total: 'PIS',
            cofins_total: 'COFINS',
            icms_total: 'ICMS',
            outros: 'Outros Tributos'
        };

        Object.entries(tributosData).forEach(([key, value]) => {
            if (value && parseFloat(value) > 0) {
                const label = tributosMap[key] || key.toUpperCase();
                const numValue = parseFloat(value);
                
                labels.push(label);
                values.push(numValue);
                total += numValue;
            }
        });

        if (total === 0) {
            throw new Error('Nenhum tributo com valor válido encontrado');
        }

        return { labels, values, total };
    }

    /**
     * Processa dados por estado para o gráfico de barras
     * @param {Array} estadosData - Dados por estado
     * @returns {Object} Dados processados para Chart.js
     * @private
     */
    _processEstadosData(estadosData) {
        const groupedByState = new Map();

        estadosData.forEach(item => {
            if (!item.estado || item.valor_total === undefined) {
                throw new Error('Item deve ter estado e valor_total obrigatórios');
            }

            const state = item.estado;
            if (!groupedByState.has(state)) {
                groupedByState.set(state, { value: 0, count: 0 });
            }

            const existing = groupedByState.get(state);
            existing.value += parseFloat(item.valor_total);
            existing.count += parseInt(item.quantidade_dis || 1);
        });

        // Ordenar por valor decrescente
        const sorted = Array.from(groupedByState.entries())
            .sort(([, a], [, b]) => b.value - a.value);

        return {
            labels: sorted.map(([state]) => state),
            values: sorted.map(([, data]) => data.value),
            counts: sorted.map(([, data]) => data.count)
        };
    }

    /**
     * Formata valor monetário em Real brasileiro
     * @param {number} value - Valor numérico
     * @returns {string} Valor formatado
     * @private
     */
    _formatCurrency(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'R$ 0,00';
        }

        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    /**
     * Destroi um gráfico específico
     * @param {string} canvasId - ID do canvas do gráfico
     */
    destroyChart(canvasId) {
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
            this.charts.delete(canvasId);
        }
    }

    /**
     * Destroi todos os gráficos
     */
    destroyAllCharts() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }

    /**
     * Redimensiona todos os gráficos (útil após mudanças de layout)
     */
    resizeAllCharts() {
        this.charts.forEach(chart => chart.resize());
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.ChartRenderer = ChartRenderer;
}

export default ChartRenderer;