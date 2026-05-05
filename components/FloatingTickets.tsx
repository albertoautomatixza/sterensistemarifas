'use client';

import type { CSSProperties } from 'react';

const TICKET_IMAGE = '/images/participation-ticket.png';

type TicketFlight = {
  delay: string;
  startY: string;
  midY: string;
  endY: string;
  angle: string;
  scale: string;
  opacity: string;
  z: number;
};

type FloatingLight = {
  x: string;
  y: string;
  size: string;
  delay: string;
  duration: string;
  opacity: string;
  rotate: string;
};

const TICKETS: TicketFlight[] = [
  {
    delay: '0s',
    startY: '-4%',
    midY: '10%',
    endY: '26%',
    angle: '-7deg',
    scale: '0.78',
    opacity: '1',
    z: 3,
  },
  {
    delay: '-2.6s',
    startY: '8%',
    midY: '22%',
    endY: '38%',
    angle: '-5deg',
    scale: '0.72',
    opacity: '0.86',
    z: 2,
  },
  {
    delay: '-5.2s',
    startY: '-16%',
    midY: '0%',
    endY: '18%',
    angle: '-9deg',
    scale: '0.66',
    opacity: '0.72',
    z: 1,
  },
];

const AMBIENT_LIGHTS: FloatingLight[] = [
  {
    x: '6%',
    y: '7%',
    size: '74px',
    delay: '-0.8s',
    duration: '5.2s',
    opacity: '0.88',
    rotate: '-8deg',
  },
  {
    x: '42%',
    y: '13%',
    size: '52px',
    delay: '-4s',
    duration: '4.8s',
    opacity: '0.72',
    rotate: '18deg',
  },
  {
    x: '78%',
    y: '6%',
    size: '62px',
    delay: '-2.4s',
    duration: '4.4s',
    opacity: '0.8',
    rotate: '12deg',
  },
  {
    x: '12%',
    y: '76%',
    size: '86px',
    delay: '-1.5s',
    duration: '6s',
    opacity: '0.78',
    rotate: '4deg',
  },
  {
    x: '54%',
    y: '86%',
    size: '60px',
    delay: '-3.8s',
    duration: '5.1s',
    opacity: '0.68',
    rotate: '-18deg',
  },
  {
    x: '88%',
    y: '72%',
    size: '82px',
    delay: '-3.2s',
    duration: '5.6s',
    opacity: '0.82',
    rotate: '-14deg',
  },
];

export function FloatingTicketsContainer() {
  return (
    <div className="floating-ticket-scene pointer-events-none absolute inset-0 flex items-start justify-center select-none" style={{overflow: 'visible'}}>
      <div className="ticket-stage relative w-full" style={{overflow: 'visible'}}>
        {AMBIENT_LIGHTS.map((light, index) => (
          <span
            key={index}
            className="ambient-spark"
            style={
              {
                '--spark-x': light.x,
                '--spark-y': light.y,
                '--spark-size': light.size,
                '--spark-delay': light.delay,
                '--spark-duration': light.duration,
                '--spark-opacity': light.opacity,
                '--spark-rotate': light.rotate,
              } as CSSProperties
            }
          >
            <span className="spark-core" />
          </span>
        ))}

        {TICKETS.map((ticket, index) => (
          <div
            key={index}
            className="ticket-flight absolute left-0 top-0"
            style={
              {
                zIndex: ticket.z,
                '--delay': ticket.delay,
                '--start-y': ticket.startY,
                '--mid-y': ticket.midY,
                '--end-y': ticket.endY,
                '--angle': ticket.angle,
                '--scale': ticket.scale,
                '--opacity': ticket.opacity,
              } as CSSProperties
            }
          >
            <span className="ticket-comet ticket-comet-a" />
            <span className="ticket-comet ticket-comet-b" />
            <span className="ticket-spark ticket-spark-a" />
            <span className="ticket-spark ticket-spark-b" />
            <img
              src={TICKET_IMAGE}
              alt=""
              className="h-full w-full object-contain"
              draggable={false}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .ticket-flight {
          --enter-x: 82%;
          --focus-x: -8%;
          --leave-x: -58%;
          --exit-x: -112%;
          width: min(116vw, 430px);
          aspect-ratio: 3 / 2;
          opacity: 0;
          animation: ticketFlight 7.8s cubic-bezier(0.45, 0, 0.2, 1) var(--delay)
            infinite both;
          filter: drop-shadow(0 30px 42px rgba(0, 20, 50, 0.34))
            drop-shadow(0 0 24px rgba(0, 163, 224, 0.2));
          transform-origin: center;
          will-change: transform, opacity;
        }

        .floating-ticket-scene {
          padding-top: 0.25rem;
        }

        .ticket-stage {
          height: 300px;
          max-width: 100%;
          perspective: 820px;
          overflow: visible;
        }

        .ambient-spark {
          position: absolute;
          left: var(--spark-x);
          top: var(--spark-y);
          width: var(--spark-size);
          height: var(--spark-size);
          opacity: 0;
          transform: rotate(var(--spark-rotate));
          animation: ambientSpark var(--spark-duration) ease-in-out var(--spark-delay) infinite;
          filter: blur(0.45px);
          mix-blend-mode: screen;
          z-index: 4;
        }

        .ambient-spark::before,
        .ambient-spark::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          border-radius: 999px;
          transform: translate(-50%, -50%);
          background: linear-gradient(90deg, transparent, rgba(190, 239, 255, 0.95), transparent);
          filter: blur(0.35px) drop-shadow(0 0 12px rgba(0, 190, 255, 0.95))
            drop-shadow(0 0 28px rgba(114, 215, 255, 0.55));
        }

        .ambient-spark::before {
          width: 100%;
          height: 3px;
        }

        .ambient-spark::after {
          width: 3px;
          height: 100%;
          background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.9), transparent);
        }

        .spark-core {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 18px rgba(255, 255, 255, 0.9), 0 0 30px rgba(0, 190, 255, 0.9),
            0 0 54px rgba(0, 163, 224, 0.62);
          filter: blur(0.75px);
          transform: translate(-50%, -50%);
        }

        .ticket-comet,
        .ticket-spark {
          position: absolute;
          pointer-events: none;
          mix-blend-mode: screen;
          z-index: 2;
        }

        .ticket-comet {
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.92), rgba(0, 204, 255, 0.72), transparent);
          filter: drop-shadow(0 0 8px rgba(0, 196, 255, 0.75));
          transform: rotate(var(--comet-rotate));
          transform-origin: center;
          animation: cometPulse 1.8s ease-in-out infinite;
        }

        .ticket-comet-a {
          left: -4%;
          top: 46%;
          width: 26%;
          --comet-rotate: -4deg;
        }

        .ticket-comet-b {
          right: -2%;
          top: 33%;
          width: 18%;
          --comet-rotate: -6deg;
          animation-delay: -0.9s;
        }

        .ticket-spark {
          width: 28px;
          height: 28px;
          transform: rotate(18deg);
          animation: ticketSpark 2.4s ease-in-out infinite;
        }

        .ticket-spark::before,
        .ticket-spark::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          border-radius: 999px;
          transform: translate(-50%, -50%);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.95), transparent);
          filter: drop-shadow(0 0 7px rgba(0, 195, 255, 0.8));
        }

        .ticket-spark::before {
          width: 100%;
          height: 2px;
        }

        .ticket-spark::after {
          width: 2px;
          height: 100%;
          background: linear-gradient(180deg, transparent, rgba(201, 240, 255, 0.95), transparent);
        }

        .ticket-spark-a {
          left: 10%;
          top: 73%;
        }

        .ticket-spark-b {
          right: 6%;
          top: 26%;
          width: 22px;
          height: 22px;
          animation-delay: -1.2s;
        }

        @keyframes ticketFlight {
          0% {
            opacity: 0;
            transform: translate3d(var(--enter-x), var(--start-y), -80px) rotateZ(var(--angle))
              rotateY(-12deg) scale(var(--scale));
          }
          14% {
            opacity: var(--opacity);
          }
          42% {
            opacity: var(--opacity);
            transform: translate3d(var(--focus-x), var(--mid-y), 0) rotateZ(var(--angle))
              rotateY(-6deg) scale(var(--scale));
          }
          72% {
            opacity: var(--opacity);
            transform: translate3d(var(--leave-x), var(--end-y), 20px) rotateZ(var(--angle))
              rotateY(2deg) scale(var(--scale));
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--exit-x), calc(var(--end-y) + 16%), -60px)
              rotateZ(var(--angle)) rotateY(8deg) scale(var(--scale));
          }
        }

        @keyframes ambientSpark {
          0%,
          100% {
            opacity: 0;
            transform: translate3d(0, 8px, 0) rotate(var(--spark-rotate)) scale(0.72);
          }
          38%,
          62% {
            opacity: var(--spark-opacity);
            transform: translate3d(0, 0, 0) rotate(var(--spark-rotate)) scale(1);
          }
        }

        @keyframes cometPulse {
          0%,
          100% {
            opacity: 0.35;
            transform: rotate(var(--comet-rotate)) translateX(-6px) scaleX(0.72);
          }
          50% {
            opacity: 0.95;
            transform: rotate(var(--comet-rotate)) translateX(6px) scaleX(1);
          }
        }

        @keyframes ticketSpark {
          0%,
          100% {
            opacity: 0;
            transform: rotate(18deg) scale(0.5);
          }
          45%,
          64% {
            opacity: 0.9;
            transform: rotate(18deg) scale(1);
          }
        }

        @media (min-width: 420px) {
          .ticket-stage {
            height: 320px;
          }

          .ticket-flight {
            width: min(108vw, 500px);
          }
        }

        @media (min-width: 640px) {
          .floating-ticket-scene {
            padding-top: 0;
          }

          .ticket-stage {
            height: 360px;
            max-width: 580px;
            perspective: 980px;
          }

          .ticket-flight {
            --enter-x: 90%;
            --focus-x: 2%;
            --leave-x: -46%;
            --exit-x: -112%;
            width: min(88vw, 560px);
          }

          .ambient-spark {
            filter: blur(0.5px);
          }
        }

        @media (min-width: 768px) {
          .floating-ticket-scene {
            transform: translateY(-2.5rem);
          }

          .ticket-stage {
            height: 460px;
            max-width: 680px;
            perspective: 1100px;
          }

          .ticket-flight {
            --enter-x: 96%;
            --focus-x: 12%;
            --leave-x: -38%;
            --exit-x: -112%;
            width: min(88vw, 620px);
          }
        }
      `}</style>
    </div>
  );
}
