/**
 * Comprehensive Catalog of On-Demand Home Services & Technician Specialties
 */
export const SERVICE_CATEGORIES = [
  {
    id: "plumbing",
    name: "Plumbing & Water Works",
    shortName: "Plumbing",
    icon: "wrench",
    iconColor: "#3B82F6",
    bgColor: "rgba(59, 130, 246, 0.12)",
    tagline: "Pipe leaks, blockages, taps & water motor fixes",
    badge: "Fast 30-min",
    services: [
      {
        id: "plumb-leak",
        title: "Pipe Leakage & Burst Repair",
        duration: "45 mins",
        basePrice: 349,
        rating: 4.89,
        reviewsCount: 1420,
        image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80",
        description: "Emergency repair of leaking concealed/exposed PVC, GI, or CPVC pipelines with high-pressure sealant and joint replacement.",
        included: ["Inspection & pressure testing", "Minor joint sealing & tightening", "30-day leak warranty"],
        excluded: ["Cost of replacement pipes/fittings", "Major wall tiling breakdown"],
        aiSuggested: true
      },
      {
        id: "plumb-tap",
        title: "Tap, Mixer & Faucet Installation",
        duration: "30 mins",
        basePrice: 199,
        rating: 4.92,
        reviewsCount: 890,
        image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
        description: "Precision installation or fixing of single lever mixers, bib taps, angle valves, or sensor faucets.",
        included: ["Old faucet removal", "Teflon tape seal & mounting", "Water flow calibration"],
        excluded: ["Spare faucet hardware"]
      },
      {
        id: "plumb-drain",
        title: "Drain & Sink Unclogging",
        duration: "40 mins",
        basePrice: 299,
        rating: 4.85,
        reviewsCount: 2100,
        image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=600&q=80",
        description: "Mechanical snake auger and eco-friendly chemical clearing for blocked kitchen sinks, bathroom floor traps, and washbasins.",
        included: ["Auger snake deep clearing", "Debris extraction & flushing", "Odor neutralization"],
        excluded: ["Main sewer line machine excavation"]
      },
      {
        id: "plumb-tank",
        title: "Water Tank & Pump Motor Repair",
        duration: "60 mins",
        basePrice: 499,
        rating: 4.91,
        reviewsCount: 640,
        image: "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80",
        description: "Overhead tank float valve replacement, booster pump pressure check, and motor start capacitor troubleshooting.",
        included: ["Motor electrical check", "Float ball valve alignment", "Dry run sensor test"],
        excluded: ["Motor rewinding hardware"]
      }
    ]
  },
  {
    id: "electrical",
    name: "Electrical & Power Systems",
    shortName: "Electrical",
    icon: "zap",
    iconColor: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.12)",
    tagline: "Short circuits, wiring, switchboards & lighting",
    badge: "Certified Pros",
    services: [
      {
        id: "elec-tripping",
        title: "MCB Tripping & Short Circuit Fix",
        duration: "45 mins",
        basePrice: 399,
        rating: 4.94,
        reviewsCount: 1830,
        image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80",
        description: "Diagnostic insulation test to trace hidden short circuits, overloaded neutral loops, and faulty MCB/RCCB breakers.",
        included: ["Phase & neutral megger load test", "Circuit isolation", "Safety breaker testing"],
        excluded: ["Concealed conduit wire replacement (> 5m)"],
        aiSuggested: true
      },
      {
        id: "elec-socket",
        title: "Switchboard & Power Socket Repair",
        duration: "30 mins",
        basePrice: 179,
        rating: 4.88,
        reviewsCount: 1205,
        image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
        description: "Repair burnt switches, loose modular connections, 16A heavy appliance sockets, and smart switch retrofits.",
        included: ["Switch panel safety test", "Earthing voltage verification", "Tightening terminal screws"],
        excluded: ["Smart switch module hardware cost"]
      },
      {
        id: "elec-fan",
        title: "Ceiling Fan Installation & Repair",
        duration: "35 mins",
        basePrice: 229,
        rating: 4.90,
        reviewsCount: 970,
        image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80",
        description: "Capacitor replacement, blade balancing to eliminate humming/wobbling, and new ceiling fan hook assembly.",
        included: ["Downrod mounting & safety clamp", "Speed regulator check", "Blade dynamic balancing"],
        excluded: ["New fan purchase"]
      },
      {
        id: "elec-inverter",
        title: "Inverter & Battery Backup Diagnosis",
        duration: "50 mins",
        basePrice: 449,
        rating: 4.93,
        reviewsCount: 780,
        image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80",
        description: "Specific gravity electrolyte check, distilled water top-up, inverter charging MOSFET inspection, and battery health report.",
        included: ["Battery terminal de-sulfation", "Load output test", "Charging circuit voltage calibration"],
        excluded: ["New battery replacement"]
      }
    ]
  },
  {
    id: "ac-repair",
    name: "Air Conditioning & HVAC",
    shortName: "AC Servicing",
    icon: "wind",
    iconColor: "#06B6D4",
    bgColor: "rgba(6, 182, 212, 0.12)",
    tagline: "Cooling issues, gas refill, foam wash & servicing",
    badge: "Top Rated",
    services: [
      {
        id: "ac-jet-wash",
        title: "Power Jet Deep Foam AC Service",
        duration: "60 mins",
        basePrice: 599,
        rating: 4.96,
        reviewsCount: 3840,
        image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=600&q=80",
        description: "High-pressure jet wash with antibacterial foam for indoor cooling coils, outdoor condenser fan, blower wheel, and drain tray.",
        included: ["Indoor unit cover unmounting", "High-pressure power jet wash", "Drain tray anti-clog treatment", "Gas pressure check"],
        excluded: ["Refrigerant gas top-up cost"],
        aiSuggested: true
      },
      {
        id: "ac-gas-charge",
        title: "AC Gas Leak Fix & Refrigerant Refill",
        duration: "75 mins",
        basePrice: 1499,
        rating: 4.91,
        reviewsCount: 1650,
        image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
        description: "Nitrogen leak detection, copper brazing joint repair, vacuum moisture purge, and 100% genuine R32/R410A gas refill by weight.",
        included: ["Soap bubble & electronic sniffer leak test", "Nitrogen pressure holding (24h warranty)", "Digital weight scale refill"],
        excluded: ["Compressor motor replacement"]
      },
      {
        id: "ac-install",
        title: "Split / Window AC Installation",
        duration: "90 mins",
        basePrice: 899,
        rating: 4.87,
        reviewsCount: 1120,
        image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
        description: "Standard wall-bracket mounting, core cutting, copper flare coupling, vacuuming, and complete installation test.",
        included: ["Indoor & outdoor mounting", "Copper pipe flaring & connection", "Vibration damping pads setup"],
        excluded: ["Extra copper piping (> 3m)", "Electrical power plug point wiring"]
      }
    ]
  },
  {
    id: "appliances",
    name: "Appliance Care & Repairs",
    shortName: "Appliances",
    icon: "tv",
    iconColor: "#8B5CF6",
    bgColor: "rgba(139, 92, 246, 0.12)",
    tagline: "Washing machines, refrigerators, microwaves & RO",
    badge: "90-Day Warranty",
    services: [
      {
        id: "app-fridge",
        title: "Refrigerator Cooling & Compressor Fix",
        duration: "55 mins",
        basePrice: 399,
        rating: 4.89,
        reviewsCount: 1490,
        image: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=600&q=80",
        description: "Troubleshoot no cooling, frost build-up, compressor clicking relay, thermostat fault, and door magnetic gasket replacement.",
        included: ["Compressor resistance check", "Defrost timer & bimetal test", "Capillary tube inspection"],
        excluded: ["New compressor replacement"],
        aiSuggested: true
      },
      {
        id: "app-washer",
        title: "Washing Machine Noise & Spin Repair",
        duration: "50 mins",
        basePrice: 349,
        rating: 4.90,
        reviewsCount: 2210,
        image: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=600&q=80",
        description: "Diagnosis for drum screeching, drain pump blockage, belt slippage, PCB error codes (E1/E3), and suspension rod damping.",
        included: ["Drain filter cleanout", "Belt tension tuning", "Error code digital scan"],
        excluded: ["Motor or gearbox rebuild parts"]
      },
      {
        id: "app-ro",
        title: "RO Water Purifier Filter & Membrane Service",
        duration: "40 mins",
        basePrice: 299,
        rating: 4.95,
        reviewsCount: 3100,
        image: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80",
        description: "TDS calibration, sediment filter flush, carbon block replacement, and RO booster pump pressure verification.",
        included: ["Input & output TDS level measurement", "Filter housing sanitization", "Leak check under pressure"],
        excluded: ["Replacement RO membrane cartridge cost"]
      },
      {
        id: "app-geyser",
        title: "Water Heater / Geyser Heating Coil Fix",
        duration: "45 mins",
        basePrice: 349,
        rating: 4.92,
        reviewsCount: 940,
        image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80",
        description: "Descale heating element, replace damaged thermostat, inspect anode rod, and prevent electrical leakage in bathroom water.",
        included: ["Heating coil descaling", "Thermostat cut-off calibration", "Earthing safety verification"],
        excluded: ["New heating coil element"]
      }
    ]
  },
  {
    id: "cleaning",
    name: "Deep Cleaning & Sanitization",
    shortName: "Cleaning",
    icon: "sparkles",
    iconColor: "#10B981",
    bgColor: "rgba(16, 185, 129, 0.12)",
    tagline: "Full home, kitchen, bathroom & sofa shampooing",
    badge: "Eco-Friendly",
    services: [
      {
        id: "clean-bath",
        title: "Intense Bathroom Stain & Tile Scrubbing",
        duration: "60 mins",
        basePrice: 449,
        rating: 4.93,
        reviewsCount: 4120,
        image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
        description: "Hard water scale removal from tiles, acid-free grout scrub, chrome fixture buffing, mirror polishing, and drain disinfection.",
        included: ["Tile grout rotary brush scrubbing", "Chrome tap descaling", "Mirror shine & floor sanitization"],
        excluded: ["Painting or silicone re-caulking"]
      },
      {
        id: "clean-sofa",
        title: "Fabric Sofa / Mattress Deep Shampoo",
        duration: "75 mins",
        basePrice: 599,
        rating: 4.88,
        reviewsCount: 1890,
        image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
        description: "Wet vacuum extraction, enzyme stain spot removal, antibacterial foam shampoo, and fiber rejuvenation.",
        included: ["Deep dust suction", "Foam injection & brush massage", "Industrial moisture extraction"],
        excluded: ["Leather dye restoration"]
      },
      {
        id: "clean-kitchen",
        title: "Kitchen Chimney & Degreasing Wash",
        duration: "90 mins",
        basePrice: 699,
        rating: 4.91,
        reviewsCount: 1340,
        image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80",
        description: "Baffle filter caustic soak, exhaust motor degreasing, slab oil scrub, and cabinet exterior wipe down.",
        included: ["Filter carbon/grease dissolution", "Chimney duct wipe", "Gas stove burner unclog"],
        excluded: ["Cabinet interior rearranging"]
      }
    ]
  },
  {
    id: "carpentry",
    name: "Carpentry & Furniture Assembly",
    shortName: "Carpentry",
    icon: "hammer",
    iconColor: "#D97706",
    bgColor: "rgba(217, 119, 6, 0.12)",
    tagline: "Door locks, hinges, furniture assembly & fixes",
    badge: "Master Craftsmen",
    services: [
      {
        id: "carp-lock",
        title: "Door Lock & Handle Installation",
        duration: "40 mins",
        basePrice: 249,
        rating: 4.92,
        reviewsCount: 920,
        image: "https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?auto=format&fit=crop&w=600&q=80",
        description: "Mortise lock fitting, cylindrical knob alignment, deadbolt installation, and keyhole precision chisel work.",
        included: ["Door chisel recessing", "Lock cylinder alignment", "Smooth latch strike testing"],
        excluded: ["Lock body purchase"]
      },
      {
        id: "carp-hinge",
        title: "Cabinet Hinges & Sliding Channel Fix",
        duration: "45 mins",
        basePrice: 299,
        rating: 4.86,
        reviewsCount: 750,
        image: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=600&q=80",
        description: "Hydraulic soft-close hinge replacement, drawer ball-bearing telescopic channel lubrication, and door sagging alignment.",
        included: ["Screw hole re-plugging with wood dowels", "Hinge 3D leveling adjustment", "Channel lubrication"],
        excluded: ["New hardware channels/hinges"]
      }
    ]
  }
];

export const POPULAR_PROMOTIONS = [
  {
    id: "promo-ai-free",
    title: "Instant AI Diagnostics",
    subtitle: "Upload photo or record noise to get 99% accurate repair cost estimation",
    code: "AIREADY",
    badge: "Zero Fee",
    action: "open-ai-scanner",
    gradient: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #3B82F6 100%)",
    icon: "cpu"
  },
  {
    id: "promo-monsoon",
    title: "AC & Monsoon Shield",
    subtitle: "Flat ₹150 OFF on Power Jet Servicing with free drainage check",
    code: "MONSOON150",
    badge: "Save ₹150",
    action: "category-ac-repair",
    gradient: "linear-gradient(135deg, #0F766E 0%, #0D9488 50%, #14B8A6 100%)",
    icon: "shield-check"
  },
  {
    id: "promo-urgent",
    title: "Emergency 30-Min Rush",
    subtitle: "Technician at your doorstep in under 30 minutes with live GPS beacon",
    code: "RUSH30",
    badge: "Lightning Fast",
    action: "category-plumbing",
    gradient: "linear-gradient(135deg, #B45309 0%, #D97706 50%, #F59E0B 100%)",
    icon: "zap"
  }
];
