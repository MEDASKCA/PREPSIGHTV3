"use client"

import Link from "next/link"

export default function PublicLanding() {
  return (
    <div className="landing-shell">
      <header className="landing-header">
        <div className="landing-brand">
          <div className="landing-brand-mark">
            <img src="/ps-mark.png" alt="PrepSight logo" />
          </div>
          <div className="landing-brand-text">
            <span>PrepSight</span>
          </div>
        </div>
      </header>

      <main className="landing-hero">
        <div>
          <h1>Every case. Every setting. Every team.</h1>

          <div className="landing-trailer" style={{ margin: "20px 0 16px", minHeight: "auto" }}>
            <div className="landing-trailer-line">For preparation</div>
            <div className="landing-trailer-line">As internal reference</div>
            <div className="landing-trailer-line">Across clinical teams</div>
            <div className="landing-trailer-line">One place to begin</div>
          </div>

          <p>
            Built for the moments when everyone needs the same answer quickly, cutting out the hunting and
            second-guessing by bringing the right details together upfront, so the next step feels clear before the
            case even begins.
          </p>

          <div className="landing-actions">
            <Link className="landing-cta landing-primary" href="/login">
              Sign in to continue
            </Link>
          </div>

          <div className="landing-note">
            Secure sign-in supports organisational accounts. Browser access remains available when needed.
          </div>
        </div>

        <div className="landing-device-wrapper">
          <div className="landing-device">
            <div className="landing-device-body" />

            <div className="landing-btn-left">
              <div className="landing-btn-mute" />
              <div className="landing-btn-vol-up" />
              <div className="landing-btn-vol-down" />
            </div>

            <div className="landing-btn-right">
              <div className="landing-btn-power" />
            </div>

            <div className="landing-screen">
              <img src="/prepsight-mobile-ui.png" alt="PrepSight mobile UI preview" />
            </div>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <span className="landing-footer-disclaimer">Local policy and clinical judgement remain primary.</span>
        <br />
        <br />
        <Link href="/privacy">Privacy</Link>
        <span>&nbsp;&amp;&nbsp;</span>
        <Link href="/terms">Terms of use</Link>
        <br />
        <br />
        <img className="landing-footer-logo" src="/logo-medaskca.png" alt="MEDASKCA logo" />
        MEDASKCA Limited 2026
      </footer>

      <style jsx>{`
        .landing-shell {
          --ink: #10243e;
          --muted: #007aa8;
          --blue: #0096c7;
          --bg: #f6f9fc;
          --radius: 26px;
          min-height: 100vh;
          color: var(--ink);
          background: linear-gradient(135deg, #e8f4f8 0%, #d0eaf4 40%, #e4f0f7 70%, #cce5f0 100%);
          line-height: 1.5;
          display: flex;
          flex-direction: column;
          -webkit-font-smoothing: antialiased;
        }

        .landing-header {
          width: min(1200px, 92%);
          margin: 0 auto;
          padding: 22px 0 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .landing-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .landing-brand-mark img {
          height: 34px;
          width: auto;
        }

        .landing-brand-text span {
          font-size: 28px;
          letter-spacing: -0.02em;
          color: var(--blue);
          font-weight: 400;
          display: inline-block;
          animation: landingBrandIntro 3s ease-out forwards;
        }

        .landing-hero {
          width: min(1200px, 92%);
          margin: 8px auto 22px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
          flex: 1;
        }

        .landing-hero h1 {
          font-size: clamp(50px, 6.8vw, 88px);
          letter-spacing: -0.05em;
          font-weight: 400;
          line-height: 1;
          margin-bottom: 14px;
        }

        .landing-hero p {
          font-size: 20px;
          color: var(--muted);
          max-width: 46ch;
          margin-bottom: 18px;
        }

        .landing-actions {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 16px;
          margin-bottom: 18px;
        }

        .landing-cta {
          padding: 10px 20px;
          border-radius: 999px;
          font-size: 14px;
          border: 1px solid transparent;
          font-weight: 400;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          flex-shrink: 0;
          text-decoration: none;
        }

        .landing-primary {
          background: linear-gradient(180deg, #0b1422 0%, #0f1b2d 100%);
          color: white;
          box-shadow: 0 2px 12px rgba(11, 20, 34, 0.35);
        }

        .landing-note {
          font-size: 14px;
          color: var(--muted);
          max-width: 46ch;
        }

        .landing-device-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .landing-device {
          width: min(300px, 80%);
          max-width: 300px;
          aspect-ratio: 9 / 19.5;
          position: relative;
          flex-shrink: 0;
        }

        .landing-device-body {
          position: absolute;
          inset: 0;
          border-radius: 38px;
          background: #1a1a1a;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .landing-device-body::before {
          content: "";
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 90px;
          height: 28px;
          background: #000;
          border-radius: 20px;
          z-index: 2;
        }

        .landing-btn-left {
          position: absolute;
          left: -4px;
          top: 18%;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .landing-btn-mute {
          width: 4px;
          height: 28px;
          background: #3a3a3a;
          border-radius: 3px 0 0 3px;
        }

        .landing-btn-vol-up,
        .landing-btn-vol-down {
          width: 4px;
          height: 48px;
          background: #3a3a3a;
          border-radius: 3px 0 0 3px;
        }

        .landing-btn-right {
          position: absolute;
          right: -4px;
          top: 22%;
        }

        .landing-btn-power {
          width: 4px;
          height: 72px;
          background: #3a3a3a;
          border-radius: 0 3px 3px 0;
        }

        .landing-screen {
          position: absolute;
          inset: 6px;
          border-radius: 33px;
          overflow: hidden;
          background: #f5f8fb;
        }

        .landing-screen img {
          position: absolute;
          left: 0;
          top: 44px;
          width: 100%;
          height: auto;
          display: block;
        }

        .landing-trailer {
          position: relative;
          height: 92px;
          margin-top: 28px;
          display: flex;
          align-items: center;
          overflow: hidden;
        }

        .landing-trailer-line {
          position: absolute;
          left: 0;
          right: 0;
          font-size: clamp(26px, 3.2vw, 42px);
          line-height: 1.05;
          letter-spacing: -0.04em;
          color: rgba(15, 76, 92, 0.35);
          font-weight: 400;
          opacity: 0;
          transform: translateY(24px);
          filter: blur(14px);
          animation: landingTrailer 5s cubic-bezier(0.22, 1, 0.36, 1);
          animation-fill-mode: both;
          will-change: opacity, transform, filter, color;
        }

        .landing-trailer-line:nth-child(1) {
          animation-delay: 0s;
        }

        .landing-trailer-line:nth-child(2) {
          animation-delay: 5s;
        }

        .landing-trailer-line:nth-child(3) {
          animation-delay: 10s;
        }

        .landing-trailer-line:nth-child(4) {
          animation-delay: 15s;
          animation-name: landingTrailerLast;
        }

        .landing-footer {
          width: min(1200px, 92%);
          margin: 0 auto;
          padding: 18px 0 26px;
          font-size: 14px;
          color: var(--muted);
          border-top: 1px solid rgba(16, 36, 62, 0.08);
          text-align: center;
        }

        .landing-footer a {
          text-decoration: none;
          color: inherit;
        }

        .landing-footer-logo {
          width: 18px;
          height: 18px;
          display: inline-block;
          margin: 0 6px 0 0;
          object-fit: contain;
          vertical-align: -3px;
        }

        .landing-footer-disclaimer {
          color: #0f4c5c;
          font-weight: 400;
        }

        @keyframes landingBrandIntro {
          0% {
            transform: scale(0.98);
            text-shadow: 0 0 0 rgba(0, 0, 0, 0);
            opacity: 0.9;
          }
          35% {
            transform: scale(1.06);
            text-shadow: 0 0 18px rgba(15, 76, 92, 0.45), 0 0 36px rgba(15, 76, 92, 0.25);
            opacity: 1;
          }
          70% {
            transform: scale(1.02);
            text-shadow: 0 0 10px rgba(15, 76, 92, 0.25);
          }
          100% {
            transform: scale(1);
            text-shadow: 0 0 0 rgba(0, 0, 0, 0);
            opacity: 1;
          }
        }

        @keyframes landingTrailer {
          0% {
            opacity: 0;
            transform: translateY(24px);
            filter: blur(14px);
            color: rgba(15, 76, 92, 0.25);
          }
          20% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
            color: #0f4c5c;
          }
          70% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
            color: #0f4c5c;
          }
          100% {
            opacity: 0;
            transform: translateY(-12px);
            filter: blur(10px);
            color: rgba(15, 76, 92, 0.45);
          }
        }

        @keyframes landingTrailerLast {
          0% {
            opacity: 0;
            transform: translateY(24px);
            filter: blur(14px);
            color: rgba(15, 76, 92, 0.25);
          }
          20% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
            color: #0f4c5c;
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
            color: #0f4c5c;
          }
        }

        @media (max-width: 900px) {
          .landing-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .landing-hero {
            grid-template-columns: 1fr;
            gap: 36px;
            margin: 20px auto 40px;
            flex: none;
          }

          .landing-actions {
            flex-wrap: wrap;
            align-items: stretch;
          }

          .landing-device-wrapper {
            margin-top: 8px;
          }

          .landing-device {
            width: min(320px, 72vw);
          }

          .landing-trailer-line {
            font-size: clamp(20px, 7vw, 30px);
          }
        }

        @media (max-width: 640px) {
          .landing-header {
            padding: 22px 0 0;
          }

          .landing-hero h1 {
            font-size: clamp(48px, 13vw, 62px);
          }

          .landing-hero p {
            font-size: 18px;
          }

          .landing-actions {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .landing-cta {
            width: 100%;
            text-align: center;
          }

          .landing-device-wrapper {
            justify-content: center;
          }

          .landing-device {
            width: min(320px, 88vw);
          }

          .landing-trailer {
            height: 78px;
            margin-top: 18px;
          }
        }
      `}</style>
    </div>
  )
}
