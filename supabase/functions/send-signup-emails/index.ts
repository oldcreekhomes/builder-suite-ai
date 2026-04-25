import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SignupEmailRequest {
  email: string;
  password?: string;
  companyName: string;
  signupTime: string;
  userType?: 'home_builder' | 'marketplace_vendor';
}

const ADMIN_EMAIL = "mgray@oldcreekhomes.com";

function buildAdminNotificationHtml(signupTypeLabel: string, companyName: string, email: string, formattedTime: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>New ${signupTypeLabel} Signup - ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f5;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 30px; background-color: #000000; margin: 0;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.2;">🎉 New ${signupTypeLabel} Signup!</h1>
                            <p style="color: #cccccc; font-size: 16px; margin: 0; line-height: 1.4;">BuilderSuite ML</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; margin: 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                <tr>
                                    <td style="padding: 25px; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 16px 0;">
                                                    <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0;">
                                                        A new ${signupTypeLabel.toLowerCase()} has signed up for BuilderSuite ML:
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 12px 0;">
                                                    <p style="color: #666666; font-size: 12px; line-height: 1.4; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Company Name</p>
                                                    <p style="color: #000000; font-size: 16px; font-weight: 600; line-height: 1.4; margin: 0;">${companyName}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 12px 0;">
                                                    <p style="color: #666666; font-size: 12px; line-height: 1.4; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Email Address</p>
                                                    <p style="color: #000000; font-size: 16px; font-weight: 600; line-height: 1.4; margin: 0;">
                                                        <a href="mailto:${email}" style="color: #000000; text-decoration: underline;">${email}</a>
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="margin: 0; padding: 0;">
                                                    <p style="color: #666666; font-size: 12px; line-height: 1.4; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Signed Up</p>
                                                    <p style="color: #000000; font-size: 16px; font-weight: 600; line-height: 1.4; margin: 0;">${formattedTime}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                                You may want to follow up with them to help get them started.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 30px; background-color: #f8f8f8; margin: 0;">
                            <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.4;">
                                <a href="https://www.buildersuiteml.com" style="color: #666666; text-decoration: underline;" target="_blank">www.buildersuiteml.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function buildHomeBuilderVerificationHtml(companyName: string, verificationLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Verify Your Email - BuilderSuite ML</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f5;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 30px; background-color: #000000; margin: 0;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; line-height: 1.2;">Verify Your Email</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; margin: 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                <tr>
                                    <td style="padding: 25px; margin: 0;">
                                        <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                                            Please verify your email address by clicking the button below.
                                        </p>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                                            <tr>
                                                <td align="center" style="background-color: #000000;">
                                                    <a href="${verificationLink}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Verify Your Email</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 30px; background-color: #f8f8f8; margin: 0;">
                            <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.4;">
                                <a href="https://www.buildersuiteml.com" style="color: #666666; text-decoration: underline;" target="_blank">www.buildersuiteml.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function buildMarketplaceWelcomeHtml(companyName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Welcome to BuilderSuite Marketplace!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f5;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 30px; background-color: #000000; margin: 0;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.2;">Welcome to BuilderSuite Marketplace!</h1>
                            <p style="color: #cccccc; font-size: 16px; margin: 0; line-height: 1.4;">${companyName}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; margin: 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                <tr>
                                    <td style="padding: 25px; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 16px 0;">
                                                    <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0;">Thank you for signing up!</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 16px 0;">
                                                    <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0;">
                                                        Your company <strong>${companyName}</strong> is now listed in the BuilderSuite Marketplace. Home builders and general contractors can now find and contact you.
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 16px 0;">
                                                    <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0;">
                                                        Once you verify your email, you can log in to update your company profile, add specialties, service areas, and more.
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="margin: 0; padding: 0;">
                                                    <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0;">
                                                        In the meantime, please verify your email address by clicking the link in the confirmation email from Supabase.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                                We look forward to connecting you with builders!
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 30px; background-color: #f8f8f8; margin: 0;">
                            <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.4;">
                                <a href="https://www.buildersuiteml.com" style="color: #666666; text-decoration: underline;" target="_blank">www.buildersuiteml.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, companyName, signupTime, userType = 'home_builder' }: SignupEmailRequest = await req.json();

    const isMarketplaceVendor = userType === 'marketplace_vendor';
    const signupTypeLabel = isMarketplaceVendor ? 'Marketplace Vendor' : 'Home Builder';

    console.log("🚀 Processing signup for:", email, "Type:", signupTypeLabel);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Step 1: Create the user via Admin API (no default Supabase email sent)
    if (password) {
      console.log("👤 Creating user via Admin API:", email);

      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: false,
        user_metadata: {
          user_type: isMarketplaceVendor ? 'marketplace_vendor' : 'home_builder',
          company_name: companyName,
        },
      });

      if (createError) {
        console.error("❌ Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("✅ User created:", userData.user?.id);
    }

    const formattedTime = new Date(signupTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Step 2: Send admin notification email
    console.log("📧 Sending admin notification to:", ADMIN_EMAIL);
    const adminEmailResponse = await resend.emails.send({
      from: "BuilderSuite ML <noreply@transactional.buildersuiteml.com>",
      to: [ADMIN_EMAIL],
      subject: `New ${signupTypeLabel} Signup - ${companyName}`,
      html: buildAdminNotificationHtml(signupTypeLabel, companyName, email, formattedTime),
    });

    if (adminEmailResponse.error) {
      console.error("❌ Admin email failed:", adminEmailResponse.error);
    } else {
      console.log("✅ Admin notification sent:", adminEmailResponse.data?.id);
    }

    // Small delay to avoid Resend rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Send branded verification/welcome email to user
    console.log("📧 Sending branded email to:", email);

    let userEmailResponse;

    if (!isMarketplaceVendor) {
      // Home builder: generate verification link and send branded email
      console.log("🔑 Generating verification link for:", email);

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: email,
        options: {
          redirectTo: 'https://buildersuiteml.com/auth'
        }
      } as any);

      if (linkError) {
        console.error("❌ Error generating verification link:", linkError);
        // Fall back to welcome email without button
        userEmailResponse = await resend.emails.send({
          from: "BuilderSuite ML <noreply@transactional.buildersuiteml.com>",
          to: [email],
          subject: "Welcome to BuilderSuite ML!",
          html: buildMarketplaceWelcomeHtml(companyName),
        });
      } else {
        const verificationLink = linkData.properties?.action_link;
        console.log("🔗 Verification link generated successfully");

        userEmailResponse = await resend.emails.send({
          from: "BuilderSuite ML <noreply@transactional.buildersuiteml.com>",
          to: [email],
          subject: "Verify Your Email - BuilderSuite ML",
          html: buildHomeBuilderVerificationHtml(companyName, verificationLink),
        });
      }
    } else {
      // Marketplace vendor: send welcome email
      userEmailResponse = await resend.emails.send({
        from: "BuilderSuite ML <noreply@transactional.buildersuiteml.com>",
        to: [email],
        subject: "Welcome to BuilderSuite Marketplace!",
        html: buildMarketplaceWelcomeHtml(companyName),
      });
    }

    if (userEmailResponse.error) {
      console.error("❌ User email failed:", userEmailResponse.error);
    } else {
      console.log("✅ User email sent:", userEmailResponse.data?.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Signup completed and emails sent",
        adminEmailId: adminEmailResponse.data?.id,
        userEmailId: userEmailResponse.data?.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-signup-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
