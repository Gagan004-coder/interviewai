export default function Terms() {
  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '20px', fontFamily: 'sans-serif', color: 'var(--text-color)' }}>
      <h1>Terms of Service</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      
      <h3>1. Acceptance of Terms</h3>
      <p>By accessing or using InterviewAI, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the service.</p>
      
      <h3>2. Description of Service</h3>
      <p>InterviewAI provides an AI-powered platform for mock interviews and resume analysis. We reserve the right to withdraw or amend our service without notice.</p>

      <h3>3. User Accounts</h3>
      <p>When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms.</p>

      <h3>4. Termination</h3>
      <p>We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever.</p>
    </div>
  )
}
