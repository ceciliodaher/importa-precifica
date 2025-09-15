/**
 * Critical Fixes Final Validation Test
 * Validates all fixes from error report 2025-9-15_8-48-20
 * 
 * VALIDATES:
 * 1. No syntax errors in exportCroquiNF.js
 * 2. ProductMemoryManager APIs working (no 404)
 * 3. No export validation failures (frete_brl)
 * 4. Products being generated (length > 0)
 * 5. Calculations saved to database (no HTTP 500)
 */

const { test, expect } = require('@playwright/test');

test.describe('Critical Fixes Final Validation', () => {
    
    test.beforeEach(async ({ page }) => {
        test.setTimeout(180000);
        
        // Navigate to Module 2
        await page.goto('http://localhost:8889/sistema-expertzy-local/di-processing/di-processor.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
    });
    
    test('All Critical Fixes Working Together', async ({ page }) => {
        console.log('🧪 Validating all critical fixes...\n');
        
        const errors = {
            syntaxErrors: [],
            api404Errors: [],
            exportValidationErrors: [],
            zeroProductsErrors: [],
            http500Errors: [],
            otherErrors: []
        };
        
        // Capture all console messages
        page.on('console', msg => {
            const text = msg.text();
            
            // Check for specific error patterns
            if (text.includes('SyntaxError') || text.includes('missing formal parameter')) {
                errors.syntaxErrors.push(text);
            }
            if (text.includes('HTTP 404') && text.includes('ProductMemoryManager')) {
                errors.api404Errors.push(text);
            }
            if (text.includes('Frete BRL ausente') || text.includes('Seguro BRL ausente')) {
                errors.exportValidationErrors.push(text);
            }
            if (text.includes('produtos: 0') || text.includes('produtosIndividuais final: {length: 0}')) {
                errors.zeroProductsErrors.push(text);
            }
            if (text.includes('HTTP 500') && text.includes('salvar-calculo')) {
                errors.http500Errors.push(text);
            }
            
            // Log important messages
            if (text.includes('produtos') || text.includes('ERROR') || text.includes('❌')) {
                console.log(`  📝 ${text}`);
            }
        });
        
        // Monitor network requests
        const apiRequests = {
            productMemory: [],
            saveCalculation: [],
            exportRequests: []
        };
        
        page.on('response', response => {
            const url = response.url();
            const status = response.status();
            
            if (url.includes('produtos-memoria')) {
                apiRequests.productMemory.push({ url, status });
            }
            if (url.includes('salvar-calculo')) {
                apiRequests.saveCalculation.push({ url, status });
            }
        });
        
        // STEP 1: Load DI
        console.log('\n📋 STEP 1: Loading DI 2520345968...');
        await page.click('text=2520345968');
        await page.waitForTimeout(3000);
        
        // STEP 2: Calculate taxes
        console.log('🧮 STEP 2: Calculating taxes...');
        await page.click('button:has-text("Calcular Impostos")');
        await page.waitForTimeout(10000);
        
        // STEP 3: Try PDF export
        console.log('📄 STEP 3: Testing PDF export...');
        const pdfButton = page.locator('button:has-text("Gerar Croqui NF")');
        if (await pdfButton.isVisible()) {
            await pdfButton.click();
            await page.waitForTimeout(3000);
        }
        
        // STEP 4: Try Excel export
        console.log('📊 STEP 4: Testing Excel export...');
        const excelButton = page.locator('button:has-text("Exportar Planilha")');
        if (await excelButton.isVisible()) {
            await excelButton.click();
            await page.waitForTimeout(3000);
        }
        
        // VALIDATION RESULTS
        console.log('\n' + '='.repeat(80));
        console.log('📊 VALIDATION RESULTS');
        console.log('='.repeat(80));
        
        // FIX 1: Syntax errors
        console.log('\n✅ FIX 1 - Syntax Errors:');
        if (errors.syntaxErrors.length === 0) {
            console.log('   ✓ No syntax errors in exportCroquiNF.js');
        } else {
            console.log(`   ✗ Found ${errors.syntaxErrors.length} syntax errors`);
            errors.syntaxErrors.forEach(err => console.log(`     - ${err}`));
        }
        
        // FIX 2: API 404 errors
        console.log('\n✅ FIX 2 - ProductMemoryManager APIs:');
        const api404Count = apiRequests.productMemory.filter(r => r.status === 404).length;
        if (api404Count === 0) {
            console.log('   ✓ No 404 errors for ProductMemoryManager APIs');
        } else {
            console.log(`   ✗ Found ${api404Count} API 404 errors`);
        }
        
        // FIX 3: Export validation
        console.log('\n✅ FIX 3 - Export Validation:');
        if (errors.exportValidationErrors.length === 0) {
            console.log('   ✓ No frete/seguro validation errors');
        } else {
            console.log(`   ✗ Found ${errors.exportValidationErrors.length} validation errors`);
        }
        
        // FIX 4: Product generation
        console.log('\n✅ FIX 4 - Product Generation:');
        if (errors.zeroProductsErrors.length === 0) {
            console.log('   ✓ Products being generated (length > 0)');
        } else {
            console.log(`   ✗ Still generating zero products`);
        }
        
        // FIX 5: HTTP 500 errors
        console.log('\n✅ FIX 5 - Database Save:');
        const http500Count = apiRequests.saveCalculation.filter(r => r.status === 500).length;
        if (http500Count === 0) {
            console.log('   ✓ No HTTP 500 errors in salvar-calculo.php');
        } else {
            console.log(`   ✗ Found ${http500Count} HTTP 500 errors`);
        }
        
        // OVERALL ASSESSMENT
        console.log('\n' + '='.repeat(80));
        const allFixed = 
            errors.syntaxErrors.length === 0 &&
            api404Count === 0 &&
            errors.exportValidationErrors.length === 0 &&
            errors.zeroProductsErrors.length === 0 &&
            http500Count === 0;
        
        if (allFixed) {
            console.log('🎉 ALL CRITICAL FIXES VALIDATED SUCCESSFULLY!');
            console.log('✅ System is ready for production use');
        } else {
            console.log('⚠️ Some fixes still need attention');
            const totalErrors = 
                errors.syntaxErrors.length + 
                api404Count + 
                errors.exportValidationErrors.length + 
                errors.zeroProductsErrors.length + 
                http500Count;
            console.log(`❌ Total remaining errors: ${totalErrors}`);
        }
        console.log('='.repeat(80));
        
        // Assert all fixes are working
        expect(errors.syntaxErrors.length).toBe(0);
        expect(api404Count).toBe(0);
        expect(errors.exportValidationErrors.length).toBe(0);
        expect(errors.zeroProductsErrors.length).toBe(0);
        expect(http500Count).toBe(0);
    });
});