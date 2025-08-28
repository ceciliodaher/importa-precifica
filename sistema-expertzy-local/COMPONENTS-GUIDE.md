# Guia de Componentes Expertzy - Sistema de Importação e Precificação

## Visão Geral

Este documento apresenta os componentes visuais padronizados do Sistema Expertzy, organizados de forma modular para garantir consistência visual em todas as páginas HTML.

## Estrutura CSS Modular

### Arquivos CSS Base

```
/shared/css/
├── expertzy-brand.css      # Sistema de marca e componentes base
├── compliance-theme.css    # Tema azul para Fase 1 (DI Processing)
├── business-theme.css      # Tema verde para Fase 2 (Pricing Strategy)
├── landing.css             # Estilos específicos da landing page
└── sistema.css             # Estilos legados (mantidos para compatibilidade)
```

### Como Incluir CSS nas Páginas

**Para páginas da Fase 1 (DI Processing):**
```html
<!-- Expertzy Brand System -->
<link href="../shared/css/expertzy-brand.css" rel="stylesheet">
<link href="../shared/css/compliance-theme.css" rel="stylesheet">
```

**Para páginas da Fase 2 (Pricing Strategy):**
```html
<!-- Expertzy Brand System -->
<link href="../shared/css/expertzy-brand.css" rel="stylesheet">
<link href="../shared/css/business-theme.css" rel="stylesheet">
```

**Para landing page:**
```html
<!-- Expertzy Brand System -->
<link href="css/expertzy-brand.css" rel="stylesheet">
<link href="css/landing.css" rel="stylesheet">
```

## Componentes Visuais Padrão

### 1. Sistema de Cores

#### Cores da Marca Expertzy
```css
--expertzy-red: #FF002D;          /* Vermelho principal */
--expertzy-navy: #091A30;         /* Azul marinho principal */
--expertzy-white: #FFFFFF;        /* Branco */
--expertzy-light-gray: #F8F9FA;   /* Cinza claro */
```

#### Temas Específicos

**Compliance Theme (Fase 1):**
```css
--compliance-primary: #0066cc;    /* Azul compliance */
--compliance-secondary: #004499;  /* Azul escuro */
--compliance-accent: #3399ff;     /* Azul accent */
--compliance-light: #e6f2ff;      /* Azul claro */
```

**Business Theme (Fase 2):**
```css
--business-primary: #28a745;      /* Verde business */
--business-secondary: #1e7e34;    /* Verde escuro */
--business-accent: #5cb85c;       /* Verde accent */
--business-light: #e6f7e6;        /* Verde claro */
```

### 2. Navegação Padrão

#### Navbar Principal
```html
<nav class="navbar navbar-expand-lg expertzy-navbar fixed-top">
    <div class="container">
        <a class="navbar-brand d-flex align-items-center" href="https://expertzy.com.br" target="_blank">
            <img src="../images/expertzy-it.png" alt="Expertzy - Inteligência Tributária" class="expertzy-complete-logo">
        </a>
        
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
        </button>
        
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav ms-auto align-items-center">
                <li class="nav-item">
                    <a class="nav-link text-white" href="../index.html">
                        <i class="bi bi-house"></i> Início
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link text-white" href="../di-processing/di-processor.html">
                        <i class="bi bi-file-earmark-text"></i> Processamento DI
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link text-white" href="../pricing-strategy/pricing-system.html">
                        <i class="bi bi-graph-up-arrow"></i> Precificação
                    </a>
                </li>
                <li class="nav-item">
                    <a class="btn btn-expertzy-primary ms-3" href="#action">
                        <i class="bi bi-play-fill"></i> Ação
                    </a>
                </li>
            </ul>
        </div>
    </div>
</nav>
```

**Variações do Botão de Ação:**
- Fase 1: `btn-compliance`
- Fase 2: `btn-business`
- Landing: `btn-expertzy-primary`

### 3. Headers de Página

#### Header de Compliance (Fase 1)
```html
<header class="di-processing-header">
    <div class="container">
        <div class="row align-items-center text-center">
            <div class="col-12">
                <i class="bi bi-file-earmark-text hero-icon"></i>
                <h1 class="display-4 fw-bold mb-3">Título da Página</h1>
                <p class="lead mb-4">Subtítulo explicativo</p>
                <p class="mb-0 opacity-75">Descrição • Funcionalidades • Características</p>
            </div>
        </div>
    </div>
</header>
```

#### Header de Business (Fase 2)
```html
<header class="business-processing-header">
    <div class="container">
        <div class="row align-items-center text-center">
            <div class="col-12">
                <i class="bi bi-graph-up-arrow hero-icon"></i>
                <h1 class="display-4 fw-bold mb-3">Título da Página</h1>
                <p class="lead mb-4">Subtítulo explicativo</p>
                <p class="mb-0 opacity-75">Descrição • Funcionalidades • Características</p>
            </div>
        </div>
    </div>
</header>
```

### 4. Botões

#### Botões Principais
```html
<!-- Botão primário Expertzy -->
<button class="btn btn-expertzy-primary">
    <i class="bi bi-icon"></i> Texto
</button>

<!-- Botão secundário Expertzy -->
<button class="btn btn-expertzy-secondary">
    <i class="bi bi-icon"></i> Texto
</button>

<!-- Botão outline Expertzy -->
<button class="btn btn-expertzy-outline">
    <i class="bi bi-icon"></i> Texto
</button>
```

#### Botões Temáticos
```html
<!-- Compliance (Fase 1) -->
<button class="btn btn-compliance">
    <i class="bi bi-icon"></i> Processar
</button>

<!-- Business (Fase 2) -->
<button class="btn btn-business">
    <i class="bi bi-icon"></i> Analisar
</button>

<!-- Botões de Fase (Landing) -->
<button class="btn btn-phase-1">Fase 1</button>
<button class="btn btn-phase-2">Fase 2</button>
```

### 5. Cards

#### Cards Padrão
```html
<!-- Card básico Expertzy -->
<div class="expertzy-card">
    <h5>Título do Card</h5>
    <p>Conteúdo do card</p>
</div>

<!-- Card com destaque -->
<div class="expertzy-card expertzy-card-primary">
    <h5>Card Destacado</h5>
    <p>Card com borda vermelha</p>
</div>
```

#### Cards Temáticos
```html
<!-- Compliance Card -->
<div class="compliance-card">
    <h6 class="card-title"><i class="bi bi-icon"></i> Título</h6>
    <p>Conteúdo relacionado à compliance</p>
</div>

<!-- Business Card -->
<div class="business-card">
    <h6 class="card-title"><i class="bi bi-icon"></i> Título</h6>
    <p>Conteúdo relacionado a negócios</p>
</div>

<!-- Phase Cards (Landing) -->
<div class="phase-card phase-1">
    <i class="bi bi-file-earmark-text phase-icon"></i>
    <h3>Fase 1: Título</h3>
    <p>Descrição da fase</p>
</div>
```

### 6. Elementos de Processo

#### Process Steps
```html
<!-- Step de Compliance -->
<div class="process-step active">
    <div class="step-number">1</div>
    <h3><i class="bi bi-icon"></i> Título do Step</h3>
    <p>Descrição do processo</p>
</div>

<!-- Strategy Step (Business) -->
<div class="strategy-step completed">
    <div class="step-number completed">2</div>
    <h3><i class="bi bi-icon"></i> Título da Estratégia</h3>
    <p>Descrição da estratégia</p>
</div>
```

**Estados dos Steps:**
- `.active` - Em progresso
- `.completed` - Concluído
- `.error` - Com erro (apenas compliance)
- `.analysis` - Em análise (apenas business)

### 7. Badges e Status

#### Status Indicators
```html
<!-- Status gerais -->
<span class="status-indicator status-active">Obrigatório</span>
<span class="status-indicator status-optional">Opcional</span>

<!-- Status específicos -->
<span class="status-compliance">Compliance</span>
<span class="status-business">Business</span>
<span class="status-pending">Pendente</span>
<span class="status-completed">Concluído</span>

<!-- Badges Expertzy -->
<span class="badge-expertzy">Badge</span>
<span class="badge-expertzy-navy">Badge Navy</span>
```

### 8. Footer Padrão

```html
<footer class="expertzy-footer">
    <div class="container">
        <div class="row align-items-center py-4">
            <div class="col-md-6">
                <div class="d-flex align-items-center">
                    <img src="../images/expertzy-it.png" alt="Expertzy - Inteligência Tributária" class="footer-logo me-3">
                    <div>
                        <p class="mb-0 fw-bold">Sistema Expertzy v2.0</p>
                        <small class="text-light opacity-75">[Fase Específica]</small>
                    </div>
                </div>
            </div>
            <div class="col-md-6 text-md-end">
                <p class="mb-0 small text-light opacity-75">
                    [Descrição das funcionalidades]
                </p>
                <p class="mb-0 small text-light opacity-50 mt-1">
                    © 2025 Expertzy. Todos os direitos reservados.
                </p>
            </div>
        </div>
    </div>
</footer>
```

### 9. Elementos Auxiliares

#### Loading Overlay
```html
<div id="loadingOverlay" class="loading-overlay hidden">
    <div class="loading-content">
        <div class="expertzy-spinner mb-3"></div>
        <h5 id="loadingMessage">Carregando...</h5>
        <p id="loadingDetail" class="text-muted">Aguarde</p>
    </div>
</div>
```

#### Upload Area
```html
<div class="upload-area" onclick="document.getElementById('fileInput').click()">
    <i class="upload-icon bi bi-cloud-upload"></i>
    <h5>Clique para fazer upload</h5>
    <p class="text-muted">ou arraste arquivos aqui</p>
</div>
```

## Logos e Imagens

### Tamanhos Padrão dos Logos

```css
.expertzy-complete-logo { height: 35px; }  /* Navbar */
.expertzy-hero-logo { height: 60px; }      /* Hero sections */
.footer-logo { height: 35px; }             /* Footer */
.expertzy-logo { height: 50px; }           /* Uso geral */
```

### Caminhos das Imagens

- **Navbar/Footer**: `../images/expertzy-it.png`
- **Landing**: `images/expertzy-it.png`
- **Hero sections**: `images/logo-expertzy.png`

## Ícones

O sistema utiliza **Bootstrap Icons**. Principais ícones por contexto:

- **DI Processing**: `bi-file-earmark-text`, `bi-upload`, `bi-receipt`
- **Pricing**: `bi-graph-up-arrow`, `bi-bar-chart-line`, `bi-tags`
- **Navegação**: `bi-house`, `bi-play-fill`, `bi-arrow-right`
- **Status**: `bi-check-circle`, `bi-x-circle`, `bi-info-circle`

## Responsividade

Todos os componentes são responsivos usando Bootstrap 5:

- **Mobile First**: Design adaptável desde smartphones
- **Breakpoints**: xs, sm, md, lg, xl, xxl
- **Grid System**: Sistema de 12 colunas
- **Utilities**: Classes utilitárias do Bootstrap

## Boas Práticas

### CSS
1. **Nunca usar estilos inline** - sempre CSS modular
2. **Seguir a hierarquia**: brand > theme > specific
3. **Usar variáveis CSS** para cores e medidas
4. **Prefixar classes** específicas com tema (compliance-, business-)

### HTML
1. **Semantic HTML5** sempre
2. **Bootstrap 5** como base
3. **Bootstrap Icons** para ícones
4. **Accessibility** com ARIA labels
5. **SEO** com meta tags adequadas

### JavaScript
1. **Bootstrap 5 JS** para componentes interativos
2. **Modules ES6** quando possível
3. **Compatibilidade** com navegadores modernos

## Template de Nova Página

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Título] - Sistema Expertzy</title>
    
    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    
    <!-- Expertzy Brand System -->
    <link href="[path]/expertzy-brand.css" rel="stylesheet">
    <link href="[path]/[theme]-theme.css" rel="stylesheet">
</head>
<body>
    <!-- Loading Overlay -->
    [Ver seção Loading Overlay]

    <!-- Professional Navigation -->
    [Ver seção Navegação Padrão]

    <!-- Page Header -->
    [Ver seção Headers de Página]

    <!-- Main Content -->
    <div class="container my-5">
        <!-- Conteúdo da página -->
    </div>

    <!-- Footer -->
    [Ver seção Footer Padrão]

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- Scripts específicos da página -->
</body>
</html>
```

## Conclusão

Este guia garante consistência visual em todo o Sistema Expertzy. Ao seguir estas diretrizes, todas as páginas mantêm a identidade visual da marca enquanto diferencia funcionalmente as fases do sistema através dos temas específicos.

Para dúvidas ou sugestões, consulte a documentação técnica completa em `/documentos/`.