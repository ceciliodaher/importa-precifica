/**
 * Index Controller - Sistema Expertzy
 * Controla a página inicial e detecção de status do banco de dados
 */

class IndexController {
    constructor() {
        this.isLoading = false;
        this.dbStats = null;
        this.init();
    }

    async init() {
        await this.checkDatabaseStatus();
        this.attachEventListeners();
    }

    /**
     * Verifica status do banco de dados
     */
    async checkDatabaseStatus() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            const response = await fetch('xml-import/api/stats.php');
            const stats = await response.json();
            
            this.dbStats = stats;
            const hasData = stats.total_dis && stats.total_dis > 0;
            
            this.updateDatabaseStatus(hasData, stats);
            this.updateSystemButtons(hasData);
            
        } catch (error) {
            console.warn('Could not check database status:', error);
            this.handleConnectionError();
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }

    /**
     * Atualiza status visual do banco
     */
    updateDatabaseStatus(hasData, stats) {
        const emptyAlert = document.getElementById('emptyDatabaseAlert');
        const populatedAlert = document.getElementById('populatedDatabaseAlert');
        
        if (hasData) {
            emptyAlert?.classList.add('d-none');
            populatedAlert?.classList.remove('d-none');
            
            // Update stats text
            const statsText = `${stats.total_dis} DIs, ${stats.total_adicoes} adições processadas.`;
            const dbStatsElement = document.getElementById('dbStats');
            if (dbStatsElement) {
                dbStatsElement.textContent = statsText;
            }
            
            // Store in localStorage for other modules
            localStorage.setItem('expertzy_db_populated', 'true');
            localStorage.setItem('expertzy_db_stats', JSON.stringify(stats));
        } else {
            emptyAlert?.classList.remove('d-none');
            populatedAlert?.classList.add('d-none');
            
            localStorage.removeItem('expertzy_db_populated');
            localStorage.removeItem('expertzy_db_stats');
        }
    }

    /**
     * Atualiza botões do sistema baseado no status do banco
     */
    updateSystemButtons(hasData) {
        const systemButtons = document.querySelectorAll('[href*="di-processing"]');
        
        systemButtons.forEach(btn => {
            if (hasData) {
                btn.classList.remove('disabled');
                btn.removeAttribute('tabindex');
                btn.removeAttribute('aria-disabled');
                
                // Remove click handler if exists
                btn.removeEventListener('click', this.handleDisabledClick);
            } else {
                btn.classList.add('disabled');
                btn.setAttribute('tabindex', '-1');
                btn.setAttribute('aria-disabled', 'true');
                
                // Add click handler to show import message
                btn.addEventListener('click', this.handleDisabledClick.bind(this));
            }
        });
    }

    /**
     * Handle click em botões desabilitados
     */
    handleDisabledClick(event) {
        event.preventDefault();
        this.showImportRequiredModal();
    }

    /**
     * Mostra modal de importação necessária
     */
    showImportRequiredModal() {
        const modalId = 'importRequiredModal';
        
        // Remove existing modal if present
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        const modalHTML = this.createModalHTML(modalId);
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show modal with Bootstrap
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
        
        // Clean up after modal is hidden
        modal._element.addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    /**
     * Cria HTML do modal
     */
    createModalHTML(modalId) {
        return `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title" id="${modalId}Label">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                Importação de Dados Necessária
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body">
                            <p>Para usar o sistema de processamento de DI, primeiro você precisa importar os dados XML das Declarações de Importação.</p>
                            <p class="mb-0">Clique no botão abaixo para acessar o Dashboard de Importação.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <a href="xml-import/import-dashboard.html" class="btn btn-warning">
                                <i class="bi bi-database-add"></i> Importar Dados
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Trata erro de conexão
     */
    handleConnectionError() {
        const emptyAlert = document.getElementById('emptyDatabaseAlert');
        if (emptyAlert) {
            emptyAlert.classList.remove('d-none');
        }
        
        // Show connection error in a toast
        this.showToast('Não foi possível verificar o status do banco de dados', 'warning');
    }

    /**
     * Mostra estado de carregamento
     */
    showLoadingState() {
        const statusSection = document.getElementById('dataImportStatus');
        if (statusSection) {
            statusSection.style.opacity = '0.6';
        }
    }

    /**
     * Esconde estado de carregamento
     */
    hideLoadingState() {
        const statusSection = document.getElementById('dataImportStatus');
        if (statusSection) {
            statusSection.style.opacity = '1';
        }
    }

    /**
     * Mostra toast notification
     */
    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        const toastId = 'toast-' + Date.now();
        const toastHTML = `
            <div class="toast align-items-center text-bg-${type} border-0" role="alert" id="${toastId}">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 5000
        });
        
        toast.show();

        // Clean up after toast is hidden
        toastElement.addEventListener('hidden.bs.toast', function() {
            this.remove();
        });
    }

    /**
     * Anexa event listeners
     */
    attachEventListeners() {
        // Refresh status when returning from import page
        window.addEventListener('focus', () => {
            setTimeout(() => this.checkDatabaseStatus(), 500);
        });

        // Listen for storage changes from other tabs/windows
        window.addEventListener('storage', (e) => {
            if (e.key === 'expertzy_db_populated' || e.key === 'expertzy_db_stats') {
                this.checkDatabaseStatus();
            }
        });

        // Refresh button if exists
        const refreshBtn = document.getElementById('refreshStatus');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.checkDatabaseStatus());
        }
    }

    /**
     * Força atualização do status
     */
    async forceRefresh() {
        await this.checkDatabaseStatus();
    }

    /**
     * Retorna estatísticas atuais
     */
    getStats() {
        return this.dbStats;
    }

    /**
     * Verifica se banco está populado
     */
    isDatabasePopulated() {
        return this.dbStats && this.dbStats.total_dis > 0;
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.indexController = new IndexController();
});

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndexController;
}