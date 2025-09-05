/**
 * regime-interface.js - Interface para Configuração de Regime Tributário
 * 
 * Gerencia a interface de configuração do regime tributário
 * Integra com RegimeConfigManager e carrega dados de arquivos JSON
 * 
 * @version 1.0.0
 * @author Expertzy System
 */

// Global instances
let regimeManager = null;
let estadosBrasil = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Regime Interface: Inicializando...');
    initializeRegimeInterface();
});

/**
 * Initialize regime interface
 */
async function initializeRegimeInterface() {
    try {
        // Initialize RegimeConfigManager
        regimeManager = new RegimeConfigManager();
        
        // Load states from JSON
        await loadEstados();
        
        // Load current configuration
        await loadCurrentConfig();
        
        // Setup event listeners
        setupEventListeners();
        
        // Update previews
        updatePreviews();
        
        console.log('✅ Regime Interface inicializada');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar interface:', error);
        showAlert('Erro ao inicializar sistema de configuração.', 'danger');
    }
}

/**
 * Load states from JSON file
 */
async function loadEstados() {
    try {
        const response = await fetch('shared/data/estados-brasil.json');
        if (!response.ok) {
            throw new Error('Erro ao carregar estados');
        }
        
        estadosBrasil = await response.json();
        populateEstadosSelect();
        
        console.log('✅ Estados carregados:', estadosBrasil.estados.length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar estados:', error);
        // Fallback para não quebrar a interface
        const estadoSelect = document.getElementById('estadoSede');
        estadoSelect.innerHTML = '<option value="GO">Goiás (fallback)</option>';
    }
}

/**
 * Populate states select
 */
function populateEstadosSelect() {
    const estadoSelect = document.getElementById('estadoSede');
    estadoSelect.innerHTML = '';
    
    estadosBrasil.estados.forEach(estado => {
        const option = document.createElement('option');
        option.value = estado.codigo;
        option.textContent = `${estado.nome} (${estado.codigo})`;
        estadoSelect.appendChild(option);
    });
}

/**
 * Load current configuration
 */
async function loadCurrentConfig() {
    try {
        // Wait for regime manager to load aliquotas
        if (regimeManager.regimeAliquotas === null) {
            console.log('⏳ Aguardando carregamento das alíquotas...');
            // Wait a bit for aliquotas to load
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const config = regimeManager.getCompanyConfig();
        const summary = regimeManager.getConfigSummary();
        
        // Display current configuration
        displayCurrentConfig(summary);
        
        // Populate form with current values
        document.getElementById('regimeTributario').value = config.regime_tributario;
        document.getElementById('tipoEmpresa').value = config.tipo_empresa;
        document.getElementById('estadoSede').value = config.estado_sede;
        document.getElementById('inscricaoEstadual').checked = config.inscricao_estadual;
        
        // Simples Nacional specific fields
        if (config.regime_tributario === 'simples_nacional') {
            document.getElementById('simplesAnexo').value = config.simples_config.anexo;
            document.getElementById('simplesFaixa').value = config.simples_config.faixa_faturamento;
            showSimplesConfig(true);
        }
        
        console.log('✅ Configuração atual carregada');
        
    } catch (error) {
        console.error('❌ Erro ao carregar configuração atual:', error);
        showAlert('Erro ao carregar configuração atual.', 'warning');
    }
}

/**
 * Display current configuration summary
 */
function displayCurrentConfig(summary) {
    const container = document.getElementById('currentConfigDisplay');
    
    const regime = summary.regime_tributario;
    const tipo = summary.tipo_empresa;
    const estado = summary.estado_sede;
    
    container.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>Regime:</strong> ${getRegimeDisplayName(regime)}</p>
                <p><strong>Tipo:</strong> ${getTipoEmpresaDisplayName(tipo)}</p>
                <p><strong>Estado:</strong> ${getEstadoDisplayName(estado)}</p>
            </div>
            <div class="col-md-6">
                <p><strong>Créditos Disponíveis:</strong></p>
                <div class="small">
                    ${Object.entries(summary.creditos_disponiveis).map(([key, value]) => 
                        `<span class="badge bg-${value === '✅' ? 'success' : 'secondary'} me-1">${key.toUpperCase()}: ${value}</span>`
                    ).join('')}
                </div>
            </div>
        </div>
        
        ${summary.simples_config ? `
            <div class="alert alert-info small mt-2 mb-0">
                <i class="bi bi-info-circle"></i>
                Simples Nacional - Anexo ${summary.simples_config.anexo}, Faixa ${summary.simples_config.faixa_faturamento}
            </div>
        ` : ''}
        
        <div class="text-muted small mt-2">
            <i class="bi bi-clock"></i> Atualizado em: ${new Date(summary.atualizado_em).toLocaleString('pt-BR')}
        </div>
    `;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Regime change
    document.getElementById('regimeTributario').addEventListener('change', function() {
        const regime = this.value;
        showSimplesConfig(regime === 'simples_nacional');
        updatePreviews();
    });
    
    // Company type change
    document.getElementById('tipoEmpresa').addEventListener('change', updatePreviews);
    
    // Simples config changes
    document.getElementById('simplesAnexo').addEventListener('change', updatePreviews);
    document.getElementById('simplesFaixa').addEventListener('change', updatePreviews);
    
    // Form submit
    document.getElementById('regimeConfigForm').addEventListener('submit', handleFormSubmit);
}

/**
 * Show/hide Simples Nacional configuration
 */
function showSimplesConfig(show) {
    const simplesConfig = document.getElementById('simplesConfig');
    simplesConfig.style.display = show ? 'block' : 'none';
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const config = {
            regime_tributario: document.getElementById('regimeTributario').value,
            tipo_empresa: document.getElementById('tipoEmpresa').value,
            estado_sede: document.getElementById('estadoSede').value,
            inscricao_estadual: document.getElementById('inscricaoEstadual').checked,
            substituto_tributario: false, // Default for now
            contribuinte_ipi: false // Will be set by manager based on tipo_empresa
        };
        
        // Simples Nacional specific config
        if (config.regime_tributario === 'simples_nacional') {
            config.simples_config = {
                anexo: document.getElementById('simplesAnexo').value,
                faixa_faturamento: parseInt(document.getElementById('simplesFaixa').value),
                receita_bruta_anual: 0,
                sublimite_icms: false
            };
        }
        
        // Update configuration
        regimeManager.updateConfig(config);
        
        // If Simples, configure specific settings
        if (config.regime_tributario === 'simples_nacional') {
            regimeManager.configureSimplesNacional(
                config.simples_config.anexo,
                config.simples_config.faixa_faturamento
            );
        }
        
        // Reload current configuration
        await loadCurrentConfig();
        updatePreviews();
        
        showAlert('Configuração salva com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao salvar configuração:', error);
        showAlert('Erro ao salvar configuração: ' + error.message, 'danger');
    }
}

/**
 * Update credit and sales tax previews
 */
function updatePreviews() {
    if (!regimeManager || !regimeManager.regimeAliquotas) {
        return;
    }
    
    try {
        // Get form values for preview
        const regime = document.getElementById('regimeTributario').value;
        const tipo = document.getElementById('tipoEmpresa').value;
        
        // Update company type temporarily for preview
        const originalTipo = regimeManager.config.company_settings.tipo_empresa;
        regimeManager.config.company_settings.tipo_empresa = tipo;
        
        // Get credits and sales tax for preview
        const credits = regimeManager.getApplicableCredits(regime);
        const salesTax = regimeManager.getSalesTaxRates(regime);
        
        // Restore original type
        regimeManager.config.company_settings.tipo_empresa = originalTipo;
        
        // Update credits preview
        updateCreditsPreview(credits);
        
        // Update sales tax preview
        updateSalesTaxPreview(salesTax);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar previews:', error);
    }
}

/**
 * Update credits preview
 */
function updateCreditsPreview(credits) {
    const container = document.getElementById('creditsPreview');
    
    container.innerHTML = `
        <div class="small">
            <div class="d-flex justify-content-between mb-1">
                <span>ICMS:</span>
                <span class="badge bg-${credits.icms ? 'success' : 'secondary'}">${credits.icms ? 'Sim' : 'Não'}</span>
            </div>
            <div class="d-flex justify-content-between mb-1">
                <span>IPI:</span>
                <span class="badge bg-${credits.ipi ? 'success' : 'secondary'}">${credits.ipi ? 'Sim' : 'Não'}</span>
            </div>
            <div class="d-flex justify-content-between mb-1">
                <span>PIS:</span>
                <span class="badge bg-${credits.pis ? 'success' : 'secondary'}">${credits.pis ? 'Sim' : 'Não'}</span>
            </div>
            <div class="d-flex justify-content-between mb-1">
                <span>COFINS:</span>
                <span class="badge bg-${credits.cofins ? 'success' : 'secondary'}">${credits.cofins ? 'Sim' : 'Não'}</span>
            </div>
        </div>
        
        <hr class="my-2">
        
        <div class="small text-muted">
            <strong>Regime:</strong> ${getRegimeDisplayName(credits.regime)}<br>
            <strong>Tipo:</strong> ${getTipoEmpresaDisplayName(credits.tipo_empresa)}
        </div>
    `;
}

/**
 * Update sales tax preview
 */
function updateSalesTaxPreview(salesTax) {
    const container = document.getElementById('salesTaxPreview');
    
    if (salesTax.regime === 'simples_nacional') {
        container.innerHTML = `
            <div class="small">
                <div class="d-flex justify-content-between mb-1">
                    <span>DAS:</span>
                    <span class="badge bg-primary">${salesTax.das}%</span>
                </div>
                <div class="text-muted small">
                    PIS/COFINS/ICMS inclusos no DAS
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="small">
                <div class="d-flex justify-content-between mb-1">
                    <span>PIS:</span>
                    <span class="badge bg-primary">${salesTax.pis}%</span>
                </div>
                <div class="d-flex justify-content-between mb-1">
                    <span>COFINS:</span>
                    <span class="badge bg-primary">${salesTax.cofins}%</span>
                </div>
                <div class="text-muted small">
                    ${salesTax.cumulatividade}
                </div>
            </div>
        `;
    }
}

/**
 * Reset configuration to default
 */
function resetToDefault() {
    if (confirm('Deseja restaurar a configuração padrão? Isso irá sobrescrever as configurações atuais.')) {
        try {
            regimeManager.resetToDefault();
            loadCurrentConfig();
            updatePreviews();
            showAlert('Configuração restaurada para padrão.', 'info');
        } catch (error) {
            console.error('❌ Erro ao restaurar padrão:', error);
            showAlert('Erro ao restaurar configuração padrão.', 'danger');
        }
    }
}

/**
 * Export configuration
 */
function exportConfig() {
    try {
        regimeManager.exportConfig();
        showAlert('Configuração exportada com sucesso!', 'success');
    } catch (error) {
        console.error('❌ Erro ao exportar:', error);
        showAlert('Erro ao exportar configuração.', 'danger');
    }
}

/**
 * Import configuration
 */
function importConfig(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            regimeManager.importConfig(data);
            loadCurrentConfig();
            updatePreviews();
            showAlert('Configuração importada com sucesso!', 'success');
        } catch (error) {
            console.error('❌ Erro ao importar:', error);
            showAlert('Erro ao importar configuração: ' + error.message, 'danger');
        }
    };
    reader.readAsText(file);
}

/**
 * Helper functions
 */
function getRegimeDisplayName(regime) {
    const names = {
        'lucro_real': 'Lucro Real',
        'lucro_presumido': 'Lucro Presumido',
        'simples_nacional': 'Simples Nacional'
    };
    return names[regime] || regime;
}

function getTipoEmpresaDisplayName(tipo) {
    const names = {
        'comercio': 'Comércio',
        'industria': 'Indústria',
        'servicos': 'Serviços',
        'misto': 'Misto'
    };
    return names[tipo] || tipo;
}

function getEstadoDisplayName(codigo) {
    if (!estadosBrasil) return codigo;
    const estado = estadosBrasil.estados.find(e => e.codigo === codigo);
    return estado ? `${estado.nome} (${estado.codigo})` : codigo;
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;
    
    const alertId = 'alert_' + Date.now();
    
    const alertElement = document.createElement('div');
    alertElement.id = alertId;
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alertElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        const element = document.getElementById(alertId);
        if (element) {
            element.remove();
        }
    }, 5000);
}