import { useState, useEffect } from 'react';
import { CheckCircle2, Zap, Droplets } from 'lucide-react';

interface FuelingSplashScreenProps {
  onComplete: () => void;
}

export function FuelingSplashScreen({ onComplete }: FuelingSplashScreenProps) {
  const [litres, setLitres] = useState(0);
  const [percent, setPercent] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const pricePerLitre = 135; // KES/L PMS
  const targetLitres = 45;

  const phases = [
    'Connecting to Pump Terminal...',
    'Dispensing Super Petrol (PMS) into Vehicle...',
    'Synchronizing Fuel Storage & Flowmeter Readings...',
    'Fueling Complete · Welcome to Tarita Petroleum',
  ];

  useEffect(() => {
    const duration = 1500; // total duration in ms (splash ~2s including 500ms fade-out)
    const intervalTime = 30;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = Math.min(1, currentStep / steps);
      
      // Easing function for realistic pumping acceleration and finish
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      const currentLitres = parseFloat((eased * targetLitres).toFixed(2));
      setLitres(currentLitres);
      setPercent(Math.round(eased * 100));

      if (progress < 0.25) {
        setPhaseIndex(0);
      } else if (progress < 0.7) {
        setPhaseIndex(1);
      } else if (progress < 0.95) {
        setPhaseIndex(2);
      } else {
        setPhaseIndex(3);
      }

      if (currentStep >= steps) {
        clearInterval(timer);
        setIsDone(true);
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  const totalCost = (litres * pricePerLitre).toFixed(2);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-[#080e1a] text-white p-4 sm:p-8 overflow-hidden select-none animate-in fade-in duration-300">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e3a5f_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Top Header Branding */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-center pt-2 sm:pt-4">
        <div className="h-14 sm:h-16 px-5 py-2 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-cyan-500/10">
          <img src="/tarita_logo.png" alt="Tarita Petroleum Logo" className="h-full w-auto object-contain" />
        </div>
      </div>

      {/* Centerpiece: Animated Fueling Scene (Car + Fuel Dispenser + Active Nozzle) */}
      <div className="relative z-10 w-full max-w-3xl my-auto py-4 flex flex-col items-center">
        {/* Floating Digital Fueling Meter HUD */}
        <div className="w-full max-w-md bg-[#0e1b2e]/90 backdrop-blur-md rounded-2xl border border-amber-500/30 shadow-2xl p-4 mb-4 transform transition-all duration-300">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
                BAY 01 · ACTIVE DISPENSING
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
              PMS (PETROL)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Litres Counter */}
            <div className="bg-[#070d18] rounded-xl p-3 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Volume Dispensed
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400 tracking-tight">
                  {litres.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-slate-400">L</span>
              </div>
            </div>

            {/* Total KES Value */}
            <div className="bg-[#070d18] rounded-xl p-3 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Amount (KES)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-400 tracking-tight">
                  {Number(totalCost).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle Fuel Gauge Bar */}
          <div className="mt-3 pt-2">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Droplets className="w-3 h-3 text-amber-400" />
                Vehicle Fuel Tank Level
              </span>
              <span className={`font-mono font-bold ${percent === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {percent}% {percent === 100 ? '(FULL)' : ''}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-75 shadow-sm ${
                  percent === 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-emerald-500/50'
                    : 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-amber-500/50'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Detailed SVG Illustration: Fuel Pump + Hose + Road Tanker Truck */}
        <div className="w-full max-w-2xl aspect-[16/7] max-h-60 sm:max-h-72 flex items-center justify-center">
          <svg
            viewBox="0 0 700 280"
            className="w-full h-full drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="pumpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#090d16" />
              </linearGradient>
              <linearGradient id="tankBody" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="30%" stopColor="#d97706" />
                <stop offset="70%" stopColor="#b45309" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
              <linearGradient id="cabPaint" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a5f" />
                <stop offset="60%" stopColor="#0f2040" />
                <stop offset="100%" stopColor="#060e1f" />
              </linearGradient>
              <linearGradient id="windowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.25" />
              </linearGradient>
              <linearGradient id="fuelFlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <radialGradient id="headlightBeam" cx="100%" cy="50%" r="100%">
                <stop offset="0%" stopColor="#fde047" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#fde047" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="tankShine" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
                <stop offset="40%" stopColor="#ffffff" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Ground */}
            <line x1="10" y1="245" x2="690" y2="245" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            <line x1="30" y1="252" x2="670" y2="252" stroke="#0f172a" strokeWidth="1" strokeDasharray="10 10" />

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* FUEL PUMP DISPENSER */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <rect x="30" y="90" width="68" height="155" rx="8" fill="url(#pumpGrad)" stroke="#334155" strokeWidth="2" />
            <rect x="23" y="240" width="82" height="8" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            {/* Crown */}
            <rect x="34" y="94" width="60" height="22" rx="4" fill="#0284c7" />
            <text x="64" y="109" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" letterSpacing="1">TARITA</text>
            {/* Screen */}
            <rect x="38" y="124" width="52" height="40" rx="4" fill="#070c14" stroke="#f59e0b" strokeWidth="1" />
            <text x="42" y="136" fill="#38bdf8" fontSize="6.5" fontFamily="monospace" fontWeight="bold">KES 135/L</text>
            <text x="42" y="147" fill="#4ade80" fontSize="7.5" fontFamily="monospace" fontWeight="bold">{litres.toFixed(1)} L</text>
            <text x="42" y="158" fill="#facc15" fontSize="6.5" fontFamily="monospace">{(litres * 135).toFixed(0)} KES</text>
            {/* Nozzle holsters */}
            <rect x="38" y="172" width="14" height="30" rx="3" fill="#0b111e" stroke="#334155" strokeWidth="1" />
            <rect x="56" y="172" width="14" height="30" rx="3" fill="#0b111e" stroke="#334155" strokeWidth="1" />
            <circle cx="45" cy="183" r="3" fill="#3b82f6" />
            <circle cx="63" cy="183" r="3" fill="#f59e0b" />
            {/* Hose outlet */}
            <circle cx="90" cy="190" r="5" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* ROAD TANKER TRUCK */}
            {/* ═══════════════════════════════════════════════════════════ */}

            {/* Truck Shadow */}
            <ellipse cx="450" cy="247" rx="240" ry="8" fill="#020617" opacity="0.75" />

            {/* === TANKER CYLINDER BODY === */}
            {/* Main cylinder (elongated rectangle with rounded ends) */}
            <rect x="230" y="118" width="350" height="100" rx="50" fill="url(#tankBody)" stroke="#92400e" strokeWidth="2" />
            {/* Shine overlay */}
            <rect x="230" y="118" width="350" height="100" rx="50" fill="url(#tankShine)" />
            {/* Tank band stripes (safety bands) */}
            <line x1="310" y1="118" x2="310" y2="218" stroke="#92400e" strokeWidth="3" strokeOpacity="0.6" />
            <line x1="390" y1="118" x2="390" y2="218" stroke="#92400e" strokeWidth="3" strokeOpacity="0.6" />
            <line x1="470" y1="118" x2="470" y2="218" stroke="#92400e" strokeWidth="3" strokeOpacity="0.6" />
            {/* FLAMMABLE label on tank */}
            <rect x="340" y="148" width="100" height="22" rx="3" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="390" y="163" fill="#f59e0b" fontSize="7" fontWeight="bold" textAnchor="middle" letterSpacing="1.5">FLAMMABLE</text>
            {/* Tarita Petroleum text on tank */}
            <text x="390" y="140" fill="#fef3c7" fontSize="8" fontWeight="bold" textAnchor="middle" letterSpacing="1" opacity="0.9">TARITA PETROLEUM · PMS/AGO</text>
            {/* Top access hatch/manhole */}
            <ellipse cx="350" cy="120" rx="20" ry="7" fill="#92400e" stroke="#fbbf24" strokeWidth="1.5" />
            <ellipse cx="430" cy="120" rx="20" ry="7" fill="#92400e" stroke="#fbbf24" strokeWidth="1.5" />
            {/* Rear outlet valve (where hose connects) */}
            <rect x="224" y="163" width="14" height="12" rx="2" fill="#b45309" stroke="#fbbf24" strokeWidth="1.5" />
            <circle cx="231" cy="169" r="4" fill="#0b111e" stroke="#fbbf24" strokeWidth="1" />

            {/* === TRUCK CAB (front, right side of tanker) === */}
            <path
              d="M 570 145 L 570 218 L 638 218 L 638 168
                 Q 638 145 618 145 Z"
              fill="url(#cabPaint)"
              stroke="#1e40af"
              strokeWidth="2"
            />
            {/* Cab roof/visor */}
            <path
              d="M 570 145 L 618 145 Q 636 145 638 168 L 636 148 Q 625 132 600 130 L 575 132 Z"
              fill="#0c1a35"
              stroke="#1e40af"
              strokeWidth="1.5"
            />
            {/* Cab windshield */}
            <path
              d="M 580 148 L 628 148 L 628 178 L 578 178 Z"
              fill="url(#windowGrad)"
              stroke="#38bdf8"
              strokeWidth="1"
              strokeOpacity="0.5"
              rx="3"
            />
            {/* Cab door */}
            <line x1="614" y1="178" x2="614" y2="218" stroke="#0f172a" strokeWidth="2" />
            <rect x="600" y="192" width="10" height="4" rx="2" fill="#475569" />
            {/* Headlight */}
            <rect x="631" y="180" width="10" height="8" rx="2" fill="#fef08a" opacity="0.95" />
            <polygon points="641,184 690,165 690,210" fill="url(#headlightBeam)" />
            {/* Front bumper */}
            <rect x="635" y="210" width="8" height="10" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            {/* Exhaust stack */}
            <rect x="567" y="105" width="8" height="40" rx="3" fill="#334155" stroke="#475569" strokeWidth="1" />
            <ellipse cx="571" cy="105" rx="5" ry="3" fill="#475569" />

            {/* === WHEELS === */}
            {/* Rear axle 1 – left pair */}
            <circle cx="275" cy="225" r="22" fill="#090d16" stroke="#334155" strokeWidth="2" />
            <circle cx="275" cy="225" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="275" cy="225" r="5" fill="#475569" />
            {/* Rear axle 1 – right (dual tyre) */}
            <circle cx="303" cy="225" r="22" fill="#090d16" stroke="#334155" strokeWidth="2" />
            <circle cx="303" cy="225" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="303" cy="225" r="5" fill="#475569" />

            {/* Rear axle 2 – left pair */}
            <circle cx="365" cy="225" r="22" fill="#090d16" stroke="#334155" strokeWidth="2" />
            <circle cx="365" cy="225" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="365" cy="225" r="5" fill="#475569" />
            {/* Rear axle 2 – right */}
            <circle cx="393" cy="225" r="22" fill="#090d16" stroke="#334155" strokeWidth="2" />
            <circle cx="393" cy="225" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="393" cy="225" r="5" fill="#475569" />

            {/* Front axle (under cab) */}
            <circle cx="613" cy="225" r="22" fill="#090d16" stroke="#334155" strokeWidth="2" />
            <circle cx="613" cy="225" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="613" cy="225" r="5" fill="#475569" />

            {/* Chassis / frame rail */}
            <rect x="220" y="210" width="420" height="10" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1" />

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* FUEL HOSE & NOZZLE (Pump → Tanker Rear Outlet) */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {/* Outer rubber hose */}
            <path
              d="M 93 190 C 120 230, 155 255, 190 248 C 215 240, 218 210, 228 172"
              stroke="#0f172a"
              strokeWidth="9"
              fill="none"
              strokeLinecap="round"
            />
            {/* Hose inner highlight */}
            <path
              d="M 93 190 C 120 230, 155 255, 190 248 C 215 240, 218 210, 228 172"
              stroke="#334155"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Animated fuel stream */}
            <path
              d="M 93 190 C 120 230, 155 255, 190 248 C 215 240, 218 210, 228 172"
              stroke="url(#fuelFlow)"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="8 6"
              style={{
                strokeDashoffset: 100,
                animation: 'pulseFuel 0.8s linear infinite',
              }}
            />
            {/* Nozzle coupler at tanker */}
            <g transform="translate(224, 162)">
              <path d="M 0 8 L 10 2 L 16 5 L 9 12 Z" fill="#64748b" stroke="#0f172a" strokeWidth="1" />
              <path d="M 5 7 L -5 13" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
              <path d="M 10 2 L 20 -3" stroke="#cbd5e1" strokeWidth="3.5" strokeLinecap="round" />
            </g>
            {/* Fuel vapor glow at coupling */}
            <circle cx="231" cy="163" r="6" fill="#f59e0b" opacity="0.25" className="animate-ping" />
            <circle cx="231" cy="163" r="3" fill="#fef08a" opacity="0.9" />
          </svg>
        </div>

        {/* Phase Status & Progress Bar */}
        <div className="w-full max-w-md mt-3 flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            {isDone ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-in zoom-in" />
            ) : (
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            )}
            <span className={isDone ? 'text-emerald-300 font-bold' : 'text-slate-200'}>
              {phases[phaseIndex]}
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-400 transition-all duration-100 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between text-[11px] text-slate-500 border-t border-white/5 pt-3">
        <span>© 2026 Tarita Petroleum · High-Performance Fuel Operations</span>
        <span className="hidden sm:inline font-mono text-slate-400">v2.4.0 · KRA eTIMS &amp; EPRA Regulated</span>
      </div>
    </div>
  );
}
