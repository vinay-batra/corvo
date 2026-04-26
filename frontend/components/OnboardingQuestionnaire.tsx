'use client'

import { useState } from 'react'
import type { ReactElement } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onComplete: () => void
}

type Field = 'investor_type' | 'primary_goal' | 'referral_source'

const AMBER = '#c9a84c'
const AMBER_BG = 'rgba(201,168,76,0.08)'

// ── Option card icons ──────────────────────────────────────────────────────────

function IconSeedling() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 16V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 9C10 6 7 4 4 5C5 8 7 10 10 9Z" fill="currentColor" opacity="0.9"/>
      <path d="M10 9C10 6 13 4 16 5C15 8 13 10 10 9Z" fill="currentColor"/>
    </svg>
  )
}
function IconBolt() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M11 3L5 11H10L9 17L15 9H10L11 3Z" fill="currentColor"/>
    </svg>
  )
}
function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 6.5V10L12.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconBriefcase() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="7" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 7V5.5C7 4.67 7.67 4 8.5 4H11.5C12.33 4 13 4.67 13 5.5V7" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="3" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}
function IconCoin() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 6.5V11.5M8 8c0-.83.9-1.5 2-1.5s2 .67 2 1.5-1 1.5-2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IconUmbrella() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 10C3 6.69 6.13 4 10 4s7 2.69 7 6H3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 10V15.5C10 16.33 10.67 17 11.5 17s1.5-.67 1.5-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IconBarChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="11" width="3.5" height="6" rx="0.5" fill="currentColor" opacity="0.5"/>
      <rect x="8.5" y="7" width="3.5" height="10" rx="0.5" fill="currentColor" opacity="0.8"/>
      <rect x="14" y="4" width="3.5" height="13" rx="0.5" fill="currentColor"/>
    </svg>
  )
}
function IconBook() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 4H10V16H4V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 4C10 4 11.5 3.5 13 4L16 5V17L13 16C11.5 15.5 10 16 10 16V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}
function IconShare() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="15" cy="15" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="7" y1="9" x2="13" y2="6" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="7" y1="11" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}
function IconPeople() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="7.5" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 16C2 13.24 4.46 11 7.5 11s5.5 2.24 5.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="14" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M17 16C17 13.79 15.21 12 13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="5" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="13" y1="13" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IconDots() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="5" cy="10" r="1.5" fill="currentColor"/>
      <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
      <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
    </svg>
  )
}

// ── Animated SVG illustrations ─────────────────────────────────────────────────

function IllustrationBars() {
  const barBase: React.CSSProperties = {
    transformBox: 'fill-box' as any,
    transformOrigin: 'center bottom',
    transform: 'scaleY(0)',
  }
  return (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" style={{ overflow: 'visible' }}>
      {/* baseline */}
      <line x1="25" y1="102" x2="125" y2="102" stroke="#2a2a2a" strokeWidth="1"/>
      {/* bars */}
      <rect x="42" y="72" width="16" height="30" rx="2" fill={AMBER} opacity="0.45"
        style={{ ...barBase, animation: 'oq-bar-grow 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}/>
      <rect x="64" y="52" width="16" height="50" rx="2" fill={AMBER} opacity="0.7"
        style={{ ...barBase, animation: 'oq-bar-grow 0.6s cubic-bezier(0.16,1,0.3,1) 0.4s both' }}/>
      <rect x="86" y="32" width="16" height="70" rx="2" fill={AMBER}
        style={{ ...barBase, animation: 'oq-bar-grow 0.6s cubic-bezier(0.16,1,0.3,1) 0.6s both' }}/>
      {/* sparkle above tallest bar */}
      <g style={{ animation: 'oq-pop 0.35s ease 1.15s both', transformOrigin: '94px 24px', transformBox: 'fill-box' as any }}>
        <path d="M94 14 L96 20 L102 18 L96 22 L94 28 L92 22 L86 18 L92 20 Z" fill={AMBER} opacity="0.9"/>
      </g>
      {/* person silhouette */}
      <circle cx="22" cy="72" r="8" fill="#1e1e1e" stroke="#333" strokeWidth="1"/>
      <path d="M9 102C9 90 35 90 35 102" fill="#1e1e1e" stroke="#333" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}

function IllustrationChart() {
  const pathD = 'M18,92 C28,82 34,78 42,72 C52,64 58,60 66,54 C76,46 82,42 90,36 C100,28 106,24 118,18'
  const pathLength = 280
  return (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none">
      <line x1="18" y1="102" x2="130" y2="102" stroke="#2a2a2a" strokeWidth="1"/>
      <line x1="18" y1="102" x2="18" y2="12" stroke="#2a2a2a" strokeWidth="1"/>
      {/* gradient area under line */}
      <defs>
        <linearGradient id="oq-chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={AMBER} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${pathD} L118,102 L18,102 Z`} fill="url(#oq-chart-grad)"
        style={{ opacity: 0, animation: 'oq-fade-in 0.4s ease 1.6s both' }}/>
      {/* chart line */}
      <path d={pathD} stroke={AMBER} strokeWidth="2.5" strokeLinecap="round" fill="none"
        style={{ strokeDasharray: pathLength, strokeDashoffset: pathLength, animation: 'oq-draw-line 1.5s ease-in-out 0.3s forwards' }}/>
      {/* amber dot at end */}
      <circle cx="18" cy="92" r="4" fill={AMBER}
        style={{ animation: 'oq-dot-slide 1.5s ease-in-out 0.3s forwards' }}/>
      {/* flag at peak */}
      <g style={{ opacity: 0, animation: 'oq-pop 0.3s ease 1.85s both', transformOrigin: '118px 10px', transformBox: 'fill-box' as any }}>
        <line x1="118" y1="8" x2="118" y2="18" stroke={AMBER} strokeWidth="1.5"/>
        <path d="M118 8 L130 12 L118 16Z" fill={AMBER}/>
      </g>
    </svg>
  )
}

function IllustrationNetwork() {
  const lineStyle = (delay: number): React.CSSProperties => ({
    strokeDasharray: '55',
    strokeDashoffset: '55',
    animation: `oq-draw-line 0.5s ease ${delay}s forwards`,
  })
  const dotStyle = (delay: number): React.CSSProperties => ({
    opacity: 0,
    animation: `oq-pop 0.3s ease ${delay}s both`,
    transformBox: 'fill-box' as any,
    transformOrigin: 'center',
  })
  return (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none">
      {/* center circle */}
      <circle cx="70" cy="60" r="14" fill="#1a1a1a" stroke={AMBER} strokeWidth="1.5"/>
      <text x="70" y="65" textAnchor="middle" fill={AMBER} fontSize="14" fontWeight="600">C</text>
      {/* lines to satellite dots */}
      <line x1="70" y1="46" x2="70" y2="16" stroke="#333" strokeWidth="1.5" strokeLinecap="round" style={lineStyle(0.2)}/>
      <line x1="84" y1="67" x2="110" y2="78" stroke="#333" strokeWidth="1.5" strokeLinecap="round" style={lineStyle(0.4)}/>
      <line x1="56" y1="67" x2="30" y2="78" stroke="#333" strokeWidth="1.5" strokeLinecap="round" style={lineStyle(0.6)}/>
      <line x1="70" y1="74" x2="70" y2="102" stroke="#333" strokeWidth="1.5" strokeLinecap="round" style={lineStyle(0.8)}/>
      {/* satellite dots */}
      <circle cx="70" cy="13" r="5.5" fill="#1a1a1a" stroke={AMBER} strokeWidth="1.5" style={dotStyle(0.7)}/>
      <circle cx="114" cy="80" r="5.5" fill="#1a1a1a" stroke={AMBER} strokeWidth="1.5" style={dotStyle(0.9)}/>
      <circle cx="26" cy="80" r="5.5" fill="#1a1a1a" stroke={AMBER} strokeWidth="1.5" style={dotStyle(1.1)}/>
      <circle cx="70" cy="106" r="5.5" fill="#1a1a1a" stroke={AMBER} strokeWidth="1.5" style={dotStyle(1.3)}/>
    </svg>
  )
}

// ── Step definitions ───────────────────────────────────────────────────────────

interface StepOption {
  id: string
  label: string
  Icon: () => ReactElement
}

interface StepDef {
  label: string
  title: string
  field: Field
  Illustration: () => ReactElement
  options: StepOption[]
}

const STEPS: StepDef[] = [
  {
    label: 'STEP 1 OF 3',
    title: 'What best describes you?',
    field: 'investor_type',
    Illustration: IllustrationBars,
    options: [
      { id: 'beginner', label: 'Beginner investor', Icon: IconSeedling },
      { id: 'active', label: 'Active trader', Icon: IconBolt },
      { id: 'longterm', label: 'Long-term investor', Icon: IconClock },
      { id: 'professional', label: 'Financial professional', Icon: IconBriefcase },
    ],
  },
  {
    label: 'STEP 2 OF 3',
    title: "What's your main goal?",
    field: 'primary_goal',
    Illustration: IllustrationChart,
    options: [
      { id: 'wealth', label: 'Build wealth', Icon: IconCoin },
      { id: 'retirement', label: 'Save for retirement', Icon: IconUmbrella },
      { id: 'track', label: 'Track portfolio', Icon: IconBarChart },
      { id: 'learn', label: 'Learn investing', Icon: IconBook },
    ],
  },
  {
    label: 'STEP 3 OF 3',
    title: 'How did you hear about Corvo?',
    field: 'referral_source',
    Illustration: IllustrationNetwork,
    options: [
      { id: 'social', label: 'Social media', Icon: IconShare },
      { id: 'friend', label: 'Friend or family', Icon: IconPeople },
      { id: 'search', label: 'Search engine', Icon: IconSearch },
      { id: 'other', label: 'Other', Icon: IconDots },
    ],
  },
]

// ── Option card ────────────────────────────────────────────────────────────────

interface OptionCardProps {
  opt: StepOption
  selected: boolean
  pulsing: boolean
  onSelect: () => void
}

function OptionCard({ opt, selected, pulsing, onSelect }: OptionCardProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? AMBER_BG : hovered ? '#161616' : '#111',
        border: `1px solid ${selected ? AMBER : hovered ? '#333' : '#1e1e1e'}`,
        borderRadius: 12,
        padding: '16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textAlign: 'left',
        color: selected ? AMBER : hovered ? '#ccc' : '#aaa',
        transform: pulsing ? 'scale(1.04)' : hovered && !selected ? 'scale(1.02)' : 'scale(1)',
        transition: 'border-color 150ms, background 150ms, transform 150ms, color 150ms',
        animation: pulsing ? 'oq-pulse 200ms ease' : undefined,
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex', color: selected ? AMBER : hovered ? '#aaa' : '#666', transition: 'color 150ms' }}>
        <opt.Icon />
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>
        {opt.label}
      </span>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function OnboardingQuestionnaire({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [exitStep, setExitStep] = useState<number | null>(null)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [animating, setAnimating] = useState(false)
  const [answers, setAnswers] = useState<Record<Field, string>>({
    investor_type: '',
    primary_goal: '',
    referral_source: '',
  })
  const [pulsing, setPulsing] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  const currentStep = STEPS[step]
  const selected = answers[currentStep.field]
  const isLast = step === STEPS.length - 1
  const progress = ((step + 1) / STEPS.length) * 100

  const handleSelect = (optionId: string) => {
    setAnswers(prev => ({ ...prev, [currentStep.field]: optionId }))
    setPulsing(optionId)
    setTimeout(() => setPulsing(null), 200)
  }

  const navigate = (dir: 'forward' | 'back') => {
    if (animating) return
    setDirection(dir)
    setExitStep(step)
    setStep(s => s + (dir === 'forward' ? 1 : -1))
    setAnimating(true)
    setTimeout(() => {
      setExitStep(null)
      setAnimating(false)
    }, 320)
  }

  const handleNext = () => {
    if (!selected || animating) return
    if (isLast) {
      handleComplete()
    } else {
      navigate('forward')
    }
  }

  const handleBack = () => {
    if (step === 0) return
    navigate('back')
  }

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await supabase.auth.updateUser({
        data: {
          investor_type: answers.investor_type,
          primary_goal: answers.primary_goal,
          referral_source: answers.referral_source,
        },
      })
    } catch {}
    setTimeout(onComplete, 300)
  }

  const renderStepContent = (stepIdx: number, isEntering: boolean) => {
    const s = STEPS[stepIdx]
    const sel = answers[s.field]
    const last = stepIdx === STEPS.length - 1
    const Illus = s.Illustration
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', height: 120, marginBottom: 24 }}>
          <Illus />
        </div>
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: '0.15em',
          color: AMBER,
          textTransform: 'uppercase',
          marginBottom: 10,
          margin: '0 0 10px',
        }}>
          {s.label}
        </p>
        <h2 style={{
          fontSize: 24,
          fontWeight: 600,
          color: '#fff',
          margin: '0 0 28px',
          lineHeight: 1.3,
        }}>
          {s.title}
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 28,
          textAlign: 'left',
        }}>
          {s.options.map(opt => (
            <OptionCard
              key={opt.id}
              opt={opt}
              selected={sel === opt.id}
              pulsing={pulsing === opt.id && isEntering}
              onSelect={() => {
                if (isEntering) handleSelect(opt.id)
              }}
            />
          ))}
        </div>
        <button
          onClick={isEntering ? handleNext : undefined}
          disabled={!sel}
          style={{
            width: '100%',
            padding: '14px',
            background: sel ? AMBER : 'rgba(201,168,76,0.1)',
            border: 'none',
            borderRadius: 10,
            color: sel ? '#0a0a0a' : '#5a4800',
            fontSize: 15,
            fontWeight: 600,
            cursor: sel ? 'pointer' : 'not-allowed',
            transition: 'background 250ms, color 250ms, opacity 250ms',
            opacity: sel ? 1 : 0.45,
            letterSpacing: '0.01em',
          }}
        >
          {last ? 'Finish' : 'Next'}
        </button>
      </div>
    )
  }

  const exitClass = exitStep !== null
    ? (direction === 'forward' ? 'oq-exit-left' : 'oq-exit-right')
    : ''
  const enterClass = animating
    ? (direction === 'forward' ? 'oq-enter-right' : 'oq-enter-left')
    : ''

  return (
    <>
      <style>{`
        @keyframes oq-card-up {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes oq-fade-out {
          to { opacity: 0; pointer-events: none; }
        }
        @keyframes oq-exit-left {
          to { transform: translateX(-60px); opacity: 0; }
        }
        @keyframes oq-exit-right {
          to { transform: translateX(60px); opacity: 0; }
        }
        @keyframes oq-enter-right {
          from { transform: translateX(60px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes oq-enter-left {
          from { transform: translateX(-60px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        .oq-exit-left  { animation: oq-exit-left  250ms ease forwards; }
        .oq-exit-right { animation: oq-exit-right 250ms ease forwards; }
        .oq-enter-right { animation: oq-enter-right 250ms ease 50ms both; }
        .oq-enter-left  { animation: oq-enter-left  250ms ease 50ms both; }
        @keyframes oq-pulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        @keyframes oq-bar-grow {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        @keyframes oq-draw-line {
          to { stroke-dashoffset: 0; }
        }
        @keyframes oq-dot-slide {
          from { transform: translate(0px, 0px); }
          to   { transform: translate(100px, -74px); }
        }
        @keyframes oq-pop {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes oq-fade-in {
          to { opacity: 1; }
        }
      `}</style>

      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(10,10,10,0.97)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          animation: completing ? 'oq-fade-out 300ms ease forwards' : undefined,
        }}
      >
        {/* Card */}
        <div
          style={{
            width: '100%',
            maxWidth: 560,
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: '1rem',
            overflow: 'hidden',
            animation: 'oq-card-up 400ms cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {/* Progress bar */}
          <div style={{ height: 3, background: '#1a1a1a' }}>
            <div
              style={{
                height: '100%',
                background: AMBER,
                width: `${progress}%`,
                transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)',
                borderRadius: '0 2px 2px 0',
              }}
            />
          </div>

          <div style={{ padding: '32px 32px 36px', position: 'relative' }}>
            {/* Back button */}
            <button
              onClick={handleBack}
              style={{
                position: 'absolute',
                top: 28,
                left: 32,
                background: 'none',
                border: 'none',
                cursor: step > 0 ? 'pointer' : 'default',
                color: '#555',
                fontSize: 13,
                padding: 0,
                opacity: step > 0 ? 1 : 0,
                pointerEvents: step > 0 ? 'auto' : 'none',
                transition: 'opacity 200ms, color 150ms',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (step > 0) e.currentTarget.style.color = '#999' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#555' }}
            >
              Back
            </button>

            {/* Step transition area */}
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              {/* Exiting step */}
              {exitStep !== null && (
                <div
                  key={`exit-${exitStep}`}
                  className={exitClass}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                  }}
                >
                  {renderStepContent(exitStep, false)}
                </div>
              )}

              {/* Entering / current step */}
              <div
                key={`step-${step}`}
                className={enterClass}
              >
                {renderStepContent(step, true)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
