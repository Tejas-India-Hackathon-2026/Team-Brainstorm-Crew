/**
 * Technician Earnings & Performance Analytics Module
 */

import { appState } from '../state.js';
import { soundFx } from '../audio-fx.js';

export class EarningsViewModule {
  constructor(container) {
    this.container = container;
    this.selectedTimeframe = 'week'; // 'week' | 'month'
  }

  render() {
    const state = appState.getState();
    const worker = state.worker;

    this.container.innerHTML = `
      <div class="earnings-view-wrapper">
        <!-- Top Stats Overview Card -->
        <div class="earnings-summary-hero">
          <div class="hero-wallet-left">
            <span class="wallet-badge"><i data-lucide="wallet"></i> Partner Escrow Balance</span>
            <h1 class="wallet-balance-num">₹${worker.weeklyEarnings + worker.todayEarnings}</h1>
            <p class="wallet-subtext">Available for instant bank settlement or scheduled Monday auto-credit.</p>
            
            <div class="hero-actions-row">
              <button class="btn btn-primary" id="btn-instant-withdraw">
                <i data-lucide="arrow-up-right"></i> Instant Bank Transfer (UPI)
              </button>
              <button class="btn btn-secondary" id="btn-download-tax-slip">
                <i data-lucide="download"></i> Download GST Slip
              </button>
            </div>
          </div>

          <div class="hero-stats-right">
            <div class="mini-stat-card">
              <span>Today's Net</span>
              <strong>₹${worker.todayEarnings}</strong>
            </div>
            <div class="mini-stat-card">
              <span>Tips Received</span>
              <strong>₹420</strong>
            </div>
            <div class="mini-stat-card">
              <span>Incentive Bonus</span>
              <strong class="green-text">+₹750</strong>
            </div>
            <div class="mini-stat-card">
              <span>Commission Rate</span>
              <strong>18% Platform</strong>
            </div>
          </div>
        </div>

        <!-- Weekly Performance & Earnings Bar Chart -->
        <div class="chart-container-card">
          <div class="chart-header">
            <div>
              <h3>Daily Earnings Trend</h3>
              <p>Breakdown of service revenue and customer tips over the last 7 days</p>
            </div>
            <div class="timeframe-toggle">
              <button class="timeframe-btn active">Last 7 Days</button>
              <button class="timeframe-btn">This Month</button>
            </div>
          </div>

          <div class="svg-chart-box">
            <svg class="earnings-bar-svg" viewBox="0 0 700 240" preserveAspectRatio="none">
              <!-- Y-Axis Gridlines -->
              <line x1="40" y1="40" x2="680" y2="40" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4" />
              <text x="10" y="45" fill="#64748B" font-size="11">₹4k</text>

              <line x1="40" y1="100" x2="680" y2="100" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4" />
              <text x="10" y="105" fill="#64748B" font-size="11">₹2.5k</text>

              <line x1="40" y1="160" x2="680" y2="160" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4" />
              <text x="10" y="165" fill="#64748B" font-size="11">₹1k</text>

              <line x1="40" y1="200" x2="680" y2="200" stroke="rgba(255,255,255,0.15)" />

              <!-- Daily Bars (Mon - Sun) -->
              ${[
                { day: "Thu (14)", val: 1850, x: 70 },
                { day: "Fri (15)", val: 2400, x: 160 },
                { day: "Sat (16)", val: 3200, x: 250 },
                { day: "Sun (17)", val: 3850, x: 340 },
                { day: "Mon (18)", val: 1900, x: 430 },
                { day: "Tue (19)", val: 2650, x: 520 },
                { day: "Today (20)", val: worker.todayEarnings, x: 610 }
              ].map(bar => {
                const height = Math.min(150, (bar.val / 4000) * 150);
                const y = 200 - height;
                return `
                  <g class="chart-bar-group">
                    <rect x="${bar.x}" y="${y}" width="42" height="${height}" rx="6" fill="url(#bar-grad)" class="animated-bar" />
                    <text x="${bar.x + 21}" y="${y - 8}" text-anchor="middle" fill="#93C5FD" font-size="11" font-weight="600">₹${bar.val}</text>
                    <text x="${bar.x + 21}" y="222" text-anchor="middle" fill="#94A3B8" font-size="11">${bar.day}</text>
                  </g>
                `;
              }).join('')}

              <defs>
                <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3B82F6" />
                  <stop offset="100%" stop-color="#1D4ED8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <!-- Recent Completed Job Settlements Table -->
        <div class="settlements-card">
          <div class="settlements-header">
            <h3>Recent Payout Ledger</h3>
            <span class="settle-badge">100% Guaranteed Escrow</span>
          </div>

          <div class="table-responsive">
            <table class="settlements-table">
              <thead>
                <tr>
                  <th>Job ID & Service</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Gross Bill</th>
                  <th>Platform Fee (18%)</th>
                  <th>Your Net Payout</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>#SS-8491</strong><br /><small>Power Jet AC Service</small></td>
                  <td>20 Aug, 2:15 PM</td>
                  <td>Abhishek Sharma</td>
                  <td>₹599</td>
                  <td>-₹107</td>
                  <td class="net-payout-text">₹492</td>
                  <td><span class="status-badge-settled">Settled</span></td>
                </tr>
                <tr>
                  <td><strong>#SS-8422</strong><br /><small>MCB Tripping Short Circuit</small></td>
                  <td>19 Aug, 5:30 PM</td>
                  <td>Suresh Mehta</td>
                  <td>₹450</td>
                  <td>-₹81</td>
                  <td class="net-payout-text">₹369</td>
                  <td><span class="status-badge-settled">Settled</span></td>
                </tr>
                <tr>
                  <td><strong>#SS-8390</strong><br /><small>Under-sink Pipe Leak Fix</small></td>
                  <td>19 Aug, 11:00 AM</td>
                  <td>Kavita Singh</td>
                  <td>₹680</td>
                  <td>-₹122</td>
                  <td class="net-payout-text">₹558</td>
                  <td><span class="status-badge-settled">Settled</span></td>
                </tr>
                <tr>
                  <td><strong>#SS-8314</strong><br /><small>Washing Machine Drum Damper</small></td>
                  <td>18 Aug, 4:45 PM</td>
                  <td>Anil Kapoor</td>
                  <td>₹1,250</td>
                  <td>-₹225</td>
                  <td class="net-payout-text">₹1,025</td>
                  <td><span class="status-badge-settled">Settled</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  _bindEvents() {
    const withdrawBtn = this.container.querySelector('#btn-instant-withdraw');
    if (withdrawBtn) {
      withdrawBtn.addEventListener('click', () => {
        soundFx.playSuccess();
        appState.addToast("Withdrawal of ₹4,200 initiated via UPI (vikram@okhdfcbank). Ref #TXN984210", "success");
      });
    }

    const slipBtn = this.container.querySelector('#btn-download-tax-slip');
    if (slipBtn) {
      slipBtn.addEventListener('click', () => {
        soundFx.playTap();
        appState.addToast("GST Invoice Slip downloaded successfully.", "info");
      });
    }
  }
}
