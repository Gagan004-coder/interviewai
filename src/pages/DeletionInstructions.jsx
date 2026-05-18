export default function DeletionInstructions() {
  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '20px', fontFamily: 'sans-serif', color: 'var(--text-color)', lineHeight: 1.6 }}>
      <h1>Data Deletion Instructions</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      
      <p>At InterviewAI, we value your privacy and are committed to protecting your personal data. In compliance with Meta's developer policies, we provide a straightforward way for you to request the deletion of any data associated with your account that was collected via Facebook Login.</p>
      
      <h3>How to Delete Your Data</h3>
      <p>If you would like to delete your account and all associated data, please follow the steps below:</p>
      <ol>
        <li>Send an email to our support team at <strong>support@interviewai.dev</strong>.</li>
        <li>Use the subject line <strong>"Request for Data Deletion (Facebook Login)"</strong>.</li>
        <li>Provide the email address associated with your Facebook account or your full name as it appears on Facebook.</li>
      </ol>
      
      <h3>What Happens Next?</h3>
      <p>Once we receive your request, our support team will process it within 2 to 3 business days. We will permanently delete:</p>
      <ul>
        <li>Your profile information (name, email, and avatar).</li>
        <li>Your generated mock interview reports and grammar analyses.</li>
        <li>Any analyzed resume history.</li>
      </ul>
      <p>We will send you a confirmation email once the deletion process is complete.</p>
    </div>
  )
}
