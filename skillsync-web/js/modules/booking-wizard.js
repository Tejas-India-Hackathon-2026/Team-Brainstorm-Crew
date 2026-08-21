/**
 * Interactive Multi-Step Booking Wizard Modal
 */

import { appState } from '../state.js';
import { soundFx } from '../audio-fx.js';

export class BookingWizardModule {
  constructor() {
    this.modalEl = null;
    this.currentStep = 1; // 1: Service details & AI report, 2: Schedule & Slot, 3: Address & Notes, 4: Payment & Checkout
    this.service = null;
    this.aiReport = null;
    this.slotType = 'emergency'; // 'emergency' | 'scheduled'
    this.selectedDate = 'Today, 20 Aug';
    this.selectedTimeSlot = '3:30 PM - 4:30 PM';
    this.selectedAddressId = 'addr-1';
    this.notes = '';
    this.appliedPromo = null;
    this.paymentMethod = 'upi';
    this._initModal();
  }

  _initModal() {
    let modal = document.getElementById('booking-wizard-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'booking-wizard-modal';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }
    this.modalEl = modal;
  }

  openModal(service, attachedAiReport = null) {
    this.service = service;
    this.aiReport = attachedAiReport || appState.getState().activeDiagnosticReport;
    this.currentStep = 1;
    this.appliedPromo = null;
    this.modalEl.classList.add('is-open');
    soundFx.playTap();
    this.render();
  }

  closeModal() {
    this.modalEl.classList.remove('is-open');
    soundFx.playTap();
  }

  render() {
    if (!this.service) return;

    const state = appState.getState();
    const partsTotal = this.aiReport ? this.aiReport.requiredParts.reduce((a, b) => a + b.cost, 0) : 0;
    const baseLabor = this.service.basePrice;
    const emergencyFee = this.slotType === 'emergency' ? 49 : 0;
    const discount = this.appliedPromo ? 100 : 0;
    const taxes = Math.round((baseLabor + partsTotal + emergencyFee) * 0.05); // 5% GST
    const finalTotal = Math.max(0, baseLabor + partsTotal + emergencyFee + taxes - discount);

    this.modalEl.innerHTML = `
      <div class="modal-card booking-modal-card">
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="step-indicator">Step ${this.currentStep} of 4</span>
            <h3>Book ${this.service.title}</h3>
          </div>
          <button class="modal-close-btn" id="btn-close-wizard">
            <i data-lucide="x"></i>
          </button>
        </div>

        <!-- Multi-Step Progress Tracker -->
        <div class="wizard-stepper">
          <div class="step-node ${this.currentStep >= 1 ? 'completed' : ''} ${this.currentStep === 1 ? 'current' : ''}">
            <span class="node-circle">1</span>
            <span class="node-label">Service</span>
          </div>
          <div class="step-connector ${this.currentStep >= 2 ? 'active' : ''}"></div>
          <div class="step-node ${this.currentStep >= 2 ? 'completed' : ''} ${this.currentStep === 2 ? 'current' : ''}">
            <span class="node-circle">2</span>
            <span class="node-label">Schedule</span>
          </div>
          <div class="step-connector ${this.currentStep >= 3 ? 'active' : ''}"></div>
          <div class="step-node ${this.currentStep >= 3 ? 'completed' : ''} ${this.currentStep === 3 ? 'current' : ''}">
            <span class="node-circle">3</span>
            <span class="node-label">Address</span>
          </div>
          <div class="step-connector ${this.currentStep >= 4 ? 'active' : ''}"></div>
          <div class="step-node ${this.currentStep >= 4 ? 'completed' : ''} ${this.currentStep === 4 ? 'current' : ''}">
            <span class="node-circle">4</span>
            <span class="node-label">Review</span>
          </div>
        </div>

        <!-- Step Body -->
        <div class="modal-body wizard-body">
          ${this._renderCurrentStepBody(state, partsTotal, baseLabor, emergencyFee, taxes, discount, finalTotal)}
        </div>

        <!-- Modal Footer Navigation -->
        <div class="modal-footer">
          ${this.currentStep > 1 ? `
            <button class="btn btn-secondary" id="btn-wizard-prev">
              <i data-lucide="arrow-left"></i> Back
            </button>
          ` : `<div></div>`}

          <div class="wizard-footer-right">
            <div class="mini-total-preview">
              <span>Total:</span> <strong>₹${finalTotal}</strong>
            </div>

            ${this.currentStep < 4 ? `
              <button class="btn btn-primary" id="btn-wizard-next">
                <span>Continue</span> <i data-lucide="arrow-right"></i>
              </button>
            ` : `
              <button class="btn btn-primary btn-confirm-pay" id="btn-wizard-confirm">
                <i data-lucide="shield-check"></i>
                <span>Confirm & Dispatch Technician</span>
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    this._bindEvents(finalTotal);
    if (window.lucide) window.lucide.createIcons();
  }

  _renderCurrentStepBody(state, partsTotal, baseLabor, emergencyFee, taxes, discount, finalTotal) {
    if (this.currentStep === 1) {
      return `
        <div class="step-section">
          <div class="service-summary-banner">
            <img src="${this.service.image}" alt="${this.service.title}" class="service-mini-thumb" />
            <div class="service-mini-info">
              <h4>${this.service.title}</h4>
              <p>${this.service.description}</p>
              <div class="meta-row">
                <span class="badge-accent"><i data-lucide="clock"></i> ${this.service.duration}</span>
                <span class="badge-accent"><i data-lucide="shield"></i> 30-Day Guarantee</span>
              </div>
            </div>
          </div>

          ${this.aiReport ? `
            <div class="attached-ai-card">
              <div class="attached-header">
                <span class="ai-chip"><i data-lucide="sparkles"></i> AI Diagnostic Attached</span>
                <span class="conf-tag">${this.aiReport.confidence}% match</span>
              </div>
              <h4>Detected Issue: ${this.aiReport.detectedIssue || this.aiReport.label}</h4>
              <p class="issue-desc">${this.aiReport.diagnosisSummary || 'Acoustic / Visual inspection details ready for technician.'}</p>
              
              <div class="attached-parts-box">
                <strong>Pre-Identified Replacement Parts:</strong>
                <ul>
                  ${this.aiReport.requiredParts.map(p => `<li>${p.name} - ₹${p.cost}</li>`).join('')}
                </ul>
              </div>
            </div>
          ` : `
            <div class="no-ai-attached-box">
              <i data-lucide="info"></i>
              <span>No AI report attached. The technician will diagnose and quote any required parts on-site.</span>
            </div>
          `}

          <div class="inclusions-exclusions-box">
            <div class="inc-col">
              <h5><i data-lucide="check-circle-2"></i> What's Included</h5>
              <ul>
                ${(this.service.included || ["Professional inspection", "Standard service labor", "Post-repair cleanup"]).map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            <div class="exc-col">
              <h5><i data-lucide="x-circle"></i> What's Excluded</h5>
              <ul>
                ${(this.service.excluded || ["Replacement hardware costs", "Concealed heavy civil work"]).map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      `;
    }

    if (this.currentStep === 2) {
      return `
        <div class="step-section">
          <h4>Select Arrival Speed & Timing</h4>
          
          <div class="slot-type-cards">
            <label class="slot-option-card ${this.slotType === 'emergency' ? 'selected' : ''}">
              <input type="radio" name="slotType" value="emergency" ${this.slotType === 'emergency' ? 'checked' : ''} />
              <div class="slot-card-inner">
                <div class="slot-icon-box emergency-icon"><i data-lucide="zap"></i></div>
                <div class="slot-card-details">
                  <div class="slot-title-row">
                    <strong>Express 30-Min Rush</strong>
                    <span class="slot-fee-tag">+₹49</span>
                  </div>
                  <p>Technician dispatched immediately with priority live GPS radar matching.</p>
                </div>
              </div>
            </label>

            <label class="slot-option-card ${this.slotType === 'scheduled' ? 'selected' : ''}">
              <input type="radio" name="slotType" value="scheduled" ${this.slotType === 'scheduled' ? 'checked' : ''} />
              <div class="slot-card-inner">
                <div class="slot-icon-box scheduled-icon"><i data-lucide="calendar"></i></div>
                <div class="slot-card-details">
                  <div class="slot-title-row">
                    <strong>Schedule for Later</strong>
                    <span class="slot-fee-tag free-tag">Free</span>
                  </div>
                  <p>Choose a convenient date and time window that fits your schedule.</p>
                </div>
              </div>
            </label>
          </div>

          ${this.slotType === 'scheduled' ? `
            <div class="time-slots-grid-section">
              <h5>Choose Preferred Time Window</h5>
              <div class="time-chips-group">
                ${['10:00 AM - 11:00 AM', '12:30 PM - 01:30 PM', '03:30 PM - 04:30 PM', '06:00 PM - 07:00 PM'].map(time => `
                  <button class="time-chip ${this.selectedTimeSlot === time ? 'active' : ''}" data-time="${time}">
                    ${time}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }

    if (this.currentStep === 3) {
      return `
        <div class="step-section">
          <h4>Service Location & Access Notes</h4>

          <div class="addresses-list">
            ${state.customer.savedAddresses.map(addr => `
              <label class="address-option-card ${this.selectedAddressId === addr.id ? 'selected' : ''}">
                <input type="radio" name="addressSelect" value="${addr.id}" ${this.selectedAddressId === addr.id ? 'checked' : ''} />
                <div class="addr-card-body">
                  <div class="addr-label-row">
                    <strong><i data-lucide="map-pin"></i> ${addr.label}</strong>
                    ${addr.isDefault ? '<span class="default-badge">Default</span>' : ''}
                  </div>
                  <p>${addr.fullAddress}</p>
                </div>
              </label>
            `).join('')}
          </div>

          <div class="form-group notes-group">
            <label for="technician-notes"><i data-lucide="file-text"></i> Instructions for Technician (Optional)</label>
            <textarea id="technician-notes" class="form-textarea" placeholder="E.g., Ring bell twice, gate code is 4421, dog is in balcony...">${this.notes}</textarea>
          </div>
        </div>
      `;
    }

    if (this.currentStep === 4) {
      return `
        <div class="step-section review-step">
          <!-- Itemized Invoice Card -->
          <div class="checkout-card">
            <h4><i data-lucide="receipt"></i> Price Breakdown</h4>
            
            <div class="invoice-lines">
              <div class="inv-row">
                <span>Base Service Labor (${this.service.title})</span>
                <span>₹${baseLabor}</span>
              </div>
              
              ${this.aiReport ? `
                <div class="inv-row">
                  <span>AI Pre-Approved Spare Parts</span>
                  <span>₹${partsTotal}</span>
                </div>
              ` : ''}

              ${emergencyFee > 0 ? `
                <div class="inv-row">
                  <span>Express Rush Dispatch</span>
                  <span>₹${emergencyFee}</span>
                </div>
              ` : ''}

              <div class="inv-row">
                <span>Taxes & Safety Fee (GST 5%)</span>
                <span>₹${taxes}</span>
              </div>

              ${discount > 0 ? `
                <div class="inv-row discount-row">
                  <span>Promo Code (${this.appliedPromo})</span>
                  <span>-₹${discount}</span>
                </div>
              ` : ''}

              <div class="inv-divider"></div>

              <div class="inv-row inv-total-row">
                <strong>Total Payable Amount</strong>
                <strong class="total-price-text">₹${finalTotal}</strong>
              </div>
            </div>

            <!-- Promo Code Form -->
            <div class="promo-input-box">
              <input type="text" id="input-promo-code" placeholder="Enter coupon (e.g. AIREADY)" value="${this.appliedPromo || ''}" />
              <button class="btn btn-secondary" id="btn-apply-coupon">
                ${this.appliedPromo ? 'Applied' : 'Apply'}
              </button>
            </div>
          </div>

          <!-- Payment Method Selection -->
          <div class="payment-method-box">
            <h4>Select Payment Option</h4>
            <div class="payment-options-grid">
              <label class="pay-option ${this.paymentMethod === 'upi' ? 'selected' : ''}">
                <input type="radio" name="payMethod" value="upi" ${this.paymentMethod === 'upi' ? 'checked' : ''} />
                <div class="pay-option-content">
                  <i data-lucide="smartphone"></i>
                  <span>UPI / GooglePay / PhonePe</span>
                </div>
              </label>

              <label class="pay-option ${this.paymentMethod === 'card' ? 'selected' : ''}">
                <input type="radio" name="payMethod" value="card" ${this.paymentMethod === 'card' ? 'checked' : ''} />
                <div class="pay-option-content">
                  <i data-lucide="credit-card"></i>
                  <span>Credit / Debit Card</span>
                </div>
              </label>

              <label class="pay-option ${this.paymentMethod === 'cash' ? 'selected' : ''}">
                <input type="radio" name="payMethod" value="cash" ${this.paymentMethod === 'cash' ? 'checked' : ''} />
                <div class="pay-option-content">
                  <i data-lucide="banknote"></i>
                  <span>Pay After Service (Cash/UPI)</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      `;
    }
  }

  _bindEvents(finalTotal) {
    const modal = this.modalEl;

    // Close button
    const closeBtn = modal.querySelector('#btn-close-wizard');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());

    // Next step button
    const nextBtn = modal.querySelector('#btn-wizard-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentStep < 4) {
          this.currentStep += 1;
          soundFx.playTap();
          this.render();
        }
      });
    }

    // Prev step button
    const prevBtn = modal.querySelector('#btn-wizard-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentStep > 1) {
          this.currentStep -= 1;
          soundFx.playTap();
          this.render();
        }
      });
    }

    // Step 2 Slot Radio Change
    modal.querySelectorAll('input[name="slotType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.slotType = e.target.value;
        soundFx.playTap();
        this.render();
      });
    });

    // Time chip click
    modal.querySelectorAll('.time-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.selectedTimeSlot = chip.getAttribute('data-time');
        soundFx.playTap();
        this.render();
      });
    });

    // Address selection radio
    modal.querySelectorAll('input[name="addressSelect"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.selectedAddressId = e.target.value;
        soundFx.playTap();
        this.render();
      });
    });

    // Notes textarea
    const notesInput = modal.querySelector('#technician-notes');
    if (notesInput) {
      notesInput.addEventListener('input', (e) => {
        this.notes = e.target.value;
      });
    }

    // Payment method radio
    modal.querySelectorAll('input[name="payMethod"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.paymentMethod = e.target.value;
        soundFx.playTap();
        this.render();
      });
    });

    // Promo code apply button
    const applyCouponBtn = modal.querySelector('#btn-apply-coupon');
    if (applyCouponBtn) {
      applyCouponBtn.addEventListener('click', () => {
        const input = modal.querySelector('#input-promo-code');
        const code = input ? input.value.trim().toUpperCase() : '';
        if (code === 'AIREADY' || code === 'MONSOON150' || code === 'RUSH30' || code === 'SAVE100') {
          this.appliedPromo = code;
          soundFx.playSuccess();
          appState.addToast(`Coupon "${code}" applied! ₹100 discount added.`, "success");
          this.render();
        } else {
          appState.addToast("Invalid coupon code. Try 'AIREADY'", "warning");
        }
      });
    }

    // Final Confirm Button
    const confirmBtn = modal.querySelector('#btn-wizard-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const state = appState.getState();
        const address = state.customer.savedAddresses.find(a => a.id === this.selectedAddressId) || state.customer.savedAddresses[0];

        appState.createBooking({
          service: this.service,
          slotType: this.slotType,
          scheduledDate: this.selectedDate,
          scheduledTime: this.selectedTimeSlot,
          address,
          aiReport: this.aiReport,
          notes: this.notes
        });

        this.closeModal();
      });
    }
  }
}
