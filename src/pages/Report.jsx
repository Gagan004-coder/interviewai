import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { generateReportInsights } from '../services/gemini'
import { Radar, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ArcElement
} from 'chart.js'
import { scoreColor } from '../utils/helpers'
import './Report.css'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ArcElement)

const CHART_DEF_OPTS = {
  responsive: true,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8' } },
}

export default function Report() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [interview, setInterview] = useState(state?.interview || null)
  const [insights, setInsights] = useState(null)
  const [insLoading, setInsLoading] = useState(false)

  useEffect(() => {
    if (!interview) {
      const last = localStorage.getItem('iai_last_interview')
      if (last) setInterview(JSON.parse(last))
    }
  }, [])

  useEffect(() => {
    if (interview && !insights) {
      const key = localStorage.getItem('iai_gemini_key') || true
      if (key) {
        setInsLoading(true)
        generateReportInsights({
          technical: interview.technical,
          communication: interview.communication,
          confidence: interview.confidence,
          grammar: interview.grammar,
          overall: interview.overall,
        }, interview.domain).then(r => { setInsights(r); setInsLoading(false) }).catch(() => setInsLoading(false))
      }
    }
  }, [interview])

  if (!interview) return (
    <div style={{ textAlign:'center', padding:'80px 24px', color:'var(--text-muted)' }}>
      <div style={{fontSize:64,marginBottom:16}}>📊</div>
      <p style={{marginBottom:24}}>No report found. Complete an interview first!</p>
      <button className="btn btn-primary" onClick={() => navigate('/app/interview')}>Start Interview →</button>
    </div>
  )

  const { answers = [], domain, overall, technical, communication, confidence, grammar } = interview

  const radarData = {
    labels: ['Technical', 'Communication', 'Confidence', 'Grammar', 'Relevance'],
    datasets: [{
      label: 'Score',
      data: [technical, communication, confidence, grammar, Math.round(answers.reduce((s,a)=>s+a.relevance,0)/(answers.length||1))],
      backgroundColor: 'rgba(124,58,237,0.2)',
      borderColor: 'rgba(124,58,237,0.9)',
      pointBackgroundColor: '#06b6d4',
      pointBorderColor: '#fff',
      borderWidth: 2,
    }]
  }

  const barData = {
    labels: answers.map((_,i) => `Q${i+1}`),
    datasets: [
      { label: 'Technical', data: answers.map(a=>a.technical), backgroundColor: 'rgba(124,58,237,0.7)', borderRadius:6 },
      { label: 'Confidence', data: answers.map(a=>a.confidence), backgroundColor: 'rgba(6,182,212,0.7)', borderRadius:6 },
    ]
  }

  const doughnutData = {
    labels: ['Technical', 'Communication', 'Confidence', 'Grammar'],
    datasets: [{
      data: [technical, communication, confidence, grammar],
      backgroundColor: ['rgba(124,58,237,0.8)','rgba(6,182,212,0.8)','rgba(16,185,129,0.8)','rgba(245,158,11,0.8)'],
      borderWidth: 0,
    }]
  }

  const radarOpts = {
    ...CHART_DEF_OPTS,
    scales: { r: { min:0, max:100, ticks:{color:'#475569',font:{size:10}}, grid:{color:'rgba(255,255,255,0.07)'}, pointLabels:{color:'#94a3b8',font:{size:12}} } },
    plugins: { ...CHART_DEF_OPTS.plugins, legend:{display:false} }
  }
  const barOpts = { ...CHART_DEF_OPTS, scales: { x:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#94a3b8'}}, y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#94a3b8'}} }, plugins:{...CHART_DEF_OPTS.plugins,legend:{display:true,labels:{color:'#94a3b8',boxWidth:12}}} }
  const doughnutOpts = { ...CHART_DEF_OPTS, cutout:'72%', plugins:{...CHART_DEF_OPTS.plugins,legend:{display:true,position:'bottom',labels:{color:'#94a3b8',boxWidth:12,padding:16}}} }

  return (
    <div className="report-page">
      <div className="rp-header">
        <div>
          <h1 className="page-title">📊 Interview Report</h1>
          <p className="page-subtitle">{domain} · {new Date(interview.date).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/app/interview')}>🔄 New Interview</button>
      </div>

      {/* Score Banner */}
      <div className="rp-score-banner">
        <div className="rp-score-main">
          <div className="rp-score-num" style={{ color: scoreColor(overall) }}>{overall}</div>
          <div className="rp-score-label">Overall Score</div>
        </div>
        <div className="rp-score-grid">
          {[['Technical', technical, '🧠'],['Communication', communication,'🗣️'],['Confidence', confidence,'💪'],['Grammar', grammar,'✍️']].map(([lab,val,ic]) => (
            <div key={lab} className="rp-score-item">
              <span className="rp-score-icon">{ic}</span>
              <div>
                <div className="rp-score-item-val" style={{color:scoreColor(val)}}>{val}%</div>
                <div className="rp-score-item-lab">{lab}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="rp-charts-row">
        <div className="rp-chart-card">
          <div className="rp-chart-title">Skill Radar</div>
          <Radar data={radarData} options={radarOpts} />
        </div>
        <div className="rp-chart-card">
          <div className="rp-chart-title">Score Breakdown</div>
          <Doughnut data={doughnutData} options={doughnutOpts} />
        </div>
        <div className="rp-chart-card" style={{gridColumn:'span 1'}}>
          <div className="rp-chart-title">Per-Question Performance</div>
          <Bar data={barData} options={barOpts} />
        </div>
      </div>

      {/* AI Insights */}
      {(insights || insLoading) && (
        <div className="rp-insights-card">
          <div className="rp-section-title">🤖 Gemini AI Insights</div>
          {insLoading ? (
            <div style={{display:'flex',gap:10,alignItems:'center',color:'var(--text-muted)'}}><span className="spinner"/> Generating AI insights...</div>
          ) : insights && (
            <>
              <p className="rp-summary">{insights.summary}</p>
              <div className="rp-insights-grid">
                <div>
                  <div className="rp-insight-heading">⚠️ Weak Areas</div>
                  <ul className="rp-insight-list rp-insight-list--warn">
                    {insights.weak_areas?.map((w,i)=><li key={i}>{w}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="rp-insight-heading">📋 Action Plan</div>
                  <ul className="rp-insight-list">
                    {insights.action_plan?.map((a,i)=><li key={i}><span className="rp-step">{i+1}</span>{a}</li>)}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Q&A Breakdown */}
      <div className="rp-section-title" style={{marginTop:32}}>📝 Answer Breakdown</div>
      <div className="rp-answers">
        {answers.map((a, i) => (
          <div key={i} className="rp-answer-card">
            <div className="rp-answer-header">
              <div className="rp-answer-q"><span className="rp-q-num">Q{i+1}</span> {a.question}</div>
              <span className={`badge ${a.difficulty==='Easy'?'badge-green':a.difficulty==='Medium'?'badge-orange':'badge-red'}`}>{a.difficulty}</span>
            </div>
            <div className="rp-answer-text">
              {a.answer || <em style={{color:'var(--text-muted)'}}>No answer provided</em>}
            </div>
            <div className="rp-answer-scores">
              {[['Relevance', a.relevance],['Technical', a.technical],['Grammar', a.grammar],['Confidence', a.confidence]].map(([l,v])=>(
                <div key={l} className="rp-ascore">
                  <span className="rp-ascore-label">{l}</span>
                  <div className="progress-bar"><div className="progress-fill" style={{width:`${v}%`,background:scoreColor(v)}}/></div>
                  <span className="rp-ascore-val" style={{color:scoreColor(v)}}>{v}</span>
                </div>
              ))}
            </div>
            {a.feedback && <div className="rp-feedback">💬 {a.feedback}</div>}
            {a.wpm > 0 && (
              <div className="rp-voice-meta">
                <span>🗣 {a.wpm} WPM</span>
                {a.fillerCount > 0 && <span>⚠️ {a.fillerCount} filler words</span>}
              </div>
            )}
            {a.tips?.length > 0 && (
              <div className="rp-tips">
                {a.tips.map((t,j)=><div key={j} className="rp-tip">💡 {t}</div>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
