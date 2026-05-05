'use client';

import type { CSSProperties } from 'react';

const PRIZE_IMAGE = '/images/prize-pack.png';

type Light = {
  x: string;
  y: string;
  size: string;
  delay: string;
  duration: string;
  opacity: string;
  rotate: string;
};

type Confetti = {
  x: string;
  y: string;
  color: string;
  delay: string;
  duration: string;
  rotate: string;
  scale: string;
};

const LIGHTS: Light[] = [
  { x: '10%', y: '18%', size: '58px', delay: '-0.4s', duration: '4.8s', opacity: '0.9', rotate: '-8deg' },
  { x: '34%', y: '8%', size: '42px', delay: '-2.9s', duration: '5.2s', opacity: '0.72', rotate: '14deg' },
  { x: '68%', y: '17%', size: '50px', delay: '-1.6s', duration: '4.4s', opacity: '0.82', rotate: '8deg' },
  { x: '88%', y: '32%', size: '62px', delay: '-3.6s', duration: '5.7s', opacity: '0.88', rotate: '-18deg' },
  { x: '15%', y: '78%', size: '52px', delay: '-2.2s', duration: '5.4s', opacity: '0.78', rotate: '18deg' },
  { x: '76%', y: '80%', size: '48px', delay: '-4.2s', duration: '5s', opacity: '0.74', rotate: '-10deg' },
];

const CONFETTI: Confetti[] = [
  { x: '7%', y: '22%', color: '#34d399', delay: '-0.5s', duration: '5.4s', rotate: '-12deg', scale: '0.9' },
  { x: '18%', y: '10%', color: '#fde68a', delay: '-2.4s', duration: '6s', rotate: '24deg', scale: '1.1' },
  { x: '30%', y: '24%', color: '#38bdf8', delay: '-4s', duration: '5.8s', rotate: '8deg', scale: '0.85' },
  { x: '50%', y: '8%', color: '#fb7185', delay: '-1.2s', duration: '6.4s', rotate: '-20deg', scale: '0.75' },
  { x: '72%', y: '13%', color: '#facc15', delay: '-3.1s', duration: '5.6s', rotate: '18deg', scale: '1' },
  { x: '90%', y: '52%', color: '#22c55e', delay: '-1.8s', duration: '6.2s', rotate: '-28deg', scale: '0.9' },
  { x: '12%', y: '68%', color: '#fb7185', delay: '-4.6s', duration: '6.5s', rotate: '14deg', scale: '1.2' },
  { x: '42%', y: '78%', color: '#4ade80', delay: '-2.8s', duration: '5.7s', rotate: '-18deg', scale: '0.85' },
  { x: '80%', y: '72%', color: '#fbbf24', delay: '-0.9s', duration: '6.1s', rotate: '22deg', scale: '1.05' },
];

export function PrizeShowcase() {
  return (
    <div className="prize-showcase relative -mx-6 mt-7 overflow-visible sm:-mx-8 md:-mx-10">
      <div className="prize-halo" />

      {LIGHTS.map((light, index) => (
        <span
          key={`light-${index}`}
          className="prize-light"
          style={
            {
              '--light-x': light.x,
              '--light-y': light.y,
              '--light-size': light.size,
              '--light-delay': light.delay,
              '--light-duration': light.duration,
              '--light-opacity': light.opacity,
              '--light-rotate': light.rotate,
            } as CSSProperties
          }
        >
          <span className="prize-light-core" />
        </span>
      ))}

      {CONFETTI.map((piece, index) => (
        <span
          key={`confetti-${index}`}
          className="prize-confetti"
          style={
            {
              '--confetti-x': piece.x,
              '--confetti-y': piece.y,
              '--confetti-color': piece.color,
              '--confetti-delay': piece.delay,
              '--confetti-duration': piece.duration,
              '--confetti-rotate': piece.rotate,
              '--confetti-scale': piece.scale,
            } as CSSProperties
          }
        />
      ))}

      <img
        src={PRIZE_IMAGE}
        alt="Premios tecnológicos Steren"
        className="relative z-[1] block w-full max-w-none object-contain drop-shadow-[0_28px_34px_rgba(0,15,35,0.42)]"
        draggable={false}
      />
      <div className="prize-bottom-glow" />

      <style jsx>{`
        .prize-showcase {
          isolation: isolate;
        }

        .prize-halo {
          position: absolute;
          inset: -18% -12% auto;
          height: 70%;
          background:
            radial-gradient(circle at 22% 42%, rgba(255, 255, 255, 0.48), transparent 20%),
            radial-gradient(circle at 82% 42%, rgba(0, 204, 255, 0.34), transparent 28%),
            radial-gradient(circle at 52% 28%, rgba(250, 204, 21, 0.28), transparent 30%);
          filter: blur(20px);
          opacity: 0.92;
          z-index: 2;
          pointer-events: none;
          animation: prizeHalo 5.8s ease-in-out infinite;
        }

        .prize-bottom-glow {
          position: absolute;
          left: 10%;
          right: 10%;
          bottom: -2%;
          height: 18%;
          border-radius: 999px;
          background: radial-gradient(ellipse at center, rgba(0, 195, 255, 0.34), transparent 68%);
          filter: blur(16px);
          opacity: 0.88;
          z-index: 2;
          pointer-events: none;
        }

        .prize-light {
          position: absolute;
          left: var(--light-x);
          top: var(--light-y);
          width: var(--light-size);
          height: var(--light-size);
          opacity: 0;
          transform: rotate(var(--light-rotate));
          animation: prizeLight var(--light-duration) ease-in-out var(--light-delay) infinite;
          filter: blur(0.45px);
          mix-blend-mode: screen;
          pointer-events: none;
          z-index: 3;
        }

        .prize-light::before,
        .prize-light::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          border-radius: 999px;
          transform: translate(-50%, -50%);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.95), transparent);
          filter: blur(0.6px) drop-shadow(0 0 10px rgba(255, 255, 255, 0.92))
            drop-shadow(0 0 24px rgba(0, 197, 255, 0.7));
        }

        .prize-light::before {
          width: 100%;
          height: 3px;
        }

        .prize-light::after {
          width: 3px;
          height: 100%;
          background: linear-gradient(180deg, transparent, rgba(225, 247, 255, 0.95), transparent);
        }

        .prize-light-core {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.95);
          box-shadow:
            0 0 16px rgba(255, 255, 255, 0.9),
            0 0 34px rgba(56, 189, 248, 0.76);
          transform: translate(-50%, -50%);
        }

        .prize-confetti {
          position: absolute;
          left: var(--confetti-x);
          top: var(--confetti-y);
          width: 16px;
          height: 6px;
          border-radius: 999px;
          background: var(--confetti-color);
          opacity: 0;
          z-index: 4;
          pointer-events: none;
          filter: drop-shadow(0 0 7px color-mix(in srgb, var(--confetti-color) 70%, white));
          animation: prizeConfetti var(--confetti-duration) ease-in-out var(--confetti-delay) infinite;
        }

        @keyframes prizeHalo {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(0.96);
            opacity: 0.72;
          }
          50% {
            transform: translate3d(0, 10px, 0) scale(1.04);
            opacity: 1;
          }
        }

        @keyframes prizeLight {
          0%,
          100% {
            opacity: 0;
            transform: translate3d(0, 8px, 0) rotate(var(--light-rotate)) scale(0.7);
          }
          42%,
          64% {
            opacity: var(--light-opacity);
            transform: translate3d(0, 0, 0) rotate(var(--light-rotate)) scale(1);
          }
        }

        @keyframes prizeConfetti {
          0% {
            opacity: 0;
            transform: translate3d(0, -8px, 0) rotate(var(--confetti-rotate))
              scale(var(--confetti-scale));
          }
          15%,
          78% {
            opacity: 0.88;
          }
          100% {
            opacity: 0;
            transform: translate3d(18px, 48px, 0) rotate(calc(var(--confetti-rotate) + 115deg))
              scale(var(--confetti-scale));
          }
        }

        @media (max-width: 767px) {
          .prize-showcase {
            margin-top: 1.5rem;
          }

          .prize-confetti {
            width: 13px;
            height: 5px;
          }
        }
      `}</style>
    </div>
  );
}
