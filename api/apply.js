export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const reference = `CH-${Date.now().toString().slice(-6)}`;

  /*
   * Future production email flow:
   * 1. Parse multipart form data with a package such as busboy or formidable.
   * 2. Validate required candidate fields and file type/size on the server.
   * 3. Upload the resume to private storage or attach it to the email.
   * 4. Send the candidate profile to the recruitment inbox using a provider such as Resend, SendGrid or Nodemailer.
   *
   * Example sketch:
   * const parsed = await parseMultipartRequest(request);
   * await emailClient.send({
   *   to: process.env.APPLICATIONS_INBOX,
   *   from: process.env.MAIL_FROM,
   *   subject: `New candidate profile: ${parsed.fields.firstName} ${parsed.fields.lastName}`,
   *   html: renderCandidateEmail(parsed.fields),
   *   attachments: [{ filename: parsed.file.name, content: parsed.file.buffer }],
   * });
   */

  return response.status(202).json({
    ok: true,
    reference,
    message: 'Candidate profile received in mock mode.',
  });
}