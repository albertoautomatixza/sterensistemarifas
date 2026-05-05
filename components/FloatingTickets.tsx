'use client';

import type { CSSProperties } from 'react';
import ticketImage from '@/public/images/participation-ticket.png';

const TICKET_IMAGE = ticketImage.src;

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
              width={ticketImage.width}
              height={ticketImage.height}
              loading="eager"
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
