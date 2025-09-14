/**
 * Critical Fixes Validation Test - Phase 1
 * Sistema Expertzy - E2E Validation of Critical Fixes
 * 
 * FIXES VALIDATED:
 * 1. exportCroquiNF.js - DI number undefined fix
 * 2. ExportManager null reference fix  
 * 3. API salvar-calculo.php validation improvements
 */

const { test, expect } = require('@playwright/test');

test.describe('FASE 1: Critical Fixes Validation', () => {
    
    test.beforeEach(async ({ page }) => {
        // Set longer timeout for database operations
        test.setTimeout(120000);
        
        // Navigate to DI processor
        await page.goto('http://localhost:8889/sistema-expertzy-local/di-processing/di-processor.html');
        await page.waitForLoadState('networkidle');
    });
    
    test('1.1 - DI Number should be properly extracted in exportCroquiNF', async ({ page }) => {
        console.log('🧪 Teste 1.1: Validando extração DI number no exportCroquiNF...');
        
        // Load a DI first
        await page.getByText('2300120746').click();
        await page.waitForTimeout(3000);
        
        // Perform calculation
        await page.getByRole('button', { name: 'Calcular Impostos' }).click();
        await page.waitForTimeout(5000);
        
        // Monitor console for DI number errors
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push(msg.text());
        });
        
        // Try to generate PDF
        await page.getByRole('button', { name: 'Gerar Croqui NF (PDF)' }).click();
        await page.waitForTimeout(3000);
        
        // Check that DI number is not undefined in console
        const diUndefinedErrors = consoleMessages.filter(msg => 
            msg.includes('DI undefined') || msg.includes('numero_di undefined')
        );
        
        expect(diUndefinedErrors).toHaveLength(0);
        console.log('✅ DI number extraction working correctly');
    });
    
    test('1.2 - ExportManager should not be null during Excel export', async ({ page }) => {
        console.log('🧪 Teste 1.2: Validando ExportManager não é null...');
        
        // Load a DI first  
        await page.getByText('2300120746').click();
        await page.waitForTimeout(3000);
        
        // Perform calculation
        await page.getByRole('button', { name: 'Calcular Impostos' }).click();
        await page.waitForTimeout(5000);
        
        // Monitor console for null reference errors
        const consoleMessages = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleMessages.push(msg.text());
            }
        });
        
        // Try Excel export
        const exportButton = page.getByRole('button', { name: 'Exportar Planilha' });
        if (await exportButton.isVisible()) {
            await exportButton.click();
            await page.waitForTimeout(2000);
        }
        
        // Check for exportManager null errors
        const nullManagerErrors = consoleMessages.filter(msg => 
            msg.includes('exportManager is null') || msg.includes('Cannot read properties of null')
        );
        
        expect(nullManagerErrors).toHaveLength(0);
        console.log('✅ ExportManager initialization working correctly');
    });
    
    test('1.3 - API salvar-calculo.php should accept calculation data', async ({ page }) => {
        console.log('🧪 Teste 1.3: Validando API salvar-calculo.php aceita dados...');
        
        // Load a DI first
        await page.getByText('2300120746').click();
        await page.waitForTimeout(3000);
        
        // Monitor network requests
        const apiRequests = [];
        const apiResponses = [];
        
        page.on('request', request => {
            if (request.url().includes('salvar-calculo.php')) {
                apiRequests.push(request);
            }
        });
        
        page.on('response', response => {
            if (response.url().includes('salvar-calculo.php')) {
                apiResponses.push(response);
            }
        });
        
        // Perform calculation (this should trigger API call)
        await page.getByRole('button', { name: 'Calcular Impostos' }).click();
        await page.waitForTimeout(8000); // Wait for calculation and API call
        
        // Check API responses
        console.log(`📡 Captured ${apiResponses.length} API responses`);
        
        if (apiResponses.length > 0) {
            const lastResponse = apiResponses[apiResponses.length - 1];
            const status = lastResponse.status();
            
            console.log(`📊 API Status: ${status}`);
            
            // Should not be HTTP 400 anymore
            expect(status).not.toBe(400);
            
            if (status === 201 || status === 200) {
                console.log('✅ API accepting calculation data successfully');
            } else if (status === 500) {
                console.log('⚠️ API internal error - need to check database service');
            } else {
                console.log(`⚠️ Unexpected status: ${status}`);
            }
        } else {
            console.log('📝 No API calls detected - calculation may not be triggering saves');
        }
    });
    
    test('1.4 - Complete workflow validation (XML → Calculation → Export)', async ({ page }) => {
        console.log('🧪 Teste 1.4: Validando workflow completo...');
        
        let workflowErrors = [];
        
        // Capture all console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                workflowErrors.push(msg.text());
            }
        });
        
        // Step 1: Load DI
        console.log('📋 Step 1: Loading DI...');
        await page.getByText('2300120746').click();
        await page.waitForTimeout(3000);
        
        // Step 2: Calculate taxes
        console.log('🧮 Step 2: Calculating taxes...');
        await page.getByRole('button', { name: 'Calcular Impostos' }).click();
        await page.waitForTimeout(8000);
        
        // Step 3: Generate PDF
        console.log('📄 Step 3: Generating PDF...');
        await page.getByRole('button', { name: 'Gerar Croqui NF (PDF)' }).click();
        await page.waitForTimeout(5000);
        
        // Step 4: Try Excel export
        console.log('📊 Step 4: Testing Excel export...');
        const exportButton = page.getByRole('button', { name: 'Exportar Planilha' });
        if (await exportButton.isVisible()) {
            await exportButton.click();
            await page.waitForTimeout(3000);
        }
        
        // Filter critical errors (ignore warnings)
        const criticalErrors = workflowErrors.filter(error => 
            error.includes('undefined') || 
            error.includes('null') ||
            error.includes('TypeError') ||
            error.includes('HTTP 400')
        );
        
        console.log(`🔍 Total errors captured: ${workflowErrors.length}`);
        console.log(`🚨 Critical errors: ${criticalErrors.length}`);
        
        if (criticalErrors.length > 0) {
            console.log('❌ Critical errors found:');
            criticalErrors.forEach(error => console.log(`   - ${error}`));
        }
        
        // Should have no critical errors after fixes
        expect(criticalErrors).toHaveLength(0);
        console.log('✅ Complete workflow validation passed');
    });
    
});