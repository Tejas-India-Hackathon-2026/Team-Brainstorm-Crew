/**
 * AI Problem Diagnostics Knowledge Base:
 * 1. Visual Defect Presets (with bounding boxes, severity, parts breakdown & quotes)
 * 2. Acoustic / Sound Frequency Profiles (waveform patterns & mechanical fault diagnosis)
 * 3. Interactive Symptom Tree
 */

export const VISUAL_DIAGNOSTICS_PRESETS = [
  {
    id: "preset-pipe-corrosion",
    category: "plumbing",
    label: "Under-Sink Pipe Leak & Thread Corrosion",
    sampleImage: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80",
    detectedIssue: "Pressurized CPVC Joint Degradation & O-Ring Seal Rupture",
    severity: "High",
    confidence: 97.4,
    boundingBoxes: [
      { top: "34%", left: "42%", width: "24%", height: "30%", label: "Active Water Seepage (O-Ring Failure)", color: "#EF4444" },
      { top: "60%", left: "38%", width: "32%", height: "22%", label: "Thread Calcium Scaling", color: "#F59E0B" }
    ],
    diagnosisSummary: "Neural inspection identified severe calcium scale calcification around the 1.25-inch P-trap elbow coupling. The internal nitrile rubber washer has cracked, causing continuous seepage of ~120ml/hr.",
    requiredParts: [
      { name: "Heavy Duty 1.25\" CPVC Elbow Joint", cost: 180 },
      { name: "EPDM High-Temp Sealing Washer (Pack of 2)", cost: 60 },
      { name: "PTFE Teflon Sealant Tape & Solvent Cement", cost: 80 }
    ],
    laborEstimate: 349,
    estimatedDurationMinutes: 45,
    matchedServiceId: "plumb-leak",
    safetyWarning: "Turn off the sub-meter angle valve immediately to prevent under-sink wood cabinetry water rot."
  },
  {
    id: "preset-mcb-scorch",
    category: "electrical",
    label: "Burnt Switchboard / MCB Terminal Scorch",
    sampleImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
    detectedIssue: "Phase Terminal Arcing & Thermal Overload Insulation Melt",
    severity: "Critical",
    confidence: 98.8,
    boundingBoxes: [
      { top: "28%", left: "30%", width: "40%", height: "38%", label: "Carbonized Bakelite / Contact Arc", color: "#DC2626" },
      { top: "62%", left: "45%", width: "26%", height: "25%", label: "Loose Neutral Thermal Deform", color: "#F97316" }
    ],
    diagnosisSummary: "High thermal discoloration detected on the 16A power socket terminal screw. A loose contact caused continuous micro-arcing under inductive motor load (>2000W), melting the wire sheath and posing immediate fire risk.",
    requiredParts: [
      { name: "Flame-Retardant 16A Modular Switch & Shutter Socket", cost: 240 },
      { name: "Heat-Resistant 4.0 sq.mm FRLS Copper Wire (2m)", cost: 140 },
      { name: "C-Curve 20A Single Pole Miniature Circuit Breaker", cost: 290 }
    ],
    laborEstimate: 399,
    estimatedDurationMinutes: 40,
    matchedServiceId: "elec-tripping",
    safetyWarning: "Do not touch the switchboard with bare hands. Isolate the main distribution box breaker before technician arrives."
  },
  {
    id: "preset-ac-frost",
    category: "ac-repair",
    label: "AC Cooling Coil Frosting & Gas Restriction",
    sampleImage: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80",
    detectedIssue: "Sub-Zero Evaporator Ice Build-up due to Low Refrigerant Gas",
    severity: "High",
    confidence: 95.2,
    boundingBoxes: [
      { top: "25%", left: "20%", width: "60%", height: "45%", label: "Solid Ice Layer on Aluminium Fins", color: "#06B6D4" },
      { top: "68%", left: "35%", width: "30%", height: "20%", label: "Choked Blower Dust Deposit", color: "#EAB308" }
    ],
    diagnosisSummary: "Visual texture analysis detected solid ice crusting across 65% of the copper heat exchange matrix. Combined with choked cross-flow blower blades, the suction pressure is running below 55 PSI (normal is 115-130 PSI).",
    requiredParts: [
      { name: "Refrigerant Gas Leak Lock Sealant", cost: 350 },
      { name: "R32 Pure Refrigerant Top-up (500g)", cost: 850 },
      { name: "Antibacterial Evaporator Deep Clean Solution", cost: 150 }
    ],
    laborEstimate: 599,
    estimatedDurationMinutes: 65,
    matchedServiceId: "ac-jet-wash",
    safetyWarning: "Switch AC mode from Cool to Fan-Only to melt ice naturally and avoid compressor hydraulic shock."
  },
  {
    id: "preset-washing-drum",
    category: "appliances",
    label: "Washing Machine Drum Wobble & Suspension Wear",
    sampleImage: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=800&q=80",
    detectedIssue: "Front Load Drum Spider Arm Fracture & Hydraulic Strut Failure",
    severity: "Medium",
    confidence: 93.6,
    boundingBoxes: [
      { top: "35%", left: "28%", width: "44%", height: "46%", label: "Radial Drum Play (> 12mm)", color: "#8B5CF6" },
      { top: "75%", left: "15%", width: "25%", height: "18%", label: "Bottom Shock Absorber Oil Leak", color: "#F59E0B" }
    ],
    diagnosisSummary: "Optical displacement check reveals an eccentric rotation axis of the stainless steel inner tub. The hydraulic suspension damper has lost pneumatic resistance, causing violent vibration and banging noise during high-RPM spin cycles.",
    requiredParts: [
      { name: "Heavy Duty Friction Damper Struts (Pair)", cost: 580 },
      { name: "Synthetic Poly-V Drive Belt (6PJE 1195)", cost: 320 }
    ],
    laborEstimate: 349,
    estimatedDurationMinutes: 50,
    matchedServiceId: "app-washer",
    safetyWarning: "Avoid running high-spin (1200+ RPM) cycles until dampers are replaced to protect the outer tub casing."
  }
];

export const ACOUSTIC_DIAGNOSTICS_PRESETS = [
  {
    id: "audio-compressor-rattle",
    name: "Metallic Clicking & Stalled Compressor",
    sourceAppliance: "Double Door Refrigerator / Inverter AC",
    frequencyPeak: "120 Hz & 3.4 kHz",
    audioPattern: "rhythmic_pulse",
    detectedIssue: "PTC Starter Relay Overheating & Compressor Motor Stalling",
    confidence: 96.1,
    severity: "High",
    matchedServiceId: "app-fridge",
    repairRecommendation: "Replace faulty solid-state PTC starter relay & test running capacitor; check compressor coil winding resistance.",
    estimatedCost: 890,
    waveformData: [12, 18, 45, 90, 25, 14, 18, 95, 28, 12, 22, 92, 30, 15, 19, 88, 20, 10, 85, 24]
  },
  {
    id: "audio-blower-bearing",
    name: "High-Pitched Whistle & Squeal",
    sourceAppliance: "Split AC Indoor Blower Wheel / Ceiling Fan",
    frequencyPeak: "4.8 kHz & 6.2 kHz",
    audioPattern: "continuous_high_pitch",
    detectedIssue: "Dry Bush Bearing Friction & Blower Shaft Misalignment",
    confidence: 94.7,
    severity: "Medium",
    matchedServiceId: "ac-jet-wash",
    repairRecommendation: "Lubricate sintered bronze bushing with high-temp synthetic grease; re-center dynamic blower rotor.",
    estimatedCost: 599,
    waveformData: [65, 70, 78, 85, 92, 90, 88, 85, 82, 84, 88, 91, 95, 90, 86, 82, 80, 85, 90, 88]
  },
  {
    id: "audio-water-hammer",
    name: "Loud Thump & Pipeline Knocking",
    sourceAppliance: "Bathroom Plumbing & Booster Pump System",
    frequencyPeak: "80 Hz Sub-Harmonic",
    audioPattern: "shockwave_burst",
    detectedIssue: "Hydraulic Shock (Water Hammer) & Missing Expansion Chamber",
    confidence: 92.3,
    severity: "Medium",
    matchedServiceId: "plumb-tank",
    repairRecommendation: "Install miniature in-line water hammer arrestor and adjust booster pump cut-off pressure transducer.",
    estimatedCost: 680,
    waveformData: [8, 10, 15, 100, 75, 40, 20, 12, 9, 8, 11, 95, 68, 35, 18, 10, 9, 12, 85, 50]
  }
];

export const SYMPTOM_CHECKER_NODES = [
  {
    id: "step-1",
    question: "Where is the problem occurring in your home?",
    options: [
      { text: "Bathroom & Kitchen Plumbing", next: "step-plumb" },
      { text: "Electrical, Lights & Sockets", next: "step-elec" },
      { text: "Air Conditioner & Cooling", next: "step-ac" },
      { text: "Major Home Appliance", next: "step-app" }
    ]
  },
  {
    id: "step-plumb",
    question: "What is the primary symptom with your plumbing?",
    options: [
      { text: "Water is continuously leaking or pooling", resultPreset: "preset-pipe-corrosion" },
      { text: "Water drains extremely slowly or is backed up", serviceId: "plumb-drain" },
      { text: "Tap handle is loose or won't turn off", serviceId: "plumb-tap" }
    ]
  },
  {
    id: "step-elec",
    question: "What electrical problem are you facing?",
    options: [
      { text: "MCB keeps tripping when turning on an appliance", resultPreset: "preset-mcb-scorch" },
      { text: "Switch has black marks or makes buzzing sounds", resultPreset: "preset-mcb-scorch" },
      { text: "Fan is running very slowly even at max speed", serviceId: "elec-fan" }
    ]
  },
  {
    id: "step-ac",
    question: "What is your AC doing?",
    options: [
      { text: "Blowing warm air or has ice inside", resultPreset: "preset-ac-frost" },
      { text: "Water is dripping from the indoor unit", serviceId: "ac-jet-wash" },
      { text: "Needs seasonal deep cleaning & foam service", serviceId: "ac-jet-wash" }
    ]
  },
  {
    id: "step-app",
    question: "Which appliance has the issue?",
    options: [
      { text: "Washing machine shakes violently or won't spin", resultPreset: "preset-washing-drum" },
      { text: "Refrigerator freezer cold but bottom compartment warm", serviceId: "app-fridge" },
      { text: "Water purifier taste is bad / beep sound", serviceId: "app-ro" }
    ]
  }
];
