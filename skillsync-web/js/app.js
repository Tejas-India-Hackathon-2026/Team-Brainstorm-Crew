/**
 * Main Application Orchestrator & Router
 */

import { appState } from './state.js';
import { soundFx } from './audio-fx.js';
import { CustomerHomeModule } from './modules/customer-home.js';
import { AiDiagnosticsModule } from './modules/ai-diagnostics.js';
import { LiveTrackerModule } from './modules/live-tracker.js';
import { WorkerPortalModule } from './modules/worker-portal.js';
import { EarningsViewModule } from './modules/earnings-view.js';
import { BookingWizardModule } from './modules/booking-wizard.js';
import { SosModule } from './modules/sos-module.js';

class SkillSyncApp {
  constructor() {
    this.mainContainer = document.getElementById('main-app-content');
    this.toastContainer = document.getElementById('toast-container');
    
    // Initialize feature modules
    this.customerHome = new CustomerHomeModule(this.mainContainer);
    this.aiDiagnostics = new AiDiagnosticsModule(this.mainContainer);
    this.liveTracker = new LiveTrackerModule(this.mainContainer);
    this.workerPortal = new WorkerPortalModule(this.mainContainer);
    this.earningsView = new EarningsViewModule(this.mainContainer);
    this.bookingWizard = new BookingWizardModule();
    this.sosModule = new SosModule();

    this._bindGlobalEvents();
    this._subscribeToState();
    this.applyTheme(appState.getState().theme);
  }

  init() {
    this.renderNavigation();
    this.renderCurrentView();
  }

  renderNavigation() {
    const state = appState.getState();
    const isCustomer = state.currentRole === 'customer';

    // Header Role Switcher & Profile
    const roleToggle = document.getElementById('role-switcher-toggle');
    if (roleToggle) {
      roleToggle.innerHTML = `
        <div class="role-pill-switch">
          <button class="role-pill-btn ${isCustomer ? 'active' : ''}" data-role="customer">
            <i data-lucide="user"></i> <span>Customer</span>
          </button>
          <button class="role-pill-btn ${!isCustomer ? 'active' : ''}" data-role="technician">
            <i data-lucide="wrench"></i> <span>Technician / Partner</span>
          </button>
        </div>
      `;
    }

    // Top Navigation Links
    const topNav = document.getElementById('top-nav-links');
    if (topNav) {
      if (isCustomer) {
        topNav.innerHTML = `
          <button class="nav-link-btn ${state.currentTab === 'home' ? 'active' : ''}" data-tab="home">
            <i data-lucide="home"></i> <span>Home</span>
          </button>
          <button class="nav-link-btn ${state.currentTab === 'ai-diagnostics' ? 'active' : ''}" data-tab="ai-diagnostics">
            <i data-lucide="sparkles"></i> <span>AI Diagnostics</span>
          </button>
          <button class="nav-link-btn ${state.currentTab === 'live-tracking' ? 'active' : ''}" data-tab="live-tracking">
            <i data-lucide="navigation"></i> <span>Live Track</span>
            ${state.activeBooking && state.activeBooking.status !== 'completed' ? '<span class="nav-live-dot"></span>' : ''}
          </button>
          <button class="nav-link-btn ${state.currentTab === 'my-bookings' ? 'active' : ''}" data-tab="my-bookings">
            <i data-lucide="calendar"></i> <span>Activity</span>
          </button>
        `;
      } else {
        topNav.innerHTML = `
          <button class="nav-link-btn ${state.currentTab === 'worker-portal' ? 'active' : ''}" data-tab="worker-portal">
            <i data-lucide="activity"></i> <span>Dispatch Radar</span>
            ${state.activeBooking && state.activeBooking.status !== 'completed' ? '<span class="nav-live-dot"></span>' : ''}
          </button>
          <button class="nav-link-btn ${state.currentTab === 'earnings' ? 'active' : ''}" data-tab="earnings">
            <i data-lucide="wallet"></i> <span>Earnings & Payouts</span>
          </button>
        `;
      }
    }

    // Mobile Bottom Bar Navigation
    const mobileNav = document.getElementById('mobile-bottom-nav');
    if (mobileNav) {
      if (isCustomer) {
        mobileNav.innerHTML = `
          <button class="m-nav-item ${state.currentTab === 'home' ? 'active' : ''}" data-tab="home">
            <i data-lucide="home"></i>
            <span>Home</span>
          </button>
          <button class="m-nav-item ${state.currentTab === 'ai-diagnostics' ? 'active' : ''}" data-tab="ai-diagnostics">
            <div class="m-ai-fab">
              <i data-lucide="sparkles"></i>
            </div>
            <span>AI Scan</span>
          </button>
          <button class="m-nav-item ${state.currentTab === 'live-tracking' ? 'active' : ''}" data-tab="live-tracking">
            <i data-lucide="navigation"></i>
            <span>Track</span>
            ${state.activeBooking && state.activeBooking.status !== 'completed' ? '<span class="m-live-dot"></span>' : ''}
          </button>
          <button class="m-nav-item ${state.currentTab === 'my-bookings' ? 'active' : ''}" data-tab="my-bookings">
            <i data-lucide="clock"></i>
            <span>Activity</span>
          </button>
        `;
      } else {
        mobileNav.innerHTML = `
          <button class="m-nav-item ${state.currentTab === 'worker-portal' ? 'active' : ''}" data-tab="worker-portal">
            <i data-lucide="radio"></i>
            <span>Radar</span>
          </button>
          <button class="m-nav-item ${state.currentTab === 'earnings' ? 'active' : ''}" data-tab="earnings">
            <i data-lucide="wallet"></i>
            <span>Earnings</span>
          </button>
        `;
      }
    }

    if (window.lucide) window.lucide.createIcons();
    this._bindNavEvents();
  }

  renderCurrentView() {
    const state = appState.getState();
    const tab = state.currentTab;

    if (state.currentRole === 'customer') {
      if (tab === 'home') {
        this.customerHome.render();
      } else if (tab === 'ai-diagnostics') {
        this.aiDiagnostics.render();
      } else if (tab === 'live-tracking') {
        this.liveTracker.render();
      } else if (tab === 'my-bookings') {
        this._renderMyBookingsView();
      } else {
        this.customerHome.render();
      }
    } else {
      // Technician Role Views
      if (tab === 'worker-portal') {
        this.workerPortal.render();
      } else if (tab === 'earnings') {
        this.earningsView.render();
      } else {
        this.workerPortal.render();
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) window.lucide.createIcons();
  }

  _renderMyBookingsView() {
    const state = appState.getState();
    const history = state.bookingsHistory;
    const active = state.activeBooking;

    this.mainContainer.innerHTML = `
      <div class="my-bookings-wrapper">
        <div class="section-header">
          <div>
            <h2 class="section-title">My Bookings & Repair Records</h2>
            <p class="section-subtitle">View active dispatches, verified invoices, and completed job history</p>
          </div>
        </div>

        ${active ? `
          <div class="active-booking-banner-card">
            <div class="active-badge-row">
              <span class="pulse-dot"></span>
              <span class="active-tag">Active Job: #${active.id}</span>
              <span class="slot-badge">${active.slotType === 'emergency' ? '30-Min Rush' : 'Scheduled'}</span>
            </div>

            <div class="banner-body">
              <div class="banner-info">
                <h3>${active.serviceTitle}</h3>
                <p>Assigned to <strong>${active.technician.name}</strong> • OTP: <strong class="otp-code-highlight">${active.otp}</strong></p>
                <span class="status-pill status-${active.status}">${active.status.toUpperCase()}</span>
              </div>
              <button class="btn btn-primary" id="btn-view-live-tracking">
                <i data-lucide="navigation"></i> Open Live Map
              </button>
            </div>
          </div>
        ` : ''}

        <div class="history-cards-list">
          ${history.map(b => `
            <div class="history-item-card">
              <div class="hist-thumb-col">
                <i data-lucide="wrench"></i>
              </div>
              <div class="hist-main-col">
                <div class="hist-title-row">
                  <h4>${b.serviceTitle}</h4>
                  <span class="hist-price">₹${b.totalAmount}</span>
                </div>
                <p class="hist-meta">Technician: ${b.technician ? b.technician.name : 'Master Pro'} • Date: ${new Date(b.createdAt).toLocaleDateString()}</p>
                ${b.userReview ? `<p class="hist-review">"${b.userReview}" (★ ${b.rating})</p>` : ''}
              </div>
              <div class="hist-status-col">
                <span class="completed-tag"><i data-lucide="check-circle-2"></i> ${b.status}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const trackBtn = this.mainContainer.querySelector('#btn-view-live-tracking');
    if (trackBtn) {
      trackBtn.addEventListener('click', () => {
        appState.setTab('live-tracking');
      });
    }
  }

  _bindNavEvents() {
    // Role switch click
    document.querySelectorAll('.role-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-role');
        appState.setRole(role);
      });
    });

    // Top Navigation links
    document.querySelectorAll('.nav-link-btn, .m-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) {
          appState.setTab(tab);
        }
      });
    });
  }

  _bindGlobalEvents() {
    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        appState.toggleTheme();
      });
    }

    // Header SOS button
    const sosTrigger = document.getElementById('global-sos-btn');
    if (sosTrigger) {
      sosTrigger.addEventListener('click', () => {
        appState.triggerSOS();
      });
    }
  }

  _subscribeToState() {
    appState.subscribe((state, eventKey) => {
      this.applyTheme(state.theme);
      this.renderNavigation();

      if (eventKey === 'role_changed' || eventKey === 'tab_changed') {
        this.renderCurrentView();
      } else if (eventKey === 'booking_created' || eventKey === 'booking_status_updated') {
        if (state.currentTab === 'live-tracking') {
          this.liveTracker.render();
        } else if (state.currentTab === 'worker-portal') {
          this.workerPortal.render();
        }
      } else if (eventKey === 'sos_triggered') {
        this.sosModule.openModal();
      } else if (eventKey === 'toast_added' || eventKey === 'toast_removed') {
        this.renderToasts(state.notifications);
      }
    });
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  renderToasts(notifications) {
    if (!this.toastContainer) return;
    this.toastContainer.innerHTML = notifications.map(t => `
      <div class="toast-item toast-${t.type} animated-slide-in">
        <div class="toast-icon">
          <i data-lucide="${t.type === 'success' ? 'check-circle-2' : t.type === 'error' ? 'alert-octagon' : t.type === 'warning' ? 'alert-triangle' : 'info'}"></i>
        </div>
        <span class="toast-msg">${t.message}</span>
      </div>
    `).join('');
    if (window.lucide) window.lucide.createIcons();
  }
}

// Global bootstrap
document.addEventListener('DOMContentLoaded', () => {
  window.skillsyncApp = new SkillSyncApp();
  window.skillsyncApp.init();
});
