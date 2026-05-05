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
    x: '18%',
    y: '68%',
    size: '58px',
    delay: '-3.1s',
    duration: '5.6s',
    opacity: '0.7',
    rotate: '-22deg',
  },
  {
    x: '64%',
    y: '72%',
    size: '68px',
    delay: '-1.6s',
    duration: '5s',
    opacity: '0.82',
    rotate: '6deg',
  },
  {
    x: '88%',
    y: '48%',
    size: '46px',
    delay: '-2s',
    duration: '4.2s',
    opacity: '0.65',
    rotate: '-14deg',
  },
];

export function FloatingTicketsContainer() {
  return (
    <div
      className="floating-ticket-scene pointer-events-none absolute inset-0 flex items-start justify-center select-none"
      style={{ overflow: 'visible' }}
    >
      <div className="ticket-stage relative w-full" style={{ overflow: 'visible' }}>
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
        .floating-ticket-scene {
          perspective: 1400px;
        }

        .ticket-stage {
          min-height: 420px;
          transform-style: preserve-3d;
        }

        .ticket-flight {
          width: min(116vw, 430px);
          aspect-ratio: 3 / 2;
          --enter-x: 108%;
          --focus-x: 18%;
          --leave-x: -46%;
          --exit-x: -120%;
          opacity: 0;
          transform-style: preserve-3d;
          animation: ticketFlight 11s cubic-bezier(0.42, 0, 0.22, 1) var(--delay)
            infinite both;
          filter: drop-shadow(0 26px 34px rgba(1, 19, 48, 0.38))
            drop-shadow(0 0 22px rgba(0, 163, 224, 0.28));
          will-change: transform, opacity;
        }

        .ticket-flight img {
          pointer-events: none;
        }

        .ticket-comet,
        .ticket-spark {
          position: absolute;
          pointer-events: none;
          border-radius: 9999px;
          filter: blur(6px);
          opacity: 0;
          animation: cometPulse 11s ease-in-out var(--delay) infinite both;
        }

        .ticket-comet-a {
          top: 42%;
          left: -62%;
          width: 70%;
          height: 18%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(125, 211, 252, 0.7) 55%,
            rgba(255, 255, 255, 0.95) 100%
          );
        }

        .ticket-comet-b {
          top: 58%;
          left: -40%;
          width: 50%;
          height: 10%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(14, 165, 233, 0.5) 55%,
            rgba(191, 219, 254, 0.85) 100%
          );
        }

        .ticket-spark-a {
          top: 20%;
          left: -8%;
          width: 14%;
          height: 14%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.95), rgba(125, 211, 252, 0));
        }

        .ticket-spark-b {
          top: 68%;
          left: 6%;
          width: 9%;
          height: 9%;
          background: radial-gradient(circle, rgba(186, 230, 253, 0.9), rgba(125, 211, 252, 0));
        }

        .ambient-spark {
          position: absolute;
          top: var(--spark-y);
          left: var(--spark-x);
          width: var(--spark-size);
          height: var(--spark-size);
          transform: translate(-50%, -50%) rotate(var(--spark-rotate));
          opacity: 0;
          animation: sparkBreathe var(--spark-duration) ease-in-out var(--spark-delay) infinite both;
          pointer-events: none;
        }

        .spark-core {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.95) 0%,
              rgba(186, 230, 253, 0.6) 38%,
              rgba(14, 165, 233, 0) 72%
            );
          filter: blur(1px);
        }

        .spark-core::before,
        .spark-core::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.95) 50%,
            rgba(255, 255, 255, 0) 100%
          );
        }

        .spark-core::before {
          width: 120%;
          height: 4%;
        }

        .spark-core::after {
          width: 4%;
          height: 120%;
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

        @keyframes cometPulse {
          0%,
          100% {
            opacity: 0;
          }
          20%,
          72% {
            opacity: 0.9;
          }
        }

        @keyframes sparkBreathe {
          0%,
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--spark-rotate)) scale(0.6);
          }
          50% {
            opacity: var(--spark-opacity);
            transform: translate(-50%, -50%) rotate(var(--spark-rotate)) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
