/**
 * @file src/services/auth.ts
 * @description Dedicated authentication service managing the 'forgot password' logic.
 * Simulates an email alert to rphooko@tconnect.africa, generates a randomized secure
 * temporary password, and updates the specific user's record in the storage state so they
 * can use this temporary password to log in.
 */

import { storage } from './storage';
import { TeamMember } from '../types';

export const ADMIN_EMAIL = 'rphooko@tconnect.africa';
export const ADMIN_NAME = 'Raphooko Phooko';

export interface SimulatedEmailDispatch {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  body: string;
  htmlPreview: string;
  dispatchedAt: string;
  messageId: string;
  deliveryStatus: 'delivered' | 'pending' | 'failed';
}

export interface ForgotPasswordResponse {
  success: boolean;
  email: string;
  memberName: string;
  tempPassword: string;
  adminEmail: string;
  emailDispatched: boolean;
  simulatedEmail: SimulatedEmailDispatch;
  message: string;
}

/**
 * Generates a high-entropy, randomized secure string for temporary authentication.
 * Example format: "TC-8492-X9FA!"
 */
export function generateSecureTemporaryPassword(): string {
  const numericCode = Math.floor(1000 + Math.random() * 9000);
  const alphaCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  const symbols = ['!', '@', '#', '$', '%', '*'];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  return `TC-${numericCode}-${alphaCode}${symbol}`;
}

/**
 * Simulates dispatching an email security alert to Raphooko Phooko at rphooko@tconnect.africa.
 */
export async function simulateEmailAlert(
  userEmail: string,
  userName: string,
  tempPassword: string
): Promise<SimulatedEmailDispatch> {
  const timestamp = new Date().toISOString();
  const messageId = `msg_pwd_reset_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const subject = `[T-Connect Security] Password Reset Alert for ${userEmail}`;
  const plainTextBody = `
===================================================================
T-CONNECT HOTSPOT & MIKROTIK CONTROLLER - SECURITY ALERT DISPATCH
===================================================================

Attention: ${ADMIN_NAME} (${ADMIN_EMAIL})
Tenant:    T-Connect Primary Mesh Network · Maseru, Lesotho

A password reset request has been initiated for an authorized user:

Requester Name:           ${userName}
Requester Email:          ${userEmail}
Timestamp:                ${new Date().toLocaleString()} (UTC)
Issued Temporary Access:  ${tempPassword}

A secure single-use temporary credential was generated and linked to
the user's record in the controller state.

You may share this temporary password with the user, or they can authenticate
immediately using this credential. Upon first successful login, this temporary
password will be redeemed and fulfilled.

-------------------------------------------------------------------
T-Connect Security Sentinel · automated dispatch to ${ADMIN_EMAIL}
===================================================================
`.trim();

  const htmlPreview = `
<div style="font-family: monospace; background: #0c101c; color: #f1f5f9; padding: 16px; border-radius: 8px; border: 1px solid #232d42;">
  <h3 style="color: #f05e17; margin-top: 0;">T-Connect Password Reset Request</h3>
  <p><strong>To:</strong> ${ADMIN_NAME} (${ADMIN_EMAIL})</p>
  <p><strong>Requester:</strong> ${userName} (${userEmail})</p>
  <p><strong>Generated Temporary Password:</strong> <code style="color: #f05e17; font-weight: bold; background: #161d31; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
  <p style="font-size: 11px; color: #94a3b8;">This simulated dispatch was routed to the primary administrator.</p>
</div>
`.trim();

  // Simulate realistic async network dispatch delay (250ms)
  await new Promise((resolve) => setTimeout(resolve, 250));

  const dispatchRecord: SimulatedEmailDispatch = {
    to: ADMIN_EMAIL,
    from: 'security@tconnect.africa',
    replyTo: userEmail,
    subject,
    body: plainTextBody,
    htmlPreview,
    dispatchedAt: timestamp,
    messageId,
    deliveryStatus: 'delivered',
  };

  return dispatchRecord;
}

/**
 * Updates a user's record in the storage state with the newly generated temporary password.
 */
export function updateUserTemporaryPassword(emailOrId: string, tempPassword: string): boolean {
  const clean = emailOrId.trim().toLowerCase();
  const state = storage.getState();
  const member = state.team.find((m: TeamMember) => m.id === clean || m.email.toLowerCase() === clean);
  if (!member) return false;

  return storage.setMemberTemporaryPassword(member.id, tempPassword);
}

/**
 * Primary 'forgot password' function:
 * 1. Finds or provisions the user in storage state.
 * 2. Generates a secure random temporary password.
 * 3. Updates the user's record in the storage state.
 * 4. Simulates sending an email alert to rphooko@tconnect.africa.
 * 5. Returns a response containing the temp password and email delivery status.
 */
export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  const cleanEmail = email.trim().toLowerCase();
  const currentState = storage.getState();
  let member = currentState.team.find((m: TeamMember) => m.email.toLowerCase() === cleanEmail);

  // If member is not yet in roster, register them as Collaborator so they can authenticate
  if (!member) {
    const generatedName = cleanEmail
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
    member = storage.inviteTeamMember(generatedName, cleanEmail, 'Collaborator', []);
  }

  // Generate randomized secure temporary password
  const tempPassword = generateSecureTemporaryPassword();

  // Update the user's record in the storage state
  storage.setMemberTemporaryPassword(member.id, tempPassword);

  // Simulate email alert to rphooko@tconnect.africa
  const simulatedEmail = await simulateEmailAlert(cleanEmail, member.name, tempPassword);

  return {
    success: true,
    email: cleanEmail,
    memberName: member.name,
    tempPassword,
    adminEmail: ADMIN_EMAIL,
    emailDispatched: true,
    simulatedEmail,
    message: `Password reset request routed to Administrator Raphooko Phooko (${ADMIN_EMAIL}). A temporary password has been issued and linked to your account.`,
  };
}

/**
 * Class wrapper for object-oriented or DI usage.
 */
export class AuthService {
  generateRandomTemporaryPassword = generateSecureTemporaryPassword;
  simulateSendEmailToAdmin = simulateEmailAlert;
  handleForgotPassword = forgotPassword;
  forgotPassword = forgotPassword;
  updateUserTemporaryPassword = updateUserTemporaryPassword;

  handleForgotPasswordSync(email: string): ForgotPasswordResponse {
    const cleanEmail = email.trim().toLowerCase();
    const currentState = storage.getState();
    let member = currentState.team.find((m: TeamMember) => m.email.toLowerCase() === cleanEmail);

    if (!member) {
      const generatedName = cleanEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      member = storage.inviteTeamMember(generatedName, cleanEmail, 'Collaborator', []);
    }

    const tempPassword = generateSecureTemporaryPassword();
    storage.setMemberTemporaryPassword(member.id, tempPassword);

    const timestamp = new Date().toISOString();
    const simulatedEmail: SimulatedEmailDispatch = {
      to: ADMIN_EMAIL,
      from: 'security@tconnect.africa',
      replyTo: cleanEmail,
      subject: `[T-Connect Security] Password Reset Alert for ${cleanEmail}`,
      body: `Temporary password ${tempPassword} issued for ${member.name} (${cleanEmail}). Dispatched to ${ADMIN_EMAIL}.`,
      htmlPreview: `<div>Temporary password issued: <code>${tempPassword}</code></div>`,
      dispatchedAt: timestamp,
      messageId: `msg_${Date.now()}`,
      deliveryStatus: 'delivered',
    };

    return {
      success: true,
      email: cleanEmail,
      memberName: member.name,
      tempPassword,
      adminEmail: ADMIN_EMAIL,
      emailDispatched: true,
      simulatedEmail,
      message: `Password reset request routed to Administrator Raphooko Phooko (${ADMIN_EMAIL}). A temporary password has been issued.`,
    };
  }
}

/**
 * Simulates dispatching an onboarding email with instant authentication magic link to the invited teammate.
 */
export async function simulateInviteEmail(
  inviteeEmail: string,
  inviteeName: string,
  role: string,
  inviteUrl: string
): Promise<SimulatedEmailDispatch> {
  const timestamp = new Date().toISOString();
  const messageId = `msg_invite_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const subject = `You're invited to join T-Connect Controller as ${role}`;
  const plainTextBody = `
Hi ${inviteeName},

Administrator Raphooko Phooko (${ADMIN_EMAIL}) has invited you to join the T-Connect Cloud Controller team as ${role}.

Click the instant access link below to sign in immediately without needing to configure a password:
${inviteUrl}

This link is single-use and will automatically authenticate your session into the T-Connect mesh controller.

Welcome to T-Connect!
Maseru, Lesotho
`.trim();

  const htmlPreview = `
<div style="font-family: monospace; background: #0c101c; color: #f1f5f9; padding: 16px; border-radius: 8px; border: 1px solid #232d42;">
  <h3 style="color: #f05e17; margin-top: 0;">Welcome to T-Connect Controller</h3>
  <p><strong>Invited by:</strong> ${ADMIN_NAME} (${ADMIN_EMAIL})</p>
  <p><strong>Role:</strong> <span style="color: #10b981; font-weight: bold;">${role}</span></p>
  <p><a href="${inviteUrl}" style="background: #f05e17; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Instant Access &rarr;</a></p>
  <p style="font-size: 11px; color: #94a3b8;">Clicking will immediately authenticate your session with full role permissions.</p>
</div>
`.trim();

  await new Promise((resolve) => setTimeout(resolve, 200));

  return {
    to: inviteeEmail,
    from: `${ADMIN_NAME} <${ADMIN_EMAIL}>`,
    replyTo: ADMIN_EMAIL,
    subject,
    body: plainTextBody,
    htmlPreview,
    dispatchedAt: timestamp,
    messageId,
    deliveryStatus: 'delivered',
  };
}

export const authService = new AuthService();
export default authService;
