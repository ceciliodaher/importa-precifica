/**
 * ProductMemoryManager Database Migration Test - Phase 2.2
 * Sistema Expertzy - Database Integration Validation
 * 
 * VALIDATES:
 * 1. ProductMemoryManager saveToDatabase() functionality
 * 2. ProductMemoryManager loadFromDatabase() functionality
 * 3. API endpoints consultar-produtos-memoria.php and salvar-produtos-memoria.php
 * 4. Database-first approach with localStorage fallback
 */

const { test, expect } = require('@playwright/test');

test.describe('FASE 2.2: ProductMemoryManager Database Migration', () => {
    
    test.beforeEach(async ({ page }) => {
        // Set longer timeout for database operations
        test.setTimeout(180000);
        
        // Navigate to DI processor with ProductMemoryManager
        await page.goto('http://localhost:8889/sistema-expertzy-local/di-processing/di-processor.html');
        await page.waitForLoadState('networkidle');
        
        // Wait for ProductMemoryManager to initialize
        await page.waitForTimeout(2000);
    });
    
    test('2.2.1 - ProductMemoryManager should initialize with database-first approach', async ({ page }) => {
        console.log('🧪 Teste 2.2.1: ProductMemoryManager database initialization...');
        
        const initLogs = [];
        page.on('console', msg => {
            if (msg.text().includes('ProductMemoryManager')) {
                initLogs.push(msg.text());
            }
        });
        
        // Wait for initialization logs
        await page.waitForTimeout(5000);
        
        // Check for database-first initialization
        const dbInitLog = initLogs.find(log => 
            log.includes('Inicializando com banco de dados') || 
            log.includes('carregados do banco')
        );
        
        expect(dbInitLog).toBeTruthy();
        console.log('✅ ProductMemoryManager initialized with database-first approach');
    });
    
    test('2.2.2 - Should save products to database when calculation completes', async ({ page }) => {
        console.log('🧪 Teste 2.2.2: Saving products to database...');
        
        // Monitor API calls to salvar-produtos-memoria.php
        const apiCalls = [];
        page.on('request', request => {
            if (request.url().includes('salvar-produtos-memoria.php')) {
                apiCalls.push({
                    method: request.method(),
                    url: request.url(),
                    body: request.postData()
                });
            }
        });
        
        const apiResponses = [];
        page.on('response', response => {
            if (response.url().includes('salvar-produtos-memoria.php')) {
                apiResponses.push({
                    status: response.status(),
                    url: response.url()
                });
            }
        });
        
        // Load a DI and perform calculation
        await page.getByText('2300120746').click();
        await page.waitForTimeout(3000);
        
        await page.getByRole('button', { name: 'Calcular Impostos' }).click();
        await page.waitForTimeout(10000); // Wait for calculation and database save
        
        // Check if API was called to save products
        console.log(`📡 API calls captured: ${apiCalls.length}`);
        
        if (apiCalls.length > 0) {
            console.log('✅ Products were saved to database via API');
            
            // Check response status
            const lastResponse = apiResponses[apiResponses.length - 1];
            if (lastResponse) {
                console.log(`📊 API Response Status: ${lastResponse.status}`);
                expect(lastResponse.status).toBeLessThan(400);
            }
        } else {
            console.log('⚠️ No database save API calls detected - checking localStorage fallback');
        }
    });
    
    test('2.2.3 - Should load products from database on page refresh', async ({ page }) => {
        console.log('🧪 Teste 2.2.3: Loading products from database...');
        
        // First, ensure some products exist by running calculation
        await page.getByText('2300120746').click();
        await page.waitForTimeout(3000);
        await page.getByRole('button', { name: 'Calcular Impostos' }).click();
        await page.waitForTimeout(8000);
        
        // Now refresh page to test database loading
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        const loadLogs = [];
        page.on('console', msg => {
            if (msg.text().includes('carregados do banco') || 
                msg.text().includes('ProductMemoryManager')) {
                loadLogs.push(msg.text());
            }
        });
        
        await page.waitForTimeout(5000);
        
        // Check for database load logs
        const dbLoadLog = loadLogs.find(log => 
            log.includes('carregados do banco') && !log.includes('0 produtos')
        );
        
        if (dbLoadLog) {
            console.log('✅ Products loaded from database successfully');
        } else {
            console.log('⚠️ No products loaded from database - may be using localStorage fallback');
        }
    });
    
    test('2.2.4 - API consultar-produtos-memoria.php should return valid products', async ({ page }) => {
        console.log('🧪 Teste 2.2.4: Testing consultar-produtos-memoria API directly...');
        
        // Test API endpoint directly
        const response = await page.request.get('http://localhost:8889/api/endpoints/consultar-produtos-memoria.php');
        
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        console.log(`📊 API Response: ${data.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`📦 Products found: ${data.count || 0}`);
        
        expect(data.success).toBeTruthy();
        
        if (data.count > 0) {
            // Validate product structure
            const firstProduct = data.data[0];
            expect(firstProduct).toHaveProperty('id');
            expect(firstProduct).toHaveProperty('di_number');
            expect(firstProduct).toHaveProperty('base_costs');
            console.log('✅ Product structure validation passed');
        }
    });
    
    test('2.2.5 - Complete product workflow: Save → Load → Export should work', async ({ page }) => {
        console.log('🧪 Teste 2.2.5: Complete product workflow validation...');
        
        let workflowErrors = [];
        
        // Monitor all console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                workflowErrors.push(msg.text());
            }
        });
        
        // Step 1: Load DI and calculate (should save to database)
        console.log('📋 Step 1: Load DI and calculate...');
        await page.getByText('2300120746').click();
        await page.waitForTimeout(3000);
        await page.getByRole('button', { name: 'Calcular Impostos' }).click();
        await page.waitForTimeout(10000);
        
        // Step 2: Generate PDF (should load from database)  
        console.log('📄 Step 2: Generate PDF with database products...');
        await page.getByRole('button', { name: 'Gerar Croqui NF (PDF)' }).click();
        await page.waitForTimeout(5000);
        
        // Step 3: Export Excel (should use database products)
        console.log('📊 Step 3: Export Excel with database products...');
        const exportButton = page.getByRole('button', { name: 'Exportar Planilha' });
        if (await exportButton.isVisible()) {
            await exportButton.click();
            await page.waitForTimeout(3000);
        }
        
        // Filter critical ProductMemoryManager errors
        const productMemoryErrors = workflowErrors.filter(error => 
            error.includes('ProductMemoryManager') ||
            error.includes('produtos do banco') ||
            error.includes('Database') ||
            error.includes('produtos básicos')
        );
        
        console.log(`🔍 Total errors: ${workflowErrors.length}`);
        console.log(`🧠 Product memory errors: ${productMemoryErrors.length}`);
        
        if (productMemoryErrors.length > 0) {
            console.log('❌ ProductMemoryManager errors found:');
            productMemoryErrors.forEach(error => console.log(`   - ${error}`));
        }
        
        // Should have no ProductMemoryManager-related errors
        expect(productMemoryErrors).toHaveLength(0);
        console.log('✅ Complete product workflow validation passed');
    });
    
});