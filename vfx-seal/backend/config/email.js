const path = require("path");
const nodemailer = require("nodemailer");

const getFrontendBaseUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

const assertMailConfig = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "Missing email configuration: EMAIL_USER and EMAIL_PASS are required",
    );
  }
};

// Create email transporter
const createTransporter = () => {
  assertMailConfig();

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const getFromAddress = () => process.env.EMAIL_FROM || process.env.EMAIL_USER;

const appContainerStyles =
  "max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;";

const headerStyles =
  "background: #0E121A; padding: 32px; text-align: center; color: #F6E7C0;";

const bodyStyles = "padding: 32px; background: #ffffff; color: #1a1a1a;";

const footerStyles =
  "background: #f8f9fa; padding: 16px; text-align: center; color: #666; font-size: 12px;";

const primaryButtonStyles =
  "display: inline-block; background: linear-gradient(135deg, #F6E7C0, #C79E68); color: #0E121A; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;";

const approvalLogoPath = path.join(
  __dirname,
  "../../frontend/src/assets/seal.png",
);

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  const transporter = createTransporter();

  const resetUrl = `${getFrontendBaseUrl()}/reset-password/${resetToken}`;

  const mailOptions = {
    from: getFromAddress(),
    to: email,
    subject: "VFX Seal - Password Reset Request",
    html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="background: #0E121A; padding: 40px; text-align: center;">
                    <h1 style="color: #F6E7C0; margin: 0;">VFX <span style="color: #C79E68;">Seal</span></h1>
                </div>
                
                <div style="padding: 40px; background: #ffffff;">
                    <h2 style="color: #0E121A; margin-bottom: 20px;">Password Reset Request</h2>
                    
                    <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
                        You requested a password reset for your VFX Seal account. Click the button below to set a new password:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="
                            display: inline-block;
                            background: linear-gradient(135deg, #F6E7C0, #C79E68);
                            color: #0E121A;
                            padding: 15px 30px;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: bold;
                            font-size: 16px;
                        ">Reset My Password</a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                        This link will expire in 15 minutes. If you didn't request this reset, please ignore this email.
                    </p>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">
                        If the button doesn't work, copy and paste this URL into your browser:<br>
                        <span style="word-break: break-all;">${resetUrl}</span>
                    </p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} VFX Seal. All rights reserved.</p>
                </div>
            </div>
        `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to: ${email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};

const sendNewRegistrationNotificationEmail = async ({ adminEmail, user }) => {
  if (!adminEmail) {
    throw new Error("ADMIN_NOTIFICATION_EMAIL is required");
  }

  const transporter = createTransporter();
  const submittedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const mailOptions = {
    from: getFromAddress(),
    to: adminEmail,
    subject: "VFX Seal - New User Registration (Pending Approval)",
    html: `
      <div style="${appContainerStyles}">
        <div style="${headerStyles}">
          <h1 style="margin:0;">VFX <span style="color:#C79E68;">Seal</span></h1>
        </div>
        <div style="${bodyStyles}">
          <h2 style="margin-top:0; color:#0E121A;">New Registration Pending Review</h2>
          <p>A new professional account has been created and is now in <strong>PENDING</strong> status.</p>
          <table style="width:100%; border-collapse:collapse; margin-top:16px;">
            <tr><td style="padding:8px 0; color:#666; width:140px;">Name</td><td style="padding:8px 0;"><strong>${user.name}</strong></td></tr>
            <tr><td style="padding:8px 0; color:#666;">Email</td><td style="padding:8px 0;"><strong>${user.email}</strong></td></tr>
            <tr><td style="padding:8px 0; color:#666;">Company</td><td style="padding:8px 0;">${user.company}</td></tr>
            <tr><td style="padding:8px 0; color:#666;">Role</td><td style="padding:8px 0;">${user.roleInCompany}</td></tr>
            <tr><td style="padding:8px 0; color:#666;">Country</td><td style="padding:8px 0;">${user.country}</td></tr>
            <tr><td style="padding:8px 0; color:#666;">Submitted</td><td style="padding:8px 0;">${submittedAt}</td></tr>
          </table>
          <p style="margin-top:20px; color:#666;">Review this user in the admin dashboard when available.</p>
        </div>
        <div style="${footerStyles}">
          <p style="margin:0;">&copy; ${new Date().getFullYear()} VFX Seal</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `[Email] Registration notification sent to ${adminEmail} (messageId: ${info.messageId})`,
    );
    return info;
  } catch (error) {
    console.error(
      `[Email] Registration notification failed for ${adminEmail}:`,
      error,
    );
    throw error;
  }
};

const sendApprovalEmail = async ({ email, firstName }) => {
  const transporter = createTransporter();
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Approval email recipient is missing");
  }

  const signInUrl = `${getFrontendBaseUrl()}/login`;

  console.log(`[Email] Sending approval email to ${normalizedEmail}`);

  const mailOptions = {
    from: getFromAddress(),
    to: normalizedEmail,
    subject: "Your VFX Seal account has been approved",
    html: `
      <div style="${appContainerStyles}">
        <div style="${headerStyles}">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto; border-collapse:collapse;">
            <tr>
              <td style="vertical-align:middle; padding-right:14px;">
                <img src="cid:vfx-seal-logo" alt="VFX Seal" style="display:block; height:46px; width:auto; border:0;" />
              </td>
              <td style="vertical-align:middle;">
                <h1 style="margin:0; color:#F6E7C0; font-size:30px; line-height:1.1;">VFX <span style="color:#C79E68;">Seal</span></h1>
              </td>
            </tr>
          </table>
        </div>
        <div style="${bodyStyles}">
          <h2 style="margin-top:0; color:#0E121A;">Welcome to VFX Seal</h2>
          <p>Hi ${firstName || "there"},</p>
          <p>Your account has been approved successfully.</p>
          <p>You can now sign in and start exploring the platform.</p>
          <div style="text-align:center; margin: 28px 0;">
            <a href="${signInUrl}" style="${primaryButtonStyles}">Go to Sign In</a>
          </div>
          <p style="font-size:14px; color:#666;">We are glad to welcome you to the VFX Seal community.</p>
          <p style="font-size:12px; color:#7A7A7A; line-height:1.6; margin-top:22px; text-align:center;">If you experience any issue accessing your account, please contact the VFX Seal administration team.</p>
        </div>
        <div style="${footerStyles}">
          <p style="margin:0;">&copy; ${new Date().getFullYear()} VFX Seal</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: "seal.png",
        path: approvalLogoPath,
        cid: "vfx-seal-logo",
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `[Email] Approval email sent to ${normalizedEmail} (messageId: ${info.messageId})`,
    );
    return info;
  } catch (error) {
    console.error(
      `[Email] Approval email failed for ${normalizedEmail}:`,
      error,
    );
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendNewRegistrationNotificationEmail,
  sendApprovalEmail,
};
