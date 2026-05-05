'use client';

import type { CSSProperties } from 'react';

const TICKET_IMAGE = '/images/participation-ticket.png';

type TicketFlight = {
  delay: string;
  top: string;
  angle: string;
  scale: string;
  opacity: string;
  z: number;
};

const TICKETS: TicketFlight[] = [
  {
    delay: '0s',
    top: '18%',
    angle: '-8deg',
    scale: '1',
    opacity: '1',
    z: 3,
  },
  {
    delay: '-3s',
    top: '42%',
    angle: '-6deg',
    scale: '0.82',
    opacity: '0.9',
    z: 2,
  },
  {
    delay: '-6s',
    top: '2%',
    angle: '-10deg',
    scale: '0.7',
    opacity: '0.75',
    z: 1,
  },
];

export function FloatingTicketsContainer() {
  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      <div className="ticket-stage relative h-full w-full">
        {TICKETS.map((ticket, index) => (
          <div
            key={index}
            className="ticket-flight"
            style={
              {
                zIndex: ticket.z,
                top: ticket.top,
                '--delay': ticket.delay,
                '--angle': ticket.angle,
                '--scale': ticket.scale,
                '--opacity': ticket.opacity,
              } as CSSProperties
            }
          >
            <img
              src={TICKET_IMAGE}
              alt=""
              className="block h-auto w-full"
              draggable={false}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .ticket-stage {
          min-height: 300px;
        }

        .ticket-flight {
          position: absolute;
          left: 0;
          width: min(90%, 420px);
          opacity: 0;
          animation: ticketFlight 9s cubic-bezier(0.45, 0, 0.2, 1) var(--delay)
            infinite both;
          filter: drop-shadow(0 20px 30px rgba(0, 20, 50, 0.35))
            drop-shadow(0 0 18px rgba(0, 163, 224, 0.25));
          transform-origin: center;
          will-change: transform, opacity;
        }

        @keyframes ticketFlight {
          0% {
            opacity: 0;
            transform: translateX(110%) rotate(var(--angle)) scale(var(--scale));
          }
          15% {
            opacity: var(--opacity);
          }
          50% {
            opacity: var(--opacity);
            transform: translateX(10%) rotate(var(--angle)) scale(var(--scale));
          }
          85% {
            opacity: var(--opacity);
            transform: translateX(-60%) rotate(var(--angle)) scale(var(--scale));
          }
          100% {
            opacity: 0;
            transform: translateX(-110%) rotate(var(--angle)) scale(var(--scale));
          }
        }

        @media (min-width: 640px) {
          .ticket-flight {
            width: min(95%, 520px);
          }
        }

        @media (min-width: 768px) {
          .ticket-flight {
            width: min(95%, 580px);
          }
        }
      `}</style>
    </div>
  );
}
