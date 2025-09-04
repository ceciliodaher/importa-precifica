/**
 * PricingEngine.js - Phase 2: Pricing Strategy Engine
 * 
 * Handles business pricing analysis and optimization
 * Focused ONLY on pricing strategies, NOT compliance
 * Works with processed DI data from Phase 1
 */

class PricingEngine {
    constructor() {
        this.diData = null;
        this.scenarios = [];
        this.pricingRules = {};
        this.marketAnalysis = {};
        this.configurations = {};
        this.configLoader = new ConfigLoader();
    }

    /**
     * Load processed DI data from Phase 1
     * @param {Object} processedDI - Data from DI Processor
     */
    async loadProcessedDI(processedDI) {
        console.log('📊 PricingEngine: Carregando dados da DI processada...');
        
        // Initialize configurations
        await this.configLoader.loadAll();
        
        if (!processedDI || !processedDI.calculoImpostos) {
            throw new Error('Dados da DI devem ser processados na Fase 1 antes da precificação');
        }
        
        this.diData = { ...processedDI };
        console.log('✅ Dados da DI carregados para análise de preços');
        
        return this.diData;
    }

    /**
     * Configure pricing rules and parameters
     */
    configurePricingRules(rules) {
        console.log('⚙️ Configurando regras de precificação...');
        
        this.pricingRules = {
            // Customer segments
            customer_types: rules.customer_types || {
                final_consumer: { markup_min: 30, markup_max: 50, tax_regime: 'normal' },
                reseller: { markup_min: 15, markup_max: 25, tax_regime: 'substitution' },
                industry: { markup_min: 10, markup_max: 20, tax_regime: 'normal' }
            },
            
            // Market positioning
            positioning: rules.positioning || {
                premium: { markup_factor: 1.5, quality_score: 95 },
                standard: { markup_factor: 1.0, quality_score: 80 },
                competitive: { markup_factor: 0.8, quality_score: 70 }
            },
            
            // Volume discounts
            volume_breaks: rules.volume_breaks || [
                { min_qty: 1, max_qty: 10, discount: 0 },
                { min_qty: 11, max_qty: 50, discount: 5 },
                { min_qty: 51, max_qty: 100, discount: 10 },
                { min_qty: 101, max_qty: null, discount: 15 }
            ],
            
            // Payment terms
            payment_terms: rules.payment_terms || {
                cash: { discount: 3 },
                '30_days': { discount: 0 },
                '60_days': { increase: 2 },
                '90_days': { increase: 4 }
            }
        };
        
        console.log('✅ Regras de precificação configuradas');
    }

    /**
     * Generate pricing scenarios for multiple states
     */
    generateStateScenarios() {
        console.log('🗺️ Gerando cenários por estado...');
        
        if (!this.diData) {
            throw new Error('Carregue os dados da DI primeiro');
        }
        
        const states = ['GO', 'SC', 'ES', 'MG', 'SP'];
        const scenarios = [];
        
        states.forEach(state => {
            const scenario = this.calculateStateScenario(state);
            scenarios.push(scenario);
        });
        
        // Sort by best total cost
        scenarios.sort((a, b) => a.totals.total_cost - b.totals.total_cost);
        
        this.scenarios = scenarios;
        console.log('✅ Cenários gerados para todos os estados');
        
        return scenarios;
    }

    /**
     * Calculate scenario for specific state
     */
    calculateStateScenario(state) {
        const baseCalculation = { ...this.diData.calculoImpostos };
        
        // Use ICMS rate from aliquotas.json (correct rates)
        const icmsRate = await this.configLoader.getICMSRate(state);
        const baseICMS = baseCalculation.impostos.icms.base_calculo_antes;
        const newICMSValue = (baseICMS / (1 - icmsRate/100)) - baseICMS;
        
        // Apply state benefits
        const benefits = this.calculateStateBenefits(state, baseCalculation.ncm, newICMSValue);
        
        const scenario = {
            state: state,
            state_name: this.getStateName(state),
            
            // Tax calculation
            taxes: {
                ii: baseCalculation.impostos.ii.valor_devido,
                ipi: baseCalculation.impostos.ipi.valor_devido,
                pis: baseCalculation.impostos.pis.valor_devido,
                cofins: baseCalculation.impostos.cofins.valor_devido,
                icms_nominal: newICMSValue,
                icms_effective: newICMSValue - this.validateTaxSavings(benefits),
                total_taxes: baseCalculation.totais.total_impostos - baseCalculation.impostos.icms.valor_devido + newICMSValue - this.validateTaxSavings(benefits)
            },
            
            // Benefits
            benefits: benefits,
            
            // Totals
            totals: {
                cif_cost: baseCalculation.valores_base.cif_brl,
                total_cost: 0, // Will be calculated below
                cost_per_kg: 0,
                competitiveness_score: 0
            }
        };
        
        // Calculate totals
        scenario.totals.total_cost = 
            scenario.totals.cif_cost + 
            scenario.taxes.total_taxes + 
            this.validateExpenseTotal(baseCalculation.despesas);
            
        const pesoLiquido = this.validateWeight(baseCalculation.valores_base.peso_liquido);
        scenario.totals.cost_per_kg = scenario.totals.total_cost / pesoLiquido;
        
        // Calculate competitiveness (lower cost = higher score)
        scenario.totals.competitiveness_score = this.calculateCompetitivenessScore(scenario.totals.total_cost);
        
        return scenario;
    }

    /**
     * Calculate state-specific fiscal benefits
     */
    calculateStateBenefits(state, ncm, icmsValue) {
        // Use benefits from beneficios.json (existing configuration)
        const rule = this.configLoader.getBenefits(state, ncm);
        if (!rule || rule.type === 'none') {
            return {
                applicable: false,
                name: rule?.name || 'Sem benefícios',
                description: rule?.description || 'Tributação padrão',
                tax_savings: 0,
                effective_rate: null
            };
        }
        
        // Check if NCM is eligible
        const ncmEligible = rule.applicable_ncms.some(eligible => ncm.startsWith(eligible));
        if (!ncmEligible) {
            return {
                applicable: false,
                name: rule.name,
                description: 'NCM não contemplado no benefício',
                tax_savings: 0,
                effective_rate: null
            };
        }
        
        let taxSavings = 0;
        let effectiveRate = null;
        
        switch (rule.type) {
            case 'credit':
                taxSavings = icmsValue * (rule.rate / 100);
                effectiveRate = 100 - rule.rate;
                break;
                
            case 'deferral':
                taxSavings = icmsValue * (rule.rate / 100); // For cash flow purposes
                effectiveRate = 100 - rule.rate;
                break;
                
            case 'reduction':
                const currentRate = 17; // Assume 17% standard
                taxSavings = icmsValue * ((currentRate - rule.effective_rate) / currentRate);
                effectiveRate = rule.effective_rate;
                break;
        }
        
        return {
            applicable: true,
            name: rule.name,
            type: rule.type,
            description: rule.description,
            tax_savings: taxSavings,
            effective_rate: effectiveRate,
            cash_flow_benefit: rule.type === 'deferral' ? taxSavings : 0
        };
    }

    /**
     * Generate pricing recommendations
     */
    generatePricingRecommendations(targetState, customerType = 'reseller') {
        console.log('💰 Gerando recomendações de preço...');
        
        if (!this.scenarios.length) {
            throw new Error('Execute a análise de cenários primeiro');
        }
        
        const scenario = this.scenarios.find(s => s.state === targetState);
        if (!scenario) {
            throw new Error(`Cenário não encontrado para estado ${targetState}`);
        }
        
        const customerRule = this.pricingRules.customer_types[customerType] || this.pricingRules.customer_types.reseller;
        const baseMarkups = [customerRule.markup_min, (customerRule.markup_min + customerRule.markup_max) / 2, customerRule.markup_max];
        
        const recommendations = baseMarkups.map((markup, index) => {
            const positioningNames = ['competitive', 'standard', 'premium'];
            const positioning = positioningNames[index];
            const positioningRule = this.pricingRules.positioning[positioning];
            
            const adjustedMarkup = markup * positioningRule.markup_factor;
            const sellPrice = scenario.totals.total_cost * (1 + adjustedMarkup / 100);
            const grossProfit = sellPrice - scenario.totals.total_cost;
            const grossMargin = (grossProfit / sellPrice) * 100;
            
            return {
                positioning: positioning,
                positioning_name: this.getPositioningName(positioning),
                markup_percent: adjustedMarkup,
                cost_base: scenario.totals.total_cost,
                sell_price: sellPrice,
                gross_profit: grossProfit,
                gross_margin: grossMargin,
                quality_score: positioningRule.quality_score,
                recommended: index === 1 // Middle option as default recommendation
            };
        });
        
        // Add volume pricing
        recommendations.forEach(rec => {
            rec.volume_pricing = this.calculateVolumePricing(rec.sell_price);
        });
        
        return {
            state: targetState,
            customer_type: customerType,
            base_scenario: scenario,
            recommendations: recommendations,
            market_analysis: this.generateMarketAnalysis(recommendations),
            generated_at: new Date().toISOString()
        };
    }

    /**
     * Calculate volume pricing tiers
     */
    calculateVolumePricing(basePrice) {
        return this.pricingRules.volume_breaks.map(tier => ({
            min_quantity: tier.min_qty,
            max_quantity: tier.max_qty,
            discount_percent: tier.discount,
            unit_price: basePrice * (1 - tier.discount / 100),
            tier_name: this.getVolumeTierName(tier.min_qty)
        }));
    }

    /**
     * Generate market analysis insights
     */
    generateMarketAnalysis(recommendations) {
        const standardRec = recommendations.find(r => r.positioning === 'standard');
        
        return {
            competitive_position: this.analyzeCompetitivePosition(standardRec.sell_price),
            price_sensitivity: this.analyzePriceSensitivity(recommendations),
            profit_optimization: this.analyzeProfitOptimization(recommendations),
            risk_assessment: this.assessPricingRisk(recommendations)
        };
    }

    /**
     * Compare scenarios across all states
     */
    compareAllScenarios() {
        console.log('🔍 Comparando cenários entre estados...');
        
        if (!this.scenarios.length) {
            this.generateStateScenarios();
        }
        
        const comparison = {
            best_cost: this.scenarios[0], // Already sorted by cost
            best_benefits: this.findBestBenefitsScenario(),
            summary: this.scenarios.map(scenario => ({
                state: scenario.state,
                state_name: scenario.state_name,
                total_cost: scenario.totals.total_cost,
                tax_savings: this.validateTaxSavings(scenario.benefits),
                competitiveness: scenario.totals.competitiveness_score,
                recommended: scenario.state === this.scenarios[0].state
            })),
            analysis: this.generateComparisonAnalysis()
        };
        
        return comparison;
    }

    /**
     * Find scenario with best fiscal benefits
     */
    findBestBenefitsScenario() {
        return this.scenarios.reduce((best, current) => {
            const currentSavings = this.validateTaxSavings(current.benefits);
            const bestSavings = this.validateTaxSavings(best.benefits);
            return currentSavings > bestSavings ? current : best;
        });
    }

    /**
     * Generate analysis of scenario comparison
     */
    generateComparisonAnalysis() {
        const costs = this.scenarios.map(s => s.totals.total_cost);
        const savings = this.scenarios.map(s => this.validateTaxSavings(s.benefits));
        
        return {
            cost_variation: {
                min: Math.min(...costs),
                max: Math.max(...costs),
                difference: Math.max(...costs) - Math.min(...costs),
                percentage: ((Math.max(...costs) - Math.min(...costs)) / Math.min(...costs)) * 100
            },
            savings_potential: {
                max_savings: Math.max(...savings),
                total_states_with_benefits: savings.filter(s => s > 0).length,
                average_savings: savings.reduce((a, b) => a + b, 0) / savings.length
            },
            recommendations: this.generateStrategicRecommendations()
        };
    }

    /**
     * Generate strategic recommendations
     */
    generateStrategicRecommendations() {
        const bestCost = this.scenarios[0];
        const bestBenefits = this.findBestBenefitsScenario();
        
        const recommendations = [];
        
        // Cost optimization
        recommendations.push({
            type: 'cost_optimization',
            title: 'Menor Custo Total',
            state: bestCost.state,
            description: `${bestCost.state_name} oferece o menor custo total de R$ ${bestCost.totals.total_cost.toFixed(2)}`,
            impact: 'high',
            implementation: 'immediate'
        });
        
        // Benefits optimization
        if (bestBenefits.benefits.applicable) {
            recommendations.push({
                type: 'benefit_optimization',
                title: 'Maiores Benefícios Fiscais',
                state: bestBenefits.state,
                description: `${bestBenefits.state_name} oferece economia de R$ ${bestBenefits.benefits.tax_savings.toFixed(2)} com ${bestBenefits.benefits.name}`,
                impact: 'medium',
                implementation: 'requires_compliance'
            });
        }
        
        // Strategic considerations
        if (bestCost.state !== bestBenefits.state) {
            recommendations.push({
                type: 'strategic_decision',
                title: 'Análise Estratégica Necessária',
                description: 'Avaliar entre menor custo imediato vs. benefícios fiscais de longo prazo',
                impact: 'high',
                implementation: 'strategic_planning'
            });
        }
        
        return recommendations;
    }

    /**
     * Utility functions
     */
    getStateName(code) {
        const states = {
            'GO': 'Goiás', 'SC': 'Santa Catarina', 'ES': 'Espírito Santo',
            'MG': 'Minas Gerais', 'SP': 'São Paulo'
        };
        return states[code] || code;
    }

    getPositioningName(code) {
        const names = {
            'competitive': 'Competitivo', 'standard': 'Padrão', 'premium': 'Premium'
        };
        return names[code] || code;
    }

    getVolumeTierName(minQty) {
        if (minQty === 1) return 'Varejo';
        if (minQty <= 10) return 'Pequeno';
        if (minQty <= 50) return 'Médio';
        return 'Atacado';
    }

    calculateCompetitivenessScore(cost) {
        // Simplified competitiveness scoring
        // Lower cost = higher score (0-100)
        const referenceCost = 10000; // Reference value
        return Math.max(0, Math.min(100, 100 - ((cost - referenceCost) / referenceCost) * 50));
    }

    analyzeCompetitivePosition(price) {
        // Simplified competitive analysis
        const marketReference = 15000; // Assumed market reference
        const position = price / marketReference;
        
        if (position < 0.9) return { level: 'very_competitive', description: 'Muito competitivo' };
        if (position < 1.1) return { level: 'competitive', description: 'Competitivo' };
        if (position < 1.3) return { level: 'premium', description: 'Premium' };
        return { level: 'expensive', description: 'Alto' };
    }

    analyzePriceSensitivity(recommendations) {
        const priceRange = Math.max(...recommendations.map(r => r.sell_price)) - Math.min(...recommendations.map(r => r.sell_price));
        const avgPrice = recommendations.reduce((sum, r) => sum + r.sell_price, 0) / recommendations.length;
        
        return {
            sensitivity: priceRange / avgPrice,
            level: priceRange / avgPrice > 0.3 ? 'high' : 'medium',
            description: priceRange / avgPrice > 0.3 ? 'Alta sensibilidade ao preço' : 'Sensibilidade moderada'
        };
    }

    analyzeProfitOptimization(recommendations) {
        const bestMargin = Math.max(...recommendations.map(r => r.gross_margin));
        const bestMarginRec = recommendations.find(r => r.gross_margin === bestMargin);
        
        return {
            optimal_positioning: bestMarginRec.positioning,
            optimal_margin: bestMargin,
            description: `Posicionamento ${bestMarginRec.positioning_name} oferece melhor margem`
        };
    }

    assessPricingRisk(recommendations) {
        const competitiveRec = recommendations.find(r => r.positioning === 'competitive');
        const premiumRec = recommendations.find(r => r.positioning === 'premium');
        
        const riskFactors = [];
        
        if (competitiveRec.gross_margin < 20) {
            riskFactors.push('Margem baixa no posicionamento competitivo');
        }
        
        if (premiumRec.sell_price > 20000) {
            riskFactors.push('Preço premium pode limitar demanda');
        }
        
        return {
            level: riskFactors.length > 1 ? 'high' : riskFactors.length === 1 ? 'medium' : 'low',
            factors: riskFactors,
            recommendations: riskFactors.length > 0 ? ['Considerar posicionamento padrão', 'Analisar elasticidade de demanda'] : ['Estratégia de preços balanceada']
        };
    }

    /**
     * Validation methods for strict fiscal calculations
     */
    validateTaxSavings(benefits) {
        if (!benefits || typeof benefits.tax_savings === 'undefined') {
            throw new Error('Benefícios fiscais não calculados - obrigatório para análise de precificação');
        }
        return benefits.tax_savings;
    }

    validateExpenseTotal(despesas) {
        if (!despesas || typeof despesas.total_custos === 'undefined') {
            throw new Error('Total de despesas não disponível - obrigatório para cálculo de custo');
        }
        return despesas.total_custos;
    }

    validateWeight(pesoLiquido) {
        if (!pesoLiquido || pesoLiquido <= 0) {
            throw new Error('Peso líquido inválido - obrigatório para cálculo de custo por kg');
        }
        return pesoLiquido;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PricingEngine;
}