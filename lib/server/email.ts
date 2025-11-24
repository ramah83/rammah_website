import "server-only";

/**
 * Email notification utility
 * In production, integrate with services like SendGrid, AWS SES, or Resend
 */

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  // For development: just log
  console.log("📧 Email would be sent:");
  console.log("To:", options.to);
  console.log("Subject:", options.subject);
  console.log("Body:", options.text || options.html);

  // TODO: In production, integrate with email service
  // Example with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'noreply@youth-platform.com',
  //   to: options.to,
  //   subject: options.subject,
  //   html: options.html,
  // });

  return { success: true };
}

export function createContactResponseEmail(options: {
  userName: string;
  userEmail: string;
  originalSubject: string;
  originalMessage: string;
  response: string;
  responderName: string;
}) {
  const subject = `رد على رسالتك: ${options.originalSubject}`;
  
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; background: #EFE6DE; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { width: 64px; height: 64px; background: #FFF0F0; border: 2px solid #FFE2E2; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        h1 { color: #1D1D1D; font-size: 24px; margin: 0; }
        .section { background: #F6F6F6; border: 1px solid #E7E2DC; border-radius: 12px; padding: 16px; margin: 16px 0; }
        .section-title { font-weight: bold; color: #6B6B6B; font-size: 12px; margin-bottom: 8px; }
        .section-content { color: #1D1D1D; line-height: 1.6; }
        .response { background: #E8F7EE; border: 1px solid #CBE9D6; border-radius: 12px; padding: 16px; margin: 16px 0; }
        .footer { text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #E7E2DC; color: #6B6B6B; font-size: 12px; }
        .button { display: inline-block; background: #EC1A24; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-weight: bold; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">📧</div>
          <h1>تم الرد على رسالتك</h1>
        </div>

        <p style="color: #595959; line-height: 1.6;">
          مرحباً <strong>${options.userName}</strong>،
        </p>
        <p style="color: #595959; line-height: 1.6;">
          تم الرد على رسالتك من قبل فريق منصة الكيانات الشبابية.
        </p>

        <div class="section">
          <div class="section-title">رسالتك الأصلية:</div>
          <div class="section-content">${options.originalMessage}</div>
        </div>

        <div class="response">
          <div class="section-title" style="color: #0F5132;">الرد:</div>
          <div class="section-content" style="color: #0F5132;">${options.response}</div>
          <div style="margin-top: 12px; font-size: 12px; color: #0F5132;">
            — ${options.responderName}
          </div>
        </div>

        <div style="text-align: center;">
          <a href="https://youth-platform.com/dashboard/contact-messages" class="button">
            عرض كل رسائلي
          </a>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} منصة الكيانات الشبابية — كل الحقوق محفوظة</p>
          <p>هذا البريد تم إرساله تلقائياً، الرجاء عدم الرد عليه مباشرة.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
مرحباً ${options.userName},

تم الرد على رسالتك من قبل فريق منصة الكيانات الشبابية.

رسالتك الأصلية:
${options.originalMessage}

الرد:
${options.response}

— ${options.responderName}

© ${new Date().getFullYear()} منصة الكيانات الشبابية
  `.trim();

  return { subject, html, text };
}
