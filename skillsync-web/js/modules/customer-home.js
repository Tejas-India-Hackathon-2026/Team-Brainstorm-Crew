/**
 * Customer Home Portal Module
 * Service Discovery Grid, Search, Promos, Verified Technicians & AI Booking CTA
 */

import { SERVICE_CATEGORIES, POPULAR_PROMOTIONS } from '../data/services.js';
import { TECHNICIANS } from '../data/technicians.js';
import { appState } from '../state.js';
import { soundFx } from '../audio-fx.js';

export class CustomerHomeModule {
  constructor(container) {
    this.container = container;
    this.selectedCategoryId = 'all';
    this.searchQuery = '';
  }

  render() {
    this.container.innerHTML = `
      <div class="customer-home-wrapper">
        <!-- Hero Section with AI Diagnostic Highlight & Search -->
        <section class="home-hero-section">
          <div class="hero-content">
            <div class="hero-badge">
              <i data-lucide="shield-check"></i> <span>100% Background Verified Technicians</span>
            </div>
            <h1 class="hero-headline">Expert Home Repair & Services, <span class="text-gradient">Diagnosed by AI</span></h1>
            <p class="hero-subtitle">Get certified electricians, plumbers, and appliance specialists at your doorstep in under 30 minutes with transparent upfront pricing.</p>

            <!-- Search Bar with Live Filter -->
            <div class="hero-search-wrapper">
              <div class="search-box">
                <i data-lucide="search" class="search-icon"></i>
                <input type="text" id="service-search-input" placeholder="Search 'pipe leak', 'MCB tripping', 'AC jet wash'..." value="${this.searchQuery}" />
                ${this.searchQuery ? '<button id="btn-clear-search" class="clear-btn"><i data-lucide="x"></i></button>' : ''}
              </div>
              <button class="btn btn-primary btn-ai-scan" id="hero-btn-ai-scan">
                <i data-lucide="sparkles"></i>
                <span>Diagnose with AI</span>
              </button>
            </div>
          </div>

          <!-- Quick Stats Pill Bar -->
          <div class="hero-trust-pills">
            <div class="trust-pill"><i data-lucide="clock"></i> <span>30-min Express Arrival</span></div>
            <div class="trust-pill"><i data-lucide="award"></i> <span>90-Day Repair Warranty</span></div>
            <div class="trust-pill"><i data-lucide="badge-percent"></i> <span>Zero Hidden Charges</span></div>
            <div class="trust-pill"><i data-lucide="star"></i> <span>4.9★ Rated (25,000+ Reviews)</span></div>
          </div>
        </section>

        <!-- Promotional Highlight Cards -->
        <section class="home-promos-section">
          <div class="promo-cards-scroll">
            ${POPULAR_PROMOTIONS.map(promo => `
              <div class="promo-card" style="background: ${promo.gradient};" data-promo-action="${promo.action}">
                <div class="promo-card-content">
                  <span class="promo-badge">${promo.badge}</span>
                  <h3>${promo.title}</h3>
                  <p>${promo.subtitle}</p>
                  <div class="promo-action-btn">
                    <span>Explore Now</span> <i data-lucide="arrow-right"></i>
                  </div>
                </div>
                <div class="promo-icon-bg">
                  <i data-lucide="${promo.icon}"></i>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- 4-Column Category Grid -->
        <section class="home-categories-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Explore by Category</h2>
              <p class="section-subtitle">Select a trade specialty to see available services and verified experts</p>
            </div>
          </div>

          <div class="category-grid-4col">
            <div class="category-card ${this.selectedCategoryId === 'all' ? 'active' : ''}" data-cat-id="all">
              <div class="cat-icon-box" style="background: rgba(37, 99, 235, 0.12); color: #2563EB;">
                <i data-lucide="layout-grid"></i>
              </div>
              <span class="cat-name">All Services</span>
              <span class="cat-count">20+ Trades</span>
            </div>

            ${SERVICE_CATEGORIES.map(cat => `
              <div class="category-card ${this.selectedCategoryId === cat.id ? 'active' : ''}" data-cat-id="${cat.id}">
                <div class="cat-icon-box" style="background: ${cat.bgColor}; color: ${cat.iconColor};">
                  <i data-lucide="${cat.icon}"></i>
                </div>
                <span class="cat-name">${cat.shortName}</span>
                <span class="cat-count">${cat.badge}</span>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Services Listing Grid (Filtered) -->
        <section class="home-services-section">
          <div class="section-header">
            <div>
              <h2 class="section-title" id="services-grid-heading">
                ${this.selectedCategoryId === 'all' ? 'Featured Home Services' : SERVICE_CATEGORIES.find(c => c.id === this.selectedCategoryId)?.name}
              </h2>
              <p class="section-subtitle">Upfront fixed pricing, certified pros & guaranteed satisfaction</p>
            </div>
          </div>

          <div class="services-cards-grid" id="services-cards-container">
            ${this._renderServicesCards()}
          </div>
        </section>

        <!-- Verified Technicians Spotlight -->
        <section class="home-technicians-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Certified Master Technicians</h2>
              <p class="section-subtitle">Trained on OEM standards with background verification and police clearance</p>
            </div>
          </div>

          <div class="technicians-grid">
            ${TECHNICIANS.map(tech => `
              <div class="tech-spotlight-card">
                <div class="tech-header">
                  <img src="${tech.avatar}" alt="${tech.name}" class="tech-avatar-img" />
                  <div class="tech-meta">
                    <div class="tech-name-row">
                      <h4>${tech.name}</h4>
                      <span class="pro-tag">${tech.badge}</span>
                    </div>
                    <span class="tech-spec">${tech.specialty}</span>
                    <div class="tech-rating-row">
                      <span class="star-rating"><i data-lucide="star"></i> ${tech.rating}</span>
                      <span class="dot-sep">•</span>
                      <span>${tech.jobsCompleted}+ jobs</span>
                      <span class="dot-sep">•</span>
                      <span>${tech.experienceYears} yrs exp</span>
                    </div>
                  </div>
                </div>

                <div class="tech-skills-tags">
                  ${tech.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
                </div>

                <div class="tech-cert-bar">
                  <i data-lucide="check-circle-2"></i> <span>${tech.verification}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    `;

    this._bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  _renderServicesCards() {
    let allServices = [];
    SERVICE_CATEGORIES.forEach(cat => {
      cat.services.forEach(svc => {
        allServices.push({ ...svc, categoryId: cat.id, categoryName: cat.name });
      });
    });

    // Filter by Category
    if (this.selectedCategoryId !== 'all') {
      allServices = allServices.filter(s => s.categoryId === this.selectedCategoryId);
    }

    // Filter by Search Query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      allServices = allServices.filter(s => 
        s.title.toLowerCase().includes(q) || 
        s.description.toLowerCase().includes(q) ||
        s.categoryName.toLowerCase().includes(q)
      );
    }

    if (allServices.length === 0) {
      return `
        <div class="empty-results-box">
          <i data-lucide="search-x"></i>
          <h3>No services found matching "${this.searchQuery}"</h3>
          <p>Try searching for plumbing, electrical, AC repair, or water motor.</p>
          <button class="btn btn-secondary" id="btn-reset-filter">Reset Search</button>
        </div>
      `;
    }

    return allServices.map(svc => `
      <div class="service-card" data-service-id="${svc.id}">
        <div class="service-card-img-wrap">
          <img src="${svc.image}" alt="${svc.title}" class="service-card-img" />
          ${svc.aiSuggested ? '<span class="ai-supported-tag"><i data-lucide="sparkles"></i> AI Diagnosable</span>' : ''}
          <span class="service-duration-badge"><i data-lucide="clock"></i> ${svc.duration}</span>
        </div>

        <div class="service-card-body">
          <div class="service-rating-line">
            <span class="star-pill"><i data-lucide="star"></i> ${svc.rating}</span>
            <span class="reviews-count">(${svc.reviewsCount} reviews)</span>
          </div>

          <h3 class="service-title">${svc.title}</h3>
          <p class="service-description">${svc.description}</p>

          <div class="inclusions-preview">
            <span><i data-lucide="check"></i> ${svc.included[0]}</span>
          </div>

          <div class="service-card-footer">
            <div class="service-price-block">
              <span class="price-label">Starts at</span>
              <span class="price-amount">₹${svc.basePrice}</span>
            </div>

            <button class="btn btn-primary btn-book-service" data-service-id="${svc.id}">
              <span>Book Now</span>
              <i data-lucide="arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  _bindEvents() {
    // Search input typing
    const searchInput = this.container.querySelector('#service-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        const container = this.container.querySelector('#services-cards-container');
        if (container) {
          container.innerHTML = this._renderServicesCards();
          this._bindCardClickEvents();
          if (window.lucide) window.lucide.createIcons();
        }
      });
    }

    // Clear search
    const clearBtn = this.container.querySelector('#btn-clear-search');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.render();
      });
    }

    // Hero AI button
    const heroAiBtn = this.container.querySelector('#hero-btn-ai-scan');
    if (heroAiBtn) {
      heroAiBtn.addEventListener('click', () => {
        appState.setTab('ai-diagnostics');
      });
    }

    // Promo cards action
    this.container.querySelectorAll('.promo-card').forEach(card => {
      card.addEventListener('click', () => {
        const action = card.getAttribute('data-promo-action');
        if (action === 'open-ai-scanner') {
          appState.setTab('ai-diagnostics');
        } else if (action === 'category-ac-repair') {
          this.selectedCategoryId = 'ac-repair';
          this.render();
        } else if (action === 'category-plumbing') {
          this.selectedCategoryId = 'plumbing';
          this.render();
        }
      });
    });

    // Category click
    this.container.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const catId = card.getAttribute('data-cat-id');
        this.selectedCategoryId = catId;
        soundFx.playTap();
        this.render();
      });
    });

    this._bindCardClickEvents();
  }

  _bindCardClickEvents() {
    // Book button clicks
    this.container.querySelectorAll('.btn-book-service').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const serviceId = btn.getAttribute('data-service-id');
        let selectedService = null;
        for (const cat of SERVICE_CATEGORIES) {
          const found = cat.services.find(s => s.id === serviceId);
          if (found) {
            selectedService = { ...found, category: cat.id };
            break;
          }
        }

        if (selectedService && window.skillsyncApp && window.skillsyncApp.bookingWizard) {
          window.skillsyncApp.bookingWizard.openModal(selectedService);
        }
      });
    });

    // Reset button in empty state
    const resetBtn = this.container.querySelector('#btn-reset-filter');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.selectedCategoryId = 'all';
        this.render();
      });
    }
  }
}
