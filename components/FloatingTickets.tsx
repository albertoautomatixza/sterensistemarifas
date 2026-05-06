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

type SpeedLine = {
  x: string;
  y: string;
  width: string;
  delay: string;
  duration: string;
  opacity: string;
  rotate: string;
};

const TICKETS: TicketFlight[] = [
  {
    delay: '0s',
    startY: '-34%',
    midY: '-18%',
    endY: '-2%',
    angle: '-7deg',
    scale: '0.86',
    opacity: '1',
    z: 3,
  },
  {
    delay: '3s',
    startY: '7%',
    midY: '20%',
    endY: '34%',
    angle: '-5deg',
    scale: '0.72',
    opacity: '0.86',
    z: 2,
  },
  {
    delay: '6s',
    startY: '38%',
    midY: '52%',
    endY: '66%',
    angle: '-9deg',
    scale: '0.58',
    opacity: '0.68',
    z: 1,
  },
];

const AMBIENT_LIGHTS: FloatingLight[] = [
  {
    x: '58%',
    y: '9%',
    size: '62px',
    delay: '-0.8s',
    duration: '5.8s',
    opacity: '0.58',
    rotate: '-4deg',
  },
  {
    x: '88%',
    y: '16%',
    size: '116px',
    delay: '-4s',
    duration: '6.4s',
    opacity: '0.62',
    rotate: '-5deg',
  },
  {
    x: '78%',
    y: '39%',
    size: '76px',
    delay: '-2.4s',
    duration: '5.6s',
    opacity: '0.58',
    rotate: '-3deg',
  },
  {
    x: '63%',
    y: '74%',
    size: '94px',
    delay: '-3.1s',
    duration: '6.8s',
    opacity: '0.52',
    rotate: '-4deg',
  },
  {
    x: '91%',
    y: '73%',
    size: '140px',
    delay: '-1.6s',
    duration: '6.1s',
    opacity: '0.56',
    rotate: '-5deg',
  },
  {
    x: '52%',
    y: '56%',
    size: '52px',
    delay: '-2s',
    duration: '5.2s',
    opacity: '0.42',
    rotate: '-3deg',
  },
];

const SPEED_LINES: SpeedLine[] = [
  {
    x: '86%',
    y: '19%',
    width: '210px',
    delay: '0.5s',
    duration: '3.8s',
    opacity: '0.62',
    rotate: '-4deg',
  },
  {
    x: '76%',
    y: '32%',
    width: '155px',
    delay: '1.9s',
    duration: '4.2s',
    opacity: '0.46',
    rotate: '-4deg',
  },
  {
    x: '91%',
    y: '49%',
    width: '124px',
    delay: '3.1s',
    duration: '3.6s',
    opacity: '0.5',
    rotate: '-3deg',
  },
  {
    x: '80%',
    y: '69%',
    width: '180px',
    delay: '4.6s',
    duration: '4.4s',
    opacity: '0.48',
    rotate: '-5deg',
  },
  {
    x: '66%',
    y: '82%',
    width: '112px',
    delay: '6.5s',
    duration: '3.9s',
    opacity: '0.38',
    rotate: '-4deg',
  },
];

export function FloatingTicketsContainer() {
  return (
    <div
      className="floating-ticket-scene pointer-events-none absolute inset-0 flex items-start justify-center select-none"
      style={{ overflow: 'visible' }}
    >
      <div className="ticket-stage relative w-full" style={{ overflow: 'visible' }}>
        {SPEED_LINES.map((line, index) => (
          <span
            key={`speed-${index}`}
            className="hero-speed-line"
            style={
              {
                '--speed-x': line.x,
                '--speed-y': line.y,
                '--speed-width': line.width,
                '--speed-delay': line.delay,
                '--speed-duration': line.duration,
                '--speed-opacity': line.opacity,
                '--speed-rotate': line.rotate,
              } as CSSProperties
            }
          />
        ))}

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
