import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

interface SendReminderRequest {
  phone: string;
  appointmentId: string;
  messageType?: "confirmation" | "reminder_24h" | "reminder_1h" | "cancellation" | "reschedule";
  appointmentDetails?: {
    patientName?: string;
    doctorName?: string;
    date?: string;
    time?: string;
    department?: string;
  };
}

interface TwilioResponse {
  sid: string;
  status: string;
  [key: string]: any;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Twilio credentials from environment
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

console.log('[STARTUP] Twilio Config Check:');
console.log('[STARTUP] TWILIO_ACCOUNT_SID exists:', !!twilioAccountSid);
console.log('[STARTUP] TWILIO_AUTH_TOKEN exists:', !!twilioAuthToken);
console.log('[STARTUP] TWILIO_PHONE_NUMBER exists:', !!twilioPhoneNumber);
console.log('[STARTUP] TWILIO_PHONE_NUMBER value:', twilioPhoneNumber);

/**
 * Convert phone number to E.164 format (required by Twilio)
 * Handles local formats like 0777705668 → +256777705668
 */
function formatPhoneNumberE164(phone: string): string {
  // Remove any whitespace or special characters except digits and +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If already starts with +, return as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If starts with 0 (local format), replace with country code
  if (cleaned.startsWith('0')) {
    // Uganda country code is +256
    // Replace leading 0 with +256
    return '+256' + cleaned.substring(1);
  }
  
  // If just digits without country code, assume Uganda
  if (!/^\d+$/.test(cleaned)) {
    return '+256' + cleaned;
  }
  
  // Fallback: prepend +256 if no country code detected
  if (!cleaned.startsWith('+') && !cleaned.startsWith('256')) {
    return '+256' + cleaned;
  }
  
  return cleaned;
}

/**
 * Generate message content based on message type
 */
function generateMessageContent(
  messageType: string,
  appointmentDetails: any
): string {
  const { patientName, doctorName, date, time, department } = appointmentDetails;

  const messages: { [key: string]: string } = {
    confirmation: `Appointment Confirmed! Dr. ${doctorName} on ${date} at ${time} (${department}). Reply STOP to unsubscribe.`,
    reminder_24h: `Reminder: Your appointment with Dr. ${doctorName} is tomorrow at ${time}. See you soon!`,
    reminder_1h: `Reminder: Your appointment with Dr. ${doctorName} is in 1 hour at ${time}. Please arrive 10 minutes early.`,
    cancellation: `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been cancelled. Please contact the clinic for more information.`,
    reschedule: `Your appointment has been rescheduled to ${date} at ${time} with Dr. ${doctorName}. Please confirm by replying YES.`,
  };

  return messages[messageType] || messages["confirmation"];
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(
  toPhone: string,
  messageContent: string
): Promise<{ sid?: string; error?: string }> {
  console.log('[Twilio] Starting sendViaTwilio with phone:', toPhone);
  
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    const error = `Twilio credentials not configured: SID=${!!twilioAccountSid}, Token=${!!twilioAuthToken}, Phone=${!!twilioPhoneNumber}`;
    console.error('[Twilio] ' + error);
    return { error };
  }

  console.log('[Twilio] Using Twilio Account:', twilioAccountSid?.substring(0, 5) + '...');
  console.log('[Twilio] Using Twilio Phone:', twilioPhoneNumber);

  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

  console.log('[Twilio] URL:', url);

  try {
    const formData = new URLSearchParams();
    formData.append("From", twilioPhoneNumber);
    formData.append("To", toPhone);
    formData.append("Body", messageContent);

    console.log('[Twilio] Sending request to Twilio API');

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    console.log('[Twilio] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Twilio] Error response body:', errorText);
      return { error: `Twilio API error: ${response.status} - ${errorText}` };
    }

    const data = (await response.json()) as TwilioResponse;
    console.log('[Twilio] Success! Message SID:', data.sid);
    return { sid: data.sid };
  } catch (error) {
    console.error('[Twilio] Exception:', error);
    return { error: `Failed to send SMS: ${String(error)}` };
  }
}

/**
 * Log SMS attempt to database
 */
async function logSmsAttempt(
  appointmentId: string,
  patientId: string,
  phone: string,
  messageType: string,
  messageContent: string,
  twilioSid?: string,
  error?: string
) {
  try {
    const { error: dbError } = await supabase.from("appointment_sms_logs").insert({
      appointment_id: appointmentId,
      patient_id: patientId,
      phone_number: phone,
      message_type: messageType,
      message_content: messageContent,
      twilio_message_sid: twilioSid || null,
      status: error ? "failed" : "sent",
      error_message: error || null,
      sent_at: error ? null : new Date().toISOString(),
    });

    if (dbError) {
      console.error("Error logging SMS attempt:", dbError);
    }
  } catch (error) {
    console.error("Exception while logging SMS:", error);
  }
}

/**
 * Main handler function
 */
Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
        },
      });
    }

    console.log("[Main] Parsing request body...");
    const body: SendReminderRequest = await req.json();
    console.log("[Main] Request body parsed successfully:", { hasPhone: !!body.phone, hasAppointmentId: !!body.appointmentId });
    
    // Format phone number to E.164 format
    const formattedPhone = formatPhoneNumberE164(body.phone);
    console.log("[Main] Phone formatting:", { original: body.phone, formatted: formattedPhone });

    if (!formattedPhone || !body.appointmentId) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: phone, appointmentId",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
          },
        }
      );
    }

    const messageType = body.messageType || "confirmation";
    const messageContent = generateMessageContent(
      messageType,
      body.appointmentDetails || {}
    );

    console.log(`[Handler] Sending ${messageType} SMS to ${formattedPhone}`);
    console.log(`[Handler] Message content preview: ${messageContent.substring(0, 50)}...`);

    // Send SMS via Twilio
    console.log('[Handler] Calling sendViaTwilio...');
    const twilioResult = await sendViaTwilio(formattedPhone, messageContent);
    console.log('[Handler] Twilio result:', { hasSid: !!twilioResult.sid, hasError: !!twilioResult.error });

    // Get patient ID for logging
    let patientId = "";
    if (body.appointmentDetails) {
      // Try to get patient ID from appointment
      const { data: apt, error: aptError } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("id", body.appointmentId)
        .single();

      if (!aptError && apt) {
        patientId = apt.patient_id;
      }
    }

    // Log the attempt
    await logSmsAttempt(
      body.appointmentId,
      patientId,
      formattedPhone,
      messageType,
      messageContent,
      twilioResult.sid,
      twilioResult.error
    );

    if (twilioResult.error) {
      console.error("Twilio error:", twilioResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: twilioResult.error,
          message: "SMS sending failed but was logged",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "SMS sent successfully",
        messageSid: twilioResult.sid,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
        },
      }
    );
  } catch (error) {
    console.error("[Catch] Error in send-appointment-reminder function:", error);
    console.error("[Catch] Error type:", typeof error);
    console.error("[Catch] Error string:", String(error));
    if (error instanceof Error) {
      console.error("[Catch] Error message:", error.message);
      console.error("[Catch] Error stack:", error.stack);
    }
    
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : {
      message: String(error),
      type: typeof error,
    };
    
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorDetails,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
        },
      }
    );
  }
});
