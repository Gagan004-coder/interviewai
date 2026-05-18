export default function Privacy() {
  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '20px', fontFamily: 'sans-serif', color: 'var(--text-color)' }}>
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      
      <h3>1. Information We Collect</h3>
      <p>We collect information you provide directly to us, such as when you create or modify your account, or contact customer support. This includes your name, email address, and Facebook profile information if you choose to log in with Facebook.</p>
      
      <h3>2. How We Use Your Information</h3>
      <p>We use the information we collect to provide, maintain, and improve our services, including the AI mock interview functionality and resume analysis.</p>

      <h3>3. Sharing of Information</h3>
      <p>We do not share your personal information with third parties except as necessary to provide our services (such as using AI providers to analyze your interview responses).</p>

      <h3>4. Contact Us</h3>
      <p>If you have any questions about this Privacy Policy, please contact us at support@interviewai.dev.</p>
    </div>
  )
}
