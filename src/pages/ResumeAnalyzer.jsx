import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { analyzeResume } from '../services/gemini'
import { Radar } from 'react-chartjs-2'
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'
import './ResumeAnalyzer.css'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

async function extractPdfText(file) {
  // Use pdfjs-dist to extract text from PDF
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(item => item.str).join(' ') + '\n'
  }
  return text
}

function scoreColor(score) {
  if (score >= 75) return 'var(--accent-green)'
  if (score >= 50) return 'var(--accent-orange)'
  return 'var(--accent-red)'
}

export default function ResumeAnalyzer() {
  const [file, setFile] = useState(null)
  const [jobRole, setJobRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [rawText, setRawText] = useState('')

  const onDrop = useCallback(async (accepted) => {
    const f = accepted[0]
    if (!f) return
    setFile(f); setResult(null); setError('')
    try {
      const text = await extractPdfText(f)
      setRawText(text)
    } catch {
      setError('Could not parse PDF. Please try another file.')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1
  })

  async function analyze() {
    if (!rawText) { setError('Please upload a PDF resume first.'); return }
    const geminiKey = localStorage.getItem('iai_gemini_key') || true
    if (!geminiKey) { setError('Add your Gemini API key in Settings to use the Resume Analyzer.'); return }
    setLoading(true); setError('')
    try {
      const r = await analyzeResume(rawText, jobRole)
      setResult(r)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const radarData = result ? {
    labels: ['Technical Skills', 'Relevance', 'Experience', 'Keywords', 'Completeness', 'Formatting'],
    datasets: [{
      label: 'ATS Profile',
      data: [
        Math.min(result.extracted_skills.length * 5, 100),
        result.ats_score,
        result.experience_level === 'Senior' ? 90 : result.experience_level === 'Mid-Level' ? 70 : result.experience_level === 'Junior' ? 50 : 30,
        Math.max(0, 100 - result.missing_skills.length * 8),
        result.ats_score > 70 ? 85 : 60,
        result.ats_score > 60 ? 80 : 55,
      ],
      backgroundColor: 'rgba(124,58,237,0.15)',
      borderColor: 'rgba(124,58,237,0.8)',
      pointBackgroundColor: 'rgba(6,182,212,1)',
      pointBorderColor: '#fff',
      borderWidth: 2,
    }]
  } : null

  const radarOpts = {
    responsive: true,
    scales: { r: { min: 0, max: 100, ticks: { color: '#475569', font: {size:10} }, grid: { color: 'rgba(255,255,255,0.07)' }, pointLabels: { color: '#94a3b8', font:{size:12} } } },
    plugins: { legend: { display: false } },
  }

  return (
    <div className="resume-page">
      <h1 className="page-title">📄 Resume Analyzer</h1>
      <p className="page-subtitle">Upload your PDF resume to get ATS score, skill analysis & Gemini AI feedback</p>

      <div className="resume-grid">
        {/* Upload Panel */}
        <div className="resume-upload-panel">
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'dropzone--active' : ''} ${file ? 'dropzone--has-file' : ''}`}>
            <input {...getInputProps()} id="resume-file-input" />
            <div className="dropzone-icon">{file ? '✅' : '📄'}</div>
            <div className="dropzone-text">
              {isDragActive ? 'Drop it here!' : file ? file.name : 'Drag & drop your PDF resume'}
            </div>
            <div className="dropzone-sub">{file ? `${(file.size/1024).toFixed(1)} KB` : 'or click to browse'}</div>
          </div>

          <div className="form-group" style={{marginTop:16}}>
            <label className="form-label">Target Job Role (optional)</label>
            <input className="input" placeholder="e.g. Full Stack Developer, DevOps Engineer..." value={jobRole} onChange={e=>setJobRole(e.target.value)} />
          </div>

          {error && <div className="iv-error">{error}</div>}

          <button className="btn btn-primary w-full" style={{justifyContent:'center',marginTop:8}} disabled={loading || !rawText} onClick={analyze}>
            {loading ? <><span className="spinner" /> Analyzing with Gemini AI...</> : '🔍 Analyze Resume'}
          </button>

          {rawText && (
            <details className="raw-text-box">
              <summary>📋 Extracted Text Preview</summary>
              <pre>{rawText.slice(0, 800)}...</pre>
            </details>
          )}
        </div>

        {/* Results Panel */}
        <div className="resume-results">
          {!result ? (
            <div className="resume-placeholder">
              <div style={{fontSize:64,marginBottom:16}}>🤖</div>
              <div>Upload a resume and click Analyze to see your ATS report</div>
            </div>
          ) : (
            <>
              {/* ATS Score */}
              <div className="ats-score-card">
                <div className="ats-ring" style={{ '--score-color': scoreColor(result.ats_score) }}>
                  <svg viewBox="0 0 120 120" width="120" height="120">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                    <circle cx="60" cy="60" r="48" fill="none"
                      stroke={scoreColor(result.ats_score)} strokeWidth="10"
                      strokeDasharray={`${2*Math.PI*48 * result.ats_score/100} ${2*Math.PI*48}`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)" />
                  </svg>
                  <div className="ats-ring-text">
                    <span className="ats-ring-num">{result.ats_score}</span>
                    <span className="ats-ring-lab">ATS Score</span>
                  </div>
                </div>
                <div className="ats-meta">
                  <div><span className="badge badge-purple">{result.experience_level}</span></div>
                  <div className="ats-role">Detected Role: <strong>{result.detected_role}</strong></div>
                  <div className="ats-skills-count">{result.extracted_skills.length} skills found</div>
                </div>
              </div>

              {/* Radar chart */}
              {radarData && (
                <div className="resume-chart-card">
                  <div className="rcard-title">Skill Radar</div>
                  <Radar data={radarData} options={radarOpts} />
                </div>
              )}

              {/* Skills */}
              <div className="resume-section-card">
                <div className="rcard-title">✅ Extracted Skills</div>
                <div className="skills-wrap">
                  {result.extracted_skills.map((s,i) => <span key={i} className="skill-tag skill-tag--found">{s}</span>)}
                </div>
              </div>

              <div className="resume-section-card">
                <div className="rcard-title">⚠️ Missing Skills</div>
                <div className="skills-wrap">
                  {result.missing_skills.length === 0
                    ? <span style={{color:'var(--accent-green)',fontSize:14}}>No major gaps detected! 🎉</span>
                    : result.missing_skills.map((s,i) => <span key={i} className="skill-tag skill-tag--missing">{s}</span>)
                  }
                </div>
              </div>

              {/* Strengths & Suggestions */}
              <div className="resume-two-col">
                <div className="resume-section-card">
                  <div className="rcard-title">💪 Strengths</div>
                  <ul className="rcard-list">
                    {result.strengths.map((s,i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div className="resume-section-card">
                  <div className="rcard-title">🚀 Suggestions</div>
                  <ul className="rcard-list">
                    {result.suggestions.map((s,i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
